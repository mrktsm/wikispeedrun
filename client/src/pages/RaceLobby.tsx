import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoShuffle, IoCopy, IoCheckmark } from "react-icons/io5";
import "./RaceLobby.css";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  country: string;
  rating: number;
  gamesPlayed?: number;
  bestTime?: string;
}

interface ChatMessage {
  id: string;
  type: "system" | "chat";
  playerName?: string;
  text: string;
  timestamp: Date;
}

const RaceLobby = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lobbyCode = searchParams.get("code") || generateLobbyCode();

  const [startArticle, setStartArticle] = useState("Cat");
  const [endArticle, setEndArticle] = useState("Dog");
  const [gameMode, setGameMode] = useState("first_to_finish");
  const [visibility, setVisibility] = useState("public");
  const [copied, setCopied] = useState(false);

  // Mock data - will be replaced with WebSocket state
  const [players] = useState<Player[]>([
    {
      id: "1",
      name: "WikiMaster",
      isHost: true,
      isReady: true,
      country: "US",
      rating: 1850,
      gamesPlayed: 42,
      bestTime: "0:23.45",
    },
  ]);

  const getCountryFlagUrl = (countryCode: string) => {
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  const [messages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "system",
      text: "Connected to lobby.",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "system",
      text: "You created the lobby.",
      timestamp: new Date(),
    },
  ]);

  const [chatInput, setChatInput] = useState("");

  const isHost = players.find((p) => p.id === "1")?.isHost ?? false;
  const maxPlayers = 8;
  const emptySlots = maxPlayers - players.length;

  // Generate random lobby code
  function generateLobbyCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

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

  // Start the race
  const handleStartRace = () => {
    navigate(
      `/game?start=${encodeURIComponent(startArticle)}&end=${encodeURIComponent(
        endArticle
      )}&mode=race&lobby=${lobbyCode}`
    );
  };

  // Leave lobby
  const handleLeave = () => {
    navigate("/");
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
                  onClick={() =>
                    navigate("/", { state: { direction: "back" } })
                  }
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
                    <div className="profile-name">{players[0]?.name}</div>
                    <div className="profile-stats">
                      <div className="profile-stat">
                        <span className="profile-stat-label">Games</span>
                        <span className="profile-stat-value">
                          {players[0]?.gamesPlayed || 0}
                        </span>
                      </div>
                      <div className="profile-stat">
                        <span className="profile-stat-label">Best</span>
                        <span className="profile-stat-value">
                          {players[0]?.bestTime || "-"}
                        </span>
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
                    {players.map((player, index) => (
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
                                {players.length + i + 1}
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
              Players ({players.length}/{maxPlayers})
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
              {isHost && (
                <button
                  className="race-action-btn start-btn"
                  onClick={handleStartRace}
                >
                  Start
                </button>
              )}
              {!isHost && (
                <button className="race-action-btn ready-btn">Ready Up</button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RaceLobby;
