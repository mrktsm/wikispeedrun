import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaMousePointer, FaICursor, FaHandPointer } from "react-icons/fa";
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

// Module-level cached icon HTML (persists across re-renders)
let cachedPointerIconHTML: string | null = null;
let cachedTextIconHTML: string | null = null;
let cachedHandIconHTML: string | null = null;

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
  const [currentArticle, setCurrentArticle] = useState("");
  
  // Use ref for cursor data to avoid React re-renders on every cursor update
  const cursorDataRef = useRef<Map<string, CursorUpdate>>(new Map());
  const cursorContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Cache icon HTML to avoid re-rendering
  const pointerIconCacheRef = useRef<HTMLDivElement>(null);
  const textIconCacheRef = useRef<HTMLDivElement>(null);
  const handIconCacheRef = useRef<HTMLDivElement>(null);

  // Cache icon HTML on mount
  useEffect(() => {
    const cacheIcons = () => {
      if (pointerIconCacheRef.current && !cachedPointerIconHTML) {
        const iconElement = pointerIconCacheRef.current.querySelector('svg');
        if (iconElement) {
          cachedPointerIconHTML = iconElement.outerHTML;
        }
      }
      if (textIconCacheRef.current && !cachedTextIconHTML) {
        const iconElement = textIconCacheRef.current.querySelector('svg');
        if (iconElement) {
          cachedTextIconHTML = iconElement.outerHTML;
        }
      }
      if (handIconCacheRef.current && !cachedHandIconHTML) {
        const iconElement = handIconCacheRef.current.querySelector('svg');
        if (iconElement) {
          cachedHandIconHTML = iconElement.outerHTML;
        }
      }
      
      if ((!cachedPointerIconHTML && pointerIconCacheRef.current) ||
          (!cachedTextIconHTML && textIconCacheRef.current) ||
          (!cachedHandIconHTML && handIconCacheRef.current)) {
        setTimeout(cacheIcons, 50);
      }
    };
    setTimeout(cacheIcons, 100);
  }, []);

  // Handle cursor updates from other players - direct DOM manipulation (no re-render)
  const handleCursorUpdate = useCallback((data: CursorUpdate) => {
    cursorDataRef.current.set(data.playerId, data);
    
    // Direct DOM update - bypasses React for performance
    const container = cursorContainerRef.current;
    if (!container) return;
    
    let cursorEl = container.querySelector(`[data-player-id="${data.playerId}"]`) as HTMLElement;
    
    // Create cursor element if it doesn't exist
    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.className = 'other-player-cursor';
      cursorEl.setAttribute('data-player-id', data.playerId);
      
      // Use default pointer icon initially
      const iconHTML = cachedPointerIconHTML || '';
      cursorEl.innerHTML = `
        <div class="cursor-pointer">
          ${iconHTML}
        </div>
        <span class="cursor-name">${data.playerName}</span>
      `;
      container.appendChild(cursorEl);
    }
    
    // Update position
    cursorEl.style.transform = `translate(calc(${data.x}vw - 2px), calc(${data.y}vh - 2px))`;
    cursorEl.setAttribute('data-article', data.article);
    
    // Detect cursor type locally and update icon
    const xPx = (data.x / 100) * window.innerWidth;
    const yPx = (data.y / 100) * window.innerHeight;
    const element = document.elementFromPoint(xPx, yPx);
    
    let cursorType = 'pointer'; // Default to pointer
    if (element) {
      const target = element as HTMLElement;
      const computedStyle = window.getComputedStyle(target);
      const cursor = computedStyle.cursor;
      
      // Links should show hand
      if (target.tagName === 'A' || target.closest('a')) {
        cursorType = 'hand';
      } 
      // Images should show hand
      else if (target.tagName === 'IMG' || target.closest('img')) {
        cursorType = 'hand';
      } 
      // Text inputs should show text cursor
      else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        cursorType = 'text';
      }
      // Check computed cursor style - browser already does precise hit-testing!
      else if (cursor === 'text') {
        cursorType = 'text';
      }
      // Check for pointer types
      else if (cursor === 'pointer' || cursor === 'grab' || cursor === 'grabbing') {
        cursorType = 'pointer';
      }
      // If cursor is 'auto' or 'default', check if we're over text by walking up the tree
      else if (cursor === 'auto' || cursor === 'default') {
        // Walk up the DOM tree to find an element with text cursor
        let currentEl: HTMLElement | null = target;
        while (currentEl) {
          const style = window.getComputedStyle(currentEl);
          if (style.cursor === 'text') {
            cursorType = 'text';
            break;
          }
          // Stop at wiki-content boundary
          if (currentEl.classList.contains('wiki-content')) {
            break;
          }
          currentEl = currentEl.parentElement;
        }
      }
    }
    
    // Update icon based on cursor type - always update to ensure it's correct
    const previousCursorType = cursorEl.getAttribute('data-cursor-type');
    
    // Always update if type changed, or if we don't have an icon yet
    if (previousCursorType !== cursorType || !cursorEl.querySelector('.cursor-pointer')?.innerHTML.trim()) {
      let iconHTML: string | null = null;
      if (cursorType === 'text' && cachedTextIconHTML) {
        iconHTML = cachedTextIconHTML;
      } else if (cursorType === 'hand' && cachedHandIconHTML) {
        iconHTML = cachedHandIconHTML;
      } else if (cachedPointerIconHTML) {
        iconHTML = cachedPointerIconHTML;
      }
      
      if (iconHTML) {
        const cursorPointerDiv = cursorEl.querySelector('.cursor-pointer');
        if (cursorPointerDiv) {
          cursorPointerDiv.innerHTML = iconHTML;
        }
      }
      
      cursorEl.setAttribute('data-cursor-type', cursorType);
    }
    
    // Apply cursor type styling via classes
    cursorEl.classList.remove('cursor-pointer-type', 'cursor-text-type', 'cursor-hand-type');
    if (cursorType === 'pointer') {
      cursorEl.classList.add('cursor-pointer-type');
    } else if (cursorType === 'text') {
      cursorEl.classList.add('cursor-text-type');
    } else if (cursorType === 'hand') {
      cursorEl.classList.add('cursor-hand-type');
    }
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

      // Detect cursor type from element under mouse
      const target = e.target as HTMLElement;
      let cursorType: string | undefined;
      
      if (target.tagName === 'A' || target.closest('a')) {
        cursorType = 'pointer'; // Pointer cursor for links
      } else if (target.tagName === 'IMG' || target.closest('img')) {
        cursorType = 'hand'; // Hand cursor for images
      } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        cursorType = 'text'; // Text cursor for inputs
      } else {
        const computedStyle = window.getComputedStyle(target);
        const cursor = computedStyle.cursor;
        
        // Check computed cursor style - browser already does precise hit-testing!
        if (cursor === 'text') {
          cursorType = 'text';
        } else if (cursor === 'pointer' || cursor === 'grab' || cursor === 'grabbing') {
          cursorType = 'pointer';
        } else if (cursor === 'auto' || cursor === 'default') {
          // Walk up the DOM tree to find an element with text cursor
          let currentEl: HTMLElement | null = target;
          while (currentEl) {
            const style = window.getComputedStyle(currentEl);
            if (style.cursor === 'text') {
              cursorType = 'text';
              break;
            }
            // Stop at wiki-content boundary
            if (currentEl.classList.contains('wiki-content')) {
              break;
            }
            currentEl = currentEl.parentElement;
          }
        }
      }

      sendCursor(x, y, currentArticle || startArticle, cursorType);
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

  return (
    <div className="game-page">
      {/* Hidden icon cache for extracting HTML */}
      <div ref={pointerIconCacheRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <FaMousePointer />
      </div>
      <div ref={textIconCacheRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <FaICursor />
      </div>
      <div ref={handIconCacheRef} style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
        <FaHandPointer />
      </div>
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
        {/* Other players' cursors - rendered via direct DOM manipulation for performance */}
        {isMultiplayer && <div ref={cursorContainerRef} className="cursor-container" />}
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
