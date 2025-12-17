import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SpeedrunWidget from "../components/SpeedrunWidget";
import type {
  SpeedrunWidgetRef,
  SegmentData,
} from "../components/SpeedrunWidget";
import WikipediaViewer from "../components/WikipediaViewer";
import VictoryModal from "../components/VictoryModal";
import { useMultiplayer, type Player, type CursorUpdate } from "../hooks/useMultiplayer";
import "../App.css";
import "./Game.css";

interface MultiplayerFinishData {
  playerId: string;
  playerName: string;
  time: number;
  clicks: number;
  path: string[];
}

// Module-level flags to prevent multiple Game instances from fighting
// (happens during page transitions with dual Routes blocks)
let globalConnectionAttempted = false;
let globalRejoinAttempted = false;

const Game = () => {
  const [searchParams] = useSearchParams();
  const [hudVisible, setHudVisible] = useState(false);
  const [articleLoaded, setArticleLoaded] = useState(false);
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [gameStats, setGameStats] = useState<{
    finalTime: string;
    segments: SegmentData[];
  } | null>(null);
  const [finishedPlayers, setFinishedPlayers] = useState<MultiplayerFinishData[]>([]);
  const [raceStartTime] = useState(() => Date.now());
  const [otherCursors, setOtherCursors] = useState<Map<string, CursorUpdate>>(new Map());
  const [currentArticle, setCurrentArticle] = useState("");
  
  const speedrunWidgetRef = useRef<SpeedrunWidgetRef>(null);
  const hasFinishedRef = useRef(false);
  const lastCursorSendRef = useRef(0);
  const navigate = useNavigate();
  
  const startArticle = searchParams.get("start") || "React_(JavaScript_library)";
  const endArticle = searchParams.get("end") || "End Article";
  const gameMode = searchParams.get("mode") || "solo";
  const lobbyCode = searchParams.get("lobby") || "";
  const playerName = searchParams.get("player") || "";
  const isMultiplayer = gameMode === "race" && lobbyCode;

  // Handle other player finishing
  const handlePlayerFinish = useCallback((data: MultiplayerFinishData) => {
    setFinishedPlayers(prev => {
      if (prev.some(p => p.playerId === data.playerId)) return prev;
      return [...prev, data];
    });
  }, []);

  // Handle cursor updates from other players
  const handleCursorUpdate = useCallback((data: CursorUpdate) => {
    setOtherCursors(prev => {
      const next = new Map(prev);
      next.set(data.playerId, data);
      return next;
    });
  }, []);

  // Initialize multiplayer if needed
  const {
    isConnected,
    players,
    connect,
    disconnect,
    rejoinRoom,
    sendNavigate,
    sendFinish,
    sendCursor,
  } = useMultiplayer({
    onPlayerFinish: handlePlayerFinish,
    onCursorUpdate: handleCursorUpdate,
  });
  
  // Connect to multiplayer - use global flag to prevent duplicate connections
  // during page transitions (two Game components mount simultaneously)
  useEffect(() => {
    if (!isMultiplayer || !lobbyCode || !playerName) {
      return;
    }
    
    // Prevent duplicate connection attempts across all Game instances
    if (globalConnectionAttempted) {
      console.log("Connection already attempted by another Game instance, skipping");
      return;
    }
    globalConnectionAttempted = true;
    
    console.log("Multiplayer game detected, connecting...");
    connect();
    
    // Don't disconnect on cleanup - keep connection alive during page transitions
    // The connection will be cleaned up when navigating away from the game
  }, [isMultiplayer, lobbyCode, playerName, connect]);

  // Rejoin the room after connecting to continue the race
  useEffect(() => {
    if (!isMultiplayer || !isConnected || !lobbyCode || !playerName) {
      return;
    }
    
    // Prevent duplicate rejoin attempts across all Game instances
    if (globalRejoinAttempted) {
      console.log("Rejoin already attempted by another Game instance, skipping");
      return;
    }
    globalRejoinAttempted = true;
    
    console.log("Rejoining room:", lobbyCode, "as", playerName);
    rejoinRoom(lobbyCode, playerName);
  }, [isMultiplayer, isConnected, lobbyCode, playerName, rejoinRoom]);

  // Always enable dark mode for Wikipedia content - run immediately and unconditionally
  useEffect(() => {
    // Add immediately on mount
    document.documentElement.classList.add("wiki-dark-mode");
    
    // Also ensure it's set (in case of re-renders)
    const checkDarkMode = setInterval(() => {
      if (!document.documentElement.classList.contains("wiki-dark-mode")) {
        document.documentElement.classList.add("wiki-dark-mode");
      }
    }, 100);
    
    return () => {
      clearInterval(checkDarkMode);
      document.documentElement.classList.remove("wiki-dark-mode");
    };
  }, []);

  // Show HUD immediately and track article loading
  useEffect(() => {
    setHudVisible(true);
    setArticleLoaded(false);
  }, [startArticle]);

  // Show victory modal when route is completed
  useEffect(() => {
    if (routeCompleted && speedrunWidgetRef.current && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      
      const finalTime = speedrunWidgetRef.current.getCurrentTime();
      const segments = speedrunWidgetRef.current.getSegments();

      // Send finish to server if multiplayer
      if (isMultiplayer) {
        const elapsedMs = Date.now() - raceStartTime;
        sendFinish(elapsedMs);
      }

      // Small delay before showing modal for dramatic effect
      const timer = setTimeout(() => {
        setGameStats({ finalTime, segments });
        setShowVictoryModal(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [routeCompleted, isMultiplayer, raceStartTime, sendFinish]);

  const handleArticleNavigate = (articleName: string) => {
    if (speedrunWidgetRef.current) {
      speedrunWidgetRef.current.addSegment(articleName);
    }
    
    // Update current article for cursor sharing
    setCurrentArticle(articleName);
    
    // Send navigation to server if multiplayer
    if (isMultiplayer) {
      sendNavigate(articleName);
    }
  };

  // Track mouse movement for cursor sharing (adaptive throttling)
  const lastPositionRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!isMultiplayer || !isConnected) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      
      // Calculate movement distance since last send
      const dx = x - lastPositionRef.current.x;
      const dy = y - lastPositionRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Adaptive throttling: faster updates when moving more
      // Fast movement (distance > 2%): 16ms (~60fps)
      // Medium movement (distance > 0.5%): 25ms (~40fps)
      // Slow movement: 50ms (~20fps)
      let minInterval = 50;
      if (distance > 2) {
        minInterval = 16;
      } else if (distance > 0.5) {
        minInterval = 25;
      }
      
      if (now - lastCursorSendRef.current < minInterval) return;
      
      lastCursorSendRef.current = now;
      lastPositionRef.current = { x, y };

      sendCursor(x, y, currentArticle || startArticle);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isMultiplayer, isConnected, currentArticle, startArticle, sendCursor]);

  // Clear cursors that are too old (5 seconds)
  useEffect(() => {
    if (!isMultiplayer) return;

    const interval = setInterval(() => {
      setOtherCursors(prev => {
        const now = Date.now();
        const next = new Map(prev);
        // Remove cursors from players on different articles
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMultiplayer]);

  const handlePlayAgain = () => {
    // Restart with same route
    window.location.reload();
  };

  const handleNewRoute = () => {
    // Clear race state when leaving the game
    sessionStorage.removeItem("wiki-race-started-at");
    sessionStorage.removeItem("wiki-race-player-name");
    
    // Reset global connection flags
    globalConnectionAttempted = false;
    globalRejoinAttempted = false;
    
    // Disconnect from WebSocket
    disconnect();
    
    // Go back to menu or lobby browser
    if (isMultiplayer) {
      navigate("/lobby-browser", { state: { direction: "back" } });
    } else {
      navigate("/", { state: { direction: "back" } });
    }
  };

  // Get other players' current articles for display (exclude self)
  const otherPlayersProgress = players
    .filter(p => !p.finished && p.name !== playerName)
    .map((p: Player) => ({
      name: p.name,
      article: p.currentArticle,
      clicks: p.clicks,
    }));

  // Get cursors on the same article
  const visibleCursors = Array.from(otherCursors.values()).filter(
    cursor => cursor.article === (currentArticle || startArticle)
  );

  return (
    <div className="game-page">
      <div className="game-article-container">
        <WikipediaViewer
          initialTitle={startArticle}
          hideControls={true}
          onArticleLoaded={() => setArticleLoaded(true)}
          onArticleNavigate={(articleName) => {
            handleArticleNavigate(articleName);
          }}
          endArticle={endArticle}
          onDestinationReached={() => setRouteCompleted(true)}
        />
        {/* Other players' cursors */}
        {isMultiplayer && visibleCursors.map(cursor => (
          <div
            key={cursor.playerId}
            className="other-player-cursor"
            style={{
              transform: `translate(calc(${cursor.x}vw - 2px), calc(${cursor.y}vh - 2px))`,
            }}
          >
            <div className="cursor-pointer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.65376 3.02458L21.8974 11.1159C22.8904 11.6121 22.8904 13.0298 21.8974 13.526L5.65376 21.6173C4.5889 22.1499 3.38937 21.2106 3.64892 20.0503L5.32608 12.3211L3.64892 4.59164C3.38937 3.43129 4.5889 2.492 5.65376 3.02458Z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <span className="cursor-name">{cursor.playerName}</span>
          </div>
        ))}
      </div>
      <div className={`game-hud ${hudVisible ? "visible" : ""}`}>
        {/* Multiplayer progress indicator */}
        {isMultiplayer && otherPlayersProgress.length > 0 && (
          <div className="multiplayer-progress">
            <div className="multiplayer-progress-header">
              Other Players ({otherPlayersProgress.length})
            </div>
            {otherPlayersProgress.slice(0, 4).map((p, i) => (
              <div key={i} className="multiplayer-player-progress">
                <span className="mp-player-name">{p.name}</span>
                <span className="mp-player-article">{p.article}</span>
                <span className="mp-player-clicks">{p.clicks} clicks</span>
              </div>
            ))}
          </div>
        )}
        {/* Finished players indicator */}
        {isMultiplayer && finishedPlayers.length > 0 && (
          <div className="multiplayer-finished">
            <div className="multiplayer-finished-header">Finished</div>
            {finishedPlayers.map((p, i) => (
              <div key={p.playerId} className="multiplayer-finish-row">
                <span className="mp-finish-rank">#{i + 1}</span>
                <span className="mp-finish-name">{p.playerName}</span>
                <span className="mp-finish-time">{(p.time / 1000).toFixed(2)}s</span>
              </div>
            ))}
          </div>
        )}
        <SpeedrunWidget
          ref={speedrunWidgetRef}
          gameMode={isMultiplayer ? "Race" : "Single Player"}
          endArticle={endArticle}
          isRunning={articleLoaded && hudVisible}
          isStopped={routeCompleted}
        />
      </div>
      {showVictoryModal && gameStats && (
        <VictoryModal
          finalTime={gameStats.finalTime}
          segments={gameStats.segments}
          startArticle={startArticle}
          endArticle={endArticle}
          onPlayAgain={handlePlayAgain}
          onNewRoute={handleNewRoute}
        />
      )}
    </div>
  );
};

export default Game;
