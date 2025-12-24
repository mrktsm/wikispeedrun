import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoShuffle, IoCopy, IoCheckmark } from "react-icons/io5";
import {
  useMultiplayer,
  type Player as MultiplayerPlayer,
} from "../hooks/useMultiplayer";
import "./RaceLobby.css";

interface ChatMessage {
  id: string;
  type: "system" | "chat";
  playerName?: string;
  text: string;
  timestamp: Date;
}

// Generate random player name - cached in sessionStorage to survive page transitions
function getOrCreatePlayerName(): string {
  const stored = sessionStorage.getItem("wiki-race-player-name");
  if (stored) return stored;

  const adjectives = ["Swift", "Quick", "Clever", "Wiki", "Speed", "Link"];
  const nouns = ["Runner", "Racer", "Master", "Hunter", "Crawler", "Finder"];
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${
    nouns[Math.floor(Math.random() * nouns.length)]
  }${Math.floor(Math.random() * 100)}`;

  sessionStorage.setItem("wiki-race-player-name", name);
  return name;
}

const RaceLobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get lobby code from URL or use default test lobby
  const [lobbyCode] = useState(() => searchParams.get("code") || "TEST01");
  const [playerName] = useState(() => getOrCreatePlayerName());

  const [startArticle, setStartArticle] = useState("Cat");
  const [endArticle, setEndArticle] = useState("Dog");
  const [gameMode, setGameMode] = useState("first_to_finish");
  const [visibility, setVisibility] = useState("public");
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [hasJoined, setHasJoined] = useState(false);

  // Add system message to activity feed - defined first so it can be used in hooks
  const addSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "system",
        text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Handle race started - navigate to game
  const handleRaceStarted = useCallback(
    (data: { startArticle: string; endArticle: string }) => {
      // Mark when race started to prevent re-joining during page transition
      sessionStorage.setItem("wiki-race-started-at", Date.now().toString());
      navigate(
        `/game?start=${encodeURIComponent(
          data.startArticle
        )}&end=${encodeURIComponent(
          data.endArticle
        )}&mode=race&lobby=${lobbyCode}&player=${encodeURIComponent(
          playerName
        )}`
      );
    },
    [navigate, lobbyCode, playerName]
  );

  // Initialize multiplayer hook
  const {
    isConnected,
    players: multiplayerPlayers,
    roomState,
    error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    startRace,
  } = useMultiplayer({
    onRaceStarted: handleRaceStarted,
    onError: (err) => {
      addSystemMessage(`Error: ${err}`);
    },
  });

  // Connect to WebSocket on mount
  useEffect(() => {
    // Small delay to let component stabilize after HMR
    const timer = setTimeout(() => {
      connect();
      addSystemMessage("Connecting to server...");
    }, 200);

    return () => {
      clearTimeout(timer);
      // leaveRoom and disconnect are handled internally by the hook
      disconnect();
    };
  }, [connect, disconnect, addSystemMessage]);

  // Join room when connected - with small delay to ensure connection is stable
  useEffect(() => {
    // Skip joining if we're already in a race (prevents re-join during page transition)
    // Only skip if the race started recently (within 10 seconds)
    const raceStartedAt = sessionStorage.getItem("wiki-race-started-at");
    if (raceStartedAt) {
      const elapsed = Date.now() - parseInt(raceStartedAt, 10);
      if (elapsed < 10000) {
        // Race just started, we're in a page transition
        return;
      }
      // Stale flag, clear it
      sessionStorage.removeItem("wiki-race-started-at");
    }

    if (isConnected && !hasJoined) {
      const timer = setTimeout(() => {
        addSystemMessage("Connected! Joining lobby...");
        joinRoom(lobbyCode, playerName, startArticle, endArticle);
        setHasJoined(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    isConnected,
    hasJoined,
    lobbyCode,
    playerName,
    startArticle,
    endArticle,
    joinRoom,
    addSystemMessage,
  ]);

  // Update messages when room state changes
  useEffect(() => {
    if (roomState) {
      addSystemMessage(`Joined lobby: ${lobbyCode}`);
    }
  }, [roomState?.id]);

  // Track player joins/leaves
  useEffect(() => {
    if (multiplayerPlayers.length > 0) {
      const lastPlayer = multiplayerPlayers[multiplayerPlayers.length - 1];
      if (lastPlayer && messages.length > 0) {
        // Only add if this isn't our initial join
        const alreadyAnnounced = messages.some(
          (m) => m.text.includes(lastPlayer.name) && m.text.includes("joined")
        );
        if (!alreadyAnnounced && multiplayerPlayers.length > 1) {
          addSystemMessage(`${lastPlayer.name} joined the lobby.`);
        }
      }
    }
  }, [multiplayerPlayers.length]);

  // Convert multiplayer players to display format
  // If no players from server, show self as fallback
  const serverPlayers = multiplayerPlayers.map(
    (p: MultiplayerPlayer, index: number) => ({
      id: p.id,
      name: p.name,
      isHost: index === 0, // First player is host
      isReady: true,
      country: "US", // Default for now
      rating: 1500 + Math.floor(Math.random() * 500), // Mock rating
      gamesPlayed: Math.floor(Math.random() * 50),
      bestTime: "-",
    })
  );

  // Fallback: show yourself if not connected to server
  const displayPlayers =
    serverPlayers.length > 0
      ? serverPlayers
      : [
          {
            id: "self",
            name: playerName,
            isHost: true,
            isReady: true,
            country: "US",
            rating: 1650,
            gamesPlayed: 0,
            bestTime: "-",
          },
        ];

  // Am I the host? (first player in the list)
  const isHost =
    displayPlayers.length > 0 && displayPlayers[0]?.name === playerName;

  const maxPlayers = 8;
  const emptySlots = maxPlayers - displayPlayers.length;

  const getCountryFlagUrl = (countryCode: string) => {
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  // Copy lobby code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Random article
  const handleRandomRoute = async () => {
    try {
      const response = await fetch(
        "https://en.wikipedia.org/api/rest_v1/page/random/summary"
      );
      const data = await response.json();
      setStartArticle(data.title);

      const response2 = await fetch(
        "https://en.wikipedia.org/api/rest_v1/page/random/summary"
      );
      const data2 = await response2.json();
      setEndArticle(data2.title);
    } catch (error) {
      console.error("Failed to fetch random articles:", error);
    }
  };

  // Send chat message
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    // Will send via WebSocket later
    setChatInput("");
  };

  // Start the race (anyone can start for testing)
  const handleStartRace = () => {
    addSystemMessage("Starting race...");
    startRace();
    // Also navigate locally in case server doesn't respond
    setTimeout(() => {
      navigate(
        `/game?start=${encodeURIComponent(
          startArticle
        )}&end=${encodeURIComponent(endArticle)}&mode=race&lobby=${lobbyCode}`
      );
    }, 500);
  };

  // Leave lobby
  const handleLeave = () => {
    leaveRoom();
    navigate("/lobby-browser");
  };

  return (
    <div className="race-lobby-page">
      {/* Navigation Bar - EXACT same layout/styles as main menu */}
      <nav className="leaderboard-nav">
        <div className="leaderboard-nav-container">
          <div className="leaderboard-nav-content">
            {/* Left - primary nav buttons (same as main menu) */}
            <div className="leaderboard-nav-left">
              <div className="leaderboard-nav-links">
                <button
                  className="leaderboard-nav-button"
                  onClick={handleLeave}
                >
                  PLAY
                </button>
                <button className="leaderboard-nav-button active">
                  LEADERBOARD
                </button>
                <button className="leaderboard-nav-button gray">LEARN</button>
                <button className="leaderboard-nav-button gray">
                  COMMUNITY
                </button>
                <button className="leaderboard-nav-button gray">TOOLS</button>
              </div>
            </div>

            {/* Right - search/settings/sign-in, same as main menu */}
            <div className="leaderboard-nav-links">
              <button className="leaderboard-nav-button gray">
                {/* search icon slot (optional later) */}
              </button>
              <button className="leaderboard-nav-button gray">
                {/* settings icon slot (optional later) */}
              </button>
              <button className="leaderboard-nav-button blue">Sign in</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to mirror the secondary tab bar height from main menu */}
      <div className="race-lobby-nav-spacer" />

      {/* Main Content */}
      <main className="race-lobby-main">
        <div className="race-lobby-grid">
          {/* Left Sidebar */}
          <div className="race-lobby-sidebar">
            {/* Profile Card */}
            <div className="race-lobby-card">
              <div className="race-lobby-card-body">
                <div className="profile-row">
                  <div className="profile-avatar-placeholder"></div>
                  <div className="profile-info">
                    <div className="profile-name">{playerName}</div>
                    <div className="profile-stats">
                      <div className="profile-stat">
                        <span className="profile-stat-label">Games</span>
                        <span className="profile-stat-value">0</span>
                      </div>
                      <div className="profile-stat">
                        <span className="profile-stat-label">Best</span>
                        <span className="profile-stat-value">-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Settings */}
            <div className="race-lobby-card">
              <div className="race-lobby-card-header">Game Settings</div>
              <div className="race-lobby-card-body settings-body">
                {/* Route */}
                <div className="setting-group">
                  <label className="setting-label">Route</label>
                  <div className="route-display">
                    <input
                      type="text"
                      className="route-input"
                      value={startArticle}
                      onChange={(e) => setStartArticle(e.target.value)}
                      disabled={!isHost}
                    />
                    <span className="route-arrow">to</span>
                    <input
                      type="text"
                      className="route-input"
                      value={endArticle}
                      onChange={(e) => setEndArticle(e.target.value)}
                      disabled={!isHost}
                    />
                    {isHost && (
                      <button
                        className="route-random-btn"
                        onClick={handleRandomRoute}
                      >
                        <IoShuffle />
                      </button>
                    )}
                  </div>
                </div>

                {/* Mode */}
                <div className="setting-group">
                  <label className="setting-label">Mode</label>
                  <select
                    className="setting-select"
                    value={gameMode}
                    onChange={(e) => setGameMode(e.target.value)}
                    disabled={!isHost}
                  >
                    <option value="first_to_finish">First to Finish</option>
                    <option value="best_of_3">Best of 3</option>
                    <option value="fewest_clicks">Fewest Clicks</option>
                  </select>
                </div>

                {/* Visibility */}
                <div className="setting-group">
                  <label className="setting-label">Visibility</label>
                  <select
                    className="setting-select"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={!isHost}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="friends">Friends Only</option>
                  </select>
                </div>
              </div>
              {/* Lobby Code */}
              <div className="lobby-code-section">
                <div className="lobby-code-left">
                  <span className="lobby-code-label">Lobby Code</span>
                  <span className="lobby-code">{lobbyCode}</span>
                </div>
                <button className="lobby-code-copy" onClick={handleCopyCode}>
                  {copied ? <IoCheckmark /> : <IoCopy />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="race-lobby-right">
            {/* Players Table */}
            <div className="race-lobby-card players-card">
              <div className="players-table-wrapper">
                <table className="players-table">
                  <thead>
                    <tr>
                      <th>
                        <div className="leaderboard-player-head">
                          <span className="leaderboard-rank-header">#</span>
                          <span className="leaderboard-player-label">
                            Player
                          </span>
                        </div>
                      </th>
                      <th className="text-right">Rating</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPlayers.map((player, index) => (
                      <tr key={player.id}>
                        <td>
                          <div className="leaderboard-player">
                            <span className="leaderboard-rank-slot">
                              <span className="leaderboard-rank-number">
                                {index + 1}
                              </span>
                            </span>
                            <img
                              src={getCountryFlagUrl(player.country)}
                              alt={player.country}
                              className="leaderboard-flag"
                            />
                            <span className="leaderboard-username">
                              {player.name}
                              {player.name === playerName && " (You)"}
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="leaderboard-rating">
                            {player.rating}
                          </span>
                        </td>
                        <td className="text-right">
                          {player.isHost && (
                            <span className="player-status-badge host-badge">
                              Host
                            </span>
                          )}
                          {player.isReady && !player.isHost && (
                            <span className="player-status-badge ready-badge">
                              Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {Array.from({ length: emptySlots }).map((_, i) => (
                      <tr key={`empty-${i}`} className="empty-slot">
                        <td>
                          <div className="leaderboard-player">
                            <span className="leaderboard-rank-slot">
                              <span className="leaderboard-rank-number">
                                {displayPlayers.length + i + 1}
                              </span>
                            </span>
                            <div className="leaderboard-flag-placeholder" />
                            <span className="leaderboard-username empty-username">
                              Open slot
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="leaderboard-rating empty-rating">
                            —
                          </span>
                        </td>
                        <td className="text-right">
                          <span className="player-status-waiting">
                            Waiting...
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="players-table-footer">
              Players ({displayPlayers.length}/{maxPlayers})
            </div>

            {/* Chat / Activity */}
            <div className="race-lobby-card chat-card">
              <div className="race-lobby-card-header">Activity</div>
              <div className="race-lobby-card-body">
                <div className="chat-messages">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.type}`}>
                      {msg.type === "chat" && (
                        <span className="chat-player">{msg.playerName}: </span>
                      )}
                      <span className="chat-text">{msg.text}</span>
                    </div>
                  ))}
                  {error && (
                    <div
                      className="chat-message system"
                      style={{ color: "#a44" }}
                    >
                      <span className="chat-text">Error: {error}</span>
                    </div>
                  )}
                </div>
                <div className="chat-input-row">
                  <span className="chat-say">Say:</span>
                  <input
                    type="text"
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder="Type a message..."
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="race-lobby-actions">
              <button className="race-action-btn invite-btn">
                Invite Friends
              </button>
              <button
                className="race-action-btn start-btn"
                onClick={handleStartRace}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RaceLobby;
