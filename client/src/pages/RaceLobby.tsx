import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoShuffle, IoCopy, IoCheckmark, IoSwapHorizontal } from "react-icons/io5";
import { useQueryClient } from "@tanstack/react-query";
import { getArticleData } from "../components/WikipediaViewer";
import {
  useMultiplayer,
  type Player as MultiplayerPlayer,
} from "../hooks/useMultiplayer";
import { useAuth } from "../contexts/AuthContext";
import ProfilePopover from "../components/ProfilePopover";
import Navbar from "../components/Navbar";
import "./RaceLobby.css";

interface ChatMessage {
  id: string;
  type: "system" | "chat";
  playerName?: string;
  text: string;
  timestamp: Date;
}

// Wikipedia API helper for autocomplete
const searchWikipediaArticles = async (
  query: string,
  language: string = "en"
): Promise<string[]> => {
  if (!query.trim()) return [];
  try {
    const response = await fetch(
      `https://${language}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: "opensearch",
        search: query,
        limit: "8",
        namespace: "0",
        format: "json",
        origin: "*",
      })
    );
    const data = await response.json();
    return data[1] || [];
  } catch (error) {
    console.error("Wikipedia search error:", error);
    return [];
  }
};

// Generate a guest player name using a partial UUID for uniqueness
function getOrCreateGuestName(): string {
  const stored = sessionStorage.getItem("wiki-race-player-name");
  if (stored) return stored;

  // Generate a "Guest" + 6 character UUID suffix (e.g., "Guest1a2b3c")
  const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 6);
  const name = `Guest${uuid}`;

  sessionStorage.setItem("wiki-race-player-name", name);
  return name;
}

const RaceLobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get lobby code from URL or use default test lobby
  const [lobbyCode] = useState(() => searchParams.get("code") || "TEST01");

  // Determine player name: use logged-in user's nickname, or generate a guest name
  const [playerName] = useState(() => {
    // If user is logged in and has a nickname, use it
    if (user?.user_metadata?.nickname) {
      return user.user_metadata.nickname as string;
    }
    // Otherwise, generate or retrieve a guest name
    return getOrCreateGuestName();
  });

  const [startArticle, setStartArticle] = useState("Cat");
  const [endArticle, setEndArticle] = useState("Dog");
  const [gameMode, setGameMode] = useState("first_to_finish");
  const [visibility, setVisibility] = useState("public");
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Autocomplete state
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingEnd, setIsLoadingEnd] = useState(false);
  const [isRandomizingStart, setIsRandomizingStart] = useState(false);
  const [isRandomizingEnd, setIsRandomizingEnd] = useState(false);

  // Refs for autocomplete
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const endDropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<{ start?: ReturnType<typeof setTimeout>; end?: ReturnType<typeof setTimeout> }>({});

  // Debounced search for start article
  const searchStart = useCallback((query: string) => {
    if (debounceRef.current.start) clearTimeout(debounceRef.current.start);
    if (!query.trim()) {
      setStartSuggestions([]);
      setShowStartSuggestions(false);
      return;
    }
    setIsLoadingStart(true);
    debounceRef.current.start = setTimeout(async () => {
      const results = await searchWikipediaArticles(query);
      setStartSuggestions(results);
      setShowStartSuggestions(results.length > 0);
      setIsLoadingStart(false);
    }, 300);
  }, []);

  // Debounced search for end article
  const searchEnd = useCallback((query: string) => {
    if (debounceRef.current.end) clearTimeout(debounceRef.current.end);
    if (!query.trim()) {
      setEndSuggestions([]);
      setShowEndSuggestions(false);
      return;
    }
    setIsLoadingEnd(true);
    debounceRef.current.end = setTimeout(async () => {
      const results = await searchWikipediaArticles(query);
      setEndSuggestions(results);
      setShowEndSuggestions(results.length > 0);
      setIsLoadingEnd(false);
    }, 300);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        startDropdownRef.current &&
        !startDropdownRef.current.contains(e.target as Node) &&
        startInputRef.current &&
        !startInputRef.current.contains(e.target as Node)
      ) {
        setShowStartSuggestions(false);
      }
      if (
        endDropdownRef.current &&
        !endDropdownRef.current.contains(e.target as Node) &&
        endInputRef.current &&
        !endInputRef.current.contains(e.target as Node)
      ) {
        setShowEndSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      // Prefetch start article immediately when race starts
      // This helps it load faster on the Game page
      queryClient.prefetchQuery({
        queryKey: ["article", data.startArticle, "en"],
        queryFn: () => getArticleData("en", data.startArticle),
        staleTime: 5 * 60 * 1000,
      });

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
    [navigate, lobbyCode, playerName, queryClient]
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
    updateRoom,
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
  // Sync room state from server to local state
  useEffect(() => {
    if (roomState) {
      setStartArticle(roomState.startArticle);
      setEndArticle(roomState.endArticle);
    }
  }, [roomState]);
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
    (p: MultiplayerPlayer) => ({
      id: p.id,
      name: p.name,
      isHost: roomState?.hostId === p.id, // Check if this player is the host
      isReady: true,
      country: "US", // Default for other players (will be from server eventually)
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
          country: (user?.user_metadata?.country as string) || "US",
          gamesPlayed: 0,
          bestTime: "-",
        },
      ];

  // Am I the host? Check against the server's hostId
  // Use player ID from the room state if available, otherwise check if we're the only player
  const myPlayerId = multiplayerPlayers.find(p => p.name === playerName)?.id;
  const isHost = roomState?.hostId ? roomState.hostId === myPlayerId : displayPlayers.length > 0 && displayPlayers[0]?.name === playerName;

  // Debounced update of room settings when articles change (only if host)
  useEffect(() => {
    if (!isConnected || !isHost) return;

    const timeoutId = setTimeout(() => {
      updateRoom(startArticle, endArticle);
    }, 500); // Debounce to avoid spamming the server

    return () => clearTimeout(timeoutId);
  }, [startArticle, endArticle, isConnected, isHost, updateRoom]);

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

  // Helper to fetch a random article
  const fetchRandomArticle = async () => {
    try {
      const response = await fetch(
        "https://en.wikipedia.org/api/rest_v1/page/random/summary"
      );
      const data = await response.json();
      return data.title;
    } catch (error) {
      console.error("Failed to fetch random article:", error);
      return "Random Article";
    }
  };

  const handleRandomStart = async () => {
    if (!isHost) return;
    setIsRandomizingStart(true);
    const title = await fetchRandomArticle();
    setStartArticle(title);
    setIsRandomizingStart(false);
  };

  const handleRandomEnd = async () => {
    if (!isHost) return;
    setIsRandomizingEnd(true);
    const title = await fetchRandomArticle();
    setEndArticle(title);
    setIsRandomizingEnd(false);
  };

  const handleSwapArticles = () => {
    if (!isHost) return;
    setStartArticle(endArticle);
    setEndArticle(startArticle);
  };

  // Send chat message
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    // Will send via WebSocket later
    setChatInput("");
  };

  // Start the race with countdown
  const handleStartRace = () => {
    if (countdown !== null) return; // Already counting down

    addSystemMessage("Starting countdown...");
    setCountdown(3);

    // Start prefetching the article NOW while countdown runs
    // This gives us 3 seconds to load the content before the game starts
    queryClient.prefetchQuery({
      queryKey: ["article", startArticle, "en"],
      queryFn: () => getArticleData("en", startArticle),
      staleTime: 5 * 60 * 1000,
    });

    // Also prefetch end article just in case
    queryClient.prefetchQuery({
      queryKey: ["article", endArticle, "en"],
      queryFn: () => getArticleData("en", endArticle),
      staleTime: 5 * 60 * 1000,
    });

    // Countdown: 3 -> 2 -> 1 -> start
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        // Time to start
        clearInterval(countdownInterval);
        setCountdown(null);
        startRace();
        navigate(
          `/game?start=${encodeURIComponent(
            startArticle
          )}&end=${encodeURIComponent(endArticle)}&mode=race&lobby=${lobbyCode}&player=${encodeURIComponent(
            playerName
          )}`
        );
      }
    }, 1000);
  };

  return (
    <div className="race-lobby-page">
      <Navbar activePage="play" />

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
                  <div className="profile-avatar-placeholder">
                    {playerName.charAt(0).toUpperCase()}
                  </div>
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
                <div className="setting-group vertical">
                  {/* Start Article */}
                  <div className="setting-label">Start Article</div>
                  <div className="route-input-row">
                    <div className="route-autocomplete-wrapper">
                      <input
                        ref={startInputRef}
                        type="text"
                        className="route-input"
                        placeholder="Start article..."
                        value={startArticle}
                        onChange={(e) => {
                          setStartArticle(e.target.value);
                          if (isHost) searchStart(e.target.value);
                        }}
                        onFocus={() => {
                          if (startSuggestions.length > 0) setShowStartSuggestions(true);
                        }}
                        disabled={!isHost}
                      />
                      {isLoadingStart && <span className="route-loading">...</span>}
                      {showStartSuggestions && startSuggestions.length > 0 && (
                        <div ref={startDropdownRef} className="route-suggestions-dropdown">
                          {startSuggestions.map((suggestion, idx) => (
                            <div
                              key={idx}
                              className="route-suggestion-item"
                              onClick={() => {
                                setStartArticle(suggestion);
                                setShowStartSuggestions(false);
                                setStartSuggestions([]);
                              }}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isHost && (
                      <button
                        className={`route-shuffle-btn ${isRandomizingStart ? "loading" : ""}`}
                        onClick={handleRandomStart}
                        title="Random article"
                        disabled={isRandomizingStart}
                      >
                        <IoShuffle />
                      </button>
                    )}
                  </div>

                  {/* Swap Button */}
                  {isHost && (
                    <div className="route-swap-container">
                      <button
                        className="route-swap-btn"
                        onClick={handleSwapArticles}
                        title="Swap articles"
                      >
                        <IoSwapHorizontal />
                      </button>
                    </div>
                  )}

                  {/* End Article */}
                  <div className="setting-label">End Article</div>
                  <div className="route-input-row">
                    <div className="route-autocomplete-wrapper">
                      <input
                        ref={endInputRef}
                        type="text"
                        className="route-input"
                        placeholder="End article..."
                        value={endArticle}
                        onChange={(e) => {
                          setEndArticle(e.target.value);
                          if (isHost) searchEnd(e.target.value);
                        }}
                        onFocus={() => {
                          if (endSuggestions.length > 0) setShowEndSuggestions(true);
                        }}
                        disabled={!isHost}
                      />
                      {isLoadingEnd && <span className="route-loading">...</span>}
                      {showEndSuggestions && endSuggestions.length > 0 && (
                        <div ref={endDropdownRef} className="route-suggestions-dropdown">
                          {endSuggestions.map((suggestion, idx) => (
                            <div
                              key={idx}
                              className="route-suggestion-item"
                              onClick={() => {
                                setEndArticle(suggestion);
                                setShowEndSuggestions(false);
                                setEndSuggestions([]);
                              }}
                            >
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {isHost && (
                      <button
                        className={`route-shuffle-btn ${isRandomizingEnd ? "loading" : ""}`}
                        onClick={handleRandomEnd}
                        title="Random article"
                        disabled={isRandomizingEnd}
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
                            <ProfilePopover
                              name={player.name}
                              country={player.country}
                              rating={1500}
                              gamesPlayed={player.gamesPlayed}
                              bestTime={player.bestTime}
                            >
                              <span className="leaderboard-username">
                                {player.name}
                                {player.name === playerName && " (You)"}
                              </span>
                            </ProfilePopover>
                          </div>
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
                disabled={!isHost || countdown !== null}
              >
                {countdown !== null
                  ? `Game starts in ${countdown}...`
                  : (isHost ? "Start" : "Waiting for Host...")}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RaceLobby;
