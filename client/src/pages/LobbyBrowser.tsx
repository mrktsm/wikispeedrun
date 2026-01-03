import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoRefresh, IoAdd } from "react-icons/io5";
import { FaBolt } from "react-icons/fa";
import Navbar from "../components/Navbar";
import "./LobbyBrowser.css";

interface Lobby {
  id: string;
  code: string;
  hostName: string;
  hostCountry: string;
  startArticle: string;
  endArticle: string;
  mode: string;
  players: number;
  maxPlayers: number;
  status: "waiting" | "in_progress" | "starting";
}

// Get API URL from environment variable, fallback to localhost
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const LobbyBrowser = () => {
  const navigate = useNavigate();
  const [selectedLobby, setSelectedLobby] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch lobbies from server
  const fetchLobbies = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/lobbies`);
      if (response.ok) {
        const data = await response.json();
        // Map server data to our Lobby interface
        const mappedLobbies: Lobby[] = data.map((lobby: {
          id: string;
          code: string;
          hostName: string;
          hostCountry: string;
          startArticle: string;
          endArticle: string;
          players: number;
          maxPlayers: number;
          status: string;
        }) => ({
          ...lobby,
          mode: "First to Finish", // Default mode since server doesn't track this yet
          status: lobby.status as Lobby["status"],
        }));
        setLobbies(mappedLobbies);
      }
    } catch (error) {
      console.error("Failed to fetch lobbies:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchLobbies();

    // Poll every 5 seconds
    const pollInterval = setInterval(fetchLobbies, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchLobbies]);

  const getCountryFlagUrl = (countryCode: string) => {
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  const handleCreateLobby = () => {
    // Generate a random lobby code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/race-lobby?code=${code}`);
  };

  const handleQuickMatch = () => {
    // Find first available lobby or create new one
    const availableLobby = lobbies.find(
      (l) => l.status === "waiting" && l.players < l.maxPlayers
    );
    if (availableLobby) {
      navigate(`/race-lobby?code=${availableLobby.code}`);
    } else {
      handleCreateLobby();
    }
  };

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      navigate(`/race-lobby?code=${joinCode.trim().toUpperCase()}`);
    }
  };

  const handleJoinLobby = () => {
    if (selectedLobby) {
      const lobby = lobbies.find((l) => l.id === selectedLobby);
      if (lobby) {
        navigate(`/race-lobby?code=${lobby.code}`);
      }
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchLobbies();
  };

  const filteredLobbies = lobbies.filter((lobby) => {
    if (modeFilter === "all") return true;
    return lobby.mode.toLowerCase().includes(modeFilter.toLowerCase());
  });

  // Ref for measuring the table wrapper (its height is set by CSS flex)
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Calculate initial placeholder count based on viewport height immediately
  // This avoids the delay from DOM measurement
  const calculateInitialPlaceholders = () => {
    // Estimate: viewport height minus header (~200px) minus other UI (~300px) = ~400px available
    // Base row height is ~37px, so roughly 10-15 rows fit
    const estimatedAvailableHeight = Math.max(400, window.innerHeight - 500);
    const baseRowHeight = 37;
    const estimatedRows = Math.floor(estimatedAvailableHeight / baseRowHeight);
    return Math.max(15, estimatedRows);
  };

  const [placeholderCount, setPlaceholderCount] = useState<number>(calculateInitialPlaceholders());
  const [extraRowPadding, setExtraRowPadding] = useState<number>(0);

  const computePlaceholderCount = useCallback(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    const thead = wrapper.querySelector("thead");
    if (!thead) return;

    // Measure the wrapper height (determined by CSS flex, not content)
    const wrapperHeight = wrapper.clientHeight;
    const theadHeight = thead.getBoundingClientRect().height;

    // Available space for rows
    const availableSpace = wrapperHeight - theadHeight;

    if (availableSpace <= 0) {
      // Keep a reasonable minimum
      setPlaceholderCount(calculateInitialPlaceholders());
      setExtraRowPadding(0);
      return;
    }

    // Base row height: 10px padding top + 10px bottom + ~17px content
    const baseRowHeight = 37;

    // Calculate how many full rows can fit
    const maxRowsThatFit = Math.floor(availableSpace / baseRowHeight);

    const realRowCount = filteredLobbies.length;
    const neededPlaceholders = Math.max(0, maxRowsThatFit - realRowCount);
    const totalRows = realRowCount + neededPlaceholders;

    // Calculate leftover space and distribute as extra padding per row
    const usedHeight = totalRows * baseRowHeight;
    const leftover = availableSpace - usedHeight;
    const extraPadding =
      totalRows > 0 ? Math.max(0, leftover / totalRows / 2) : 0;

    setPlaceholderCount(neededPlaceholders);
    setExtraRowPadding(extraPadding);
  }, [filteredLobbies.length]);

  useEffect(() => {
    // Use ResizeObserver for immediate updates when container size changes
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    // Calculate immediately
    computePlaceholderCount();

    // Use ResizeObserver for instant updates
    const resizeObserver = new ResizeObserver(() => {
      computePlaceholderCount();
    });

    resizeObserver.observe(wrapper);

    window.addEventListener("resize", computePlaceholderCount);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", computePlaceholderCount);
    };
  }, [computePlaceholderCount]);

  const getStatusText = (status: Lobby["status"]) => {
    switch (status) {
      case "waiting":
        return "Waiting";
      case "starting":
        return "Starting...";
      case "in_progress":
        return "In Progress";
    }
  };

  const getStatusClass = (status: Lobby["status"]) => {
    switch (status) {
      case "waiting":
        return "status-waiting";
      case "starting":
        return "status-starting";
      case "in_progress":
        return "status-in-progress";
    }
  };

  return (
    <div className="lobby-browser-page">
      <Navbar activePage="play" />

      {/* Spacer */}
      <div className="lobby-browser-nav-spacer" />

      {/* Main Content */}
      <main className="lobby-browser-main">
        <div className="lobby-browser-grid">
          {/* Left Sidebar */}
          <div className="lobby-browser-sidebar">
            {/* Quick Actions */}
            <div className="lobby-browser-card">
              <div className="lobby-browser-card-body">
                <button
                  className="lobby-action-btn create-btn"
                  onClick={handleCreateLobby}
                >
                  <IoAdd className="btn-icon" />
                  Create Lobby
                </button>
                <button
                  className="lobby-action-btn quick-btn"
                  onClick={handleQuickMatch}
                >
                  <FaBolt className="btn-icon" />
                  Quick Match
                </button>
              </div>
            </div>

            {/* Join by Code */}
            <div className="lobby-browser-card">
              <div className="lobby-browser-card-header">Join by Code</div>
              <div className="lobby-browser-card-body">
                <div className="join-code-row">
                  <input
                    type="text"
                    className="join-code-input"
                    placeholder="Enter code..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                    maxLength={6}
                  />
                  <button
                    className="join-code-btn"
                    onClick={handleJoinByCode}
                    disabled={!joinCode.trim()}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="lobby-browser-card">
              <div className="lobby-browser-card-header">Filters</div>
              <div className="lobby-browser-card-body">
                <div className="filter-group">
                  <label className="filter-label">Mode</label>
                  <select
                    className="filter-select"
                    value={modeFilter}
                    onChange={(e) => setModeFilter(e.target.value)}
                  >
                    <option value="all">All Modes</option>
                    <option value="first">First to Finish</option>
                    <option value="best">Best of 3</option>
                    <option value="fewest">Fewest Clicks</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Lobby List */}
          <div className="lobby-browser-right">
            {/* Lobby Table */}
            <div className="lobby-browser-card lobbies-card">
              <div
                className="lobbies-table-wrapper"
                ref={tableWrapperRef}
                style={
                  {
                    "--extra-row-padding": `${extraRowPadding}px`,
                  } as React.CSSProperties
                }
              >
                <table className="lobbies-table">
                  <thead>
                    <tr>
                      <th>
                        <div className="lobbies-player-head">
                          <span className="lobbies-player-label">Host</span>
                        </div>
                      </th>
                      <th>Route</th>
                      <th>Mode</th>
                      <th className="text-right">Players</th>
                      <th className="text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLobbies.map((lobby) => (
                      <tr
                        key={lobby.id}
                        className={`${selectedLobby === lobby.id ? "selected" : ""
                          } ${lobby.status !== "waiting" ? "unavailable" : ""}`}
                        onClick={() =>
                          lobby.status === "waiting" &&
                          setSelectedLobby(
                            selectedLobby === lobby.id ? null : lobby.id
                          )
                        }
                      >
                        <td>
                          <div className="lobby-host">
                            <img
                              src={getCountryFlagUrl(lobby.hostCountry)}
                              alt={lobby.hostCountry}
                              className="lobby-flag"
                            />
                            <span className="lobby-hostname">
                              {lobby.hostName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="lobby-route">
                            {lobby.startArticle} to {lobby.endArticle}
                          </span>
                        </td>
                        <td>
                          <span className="lobby-mode">{lobby.mode}</span>
                        </td>
                        <td className="text-right">
                          <span className="lobby-players">
                            {lobby.players}/{lobby.maxPlayers}
                          </span>
                        </td>
                        <td className="text-right">
                          <span
                            className={`lobby-status ${getStatusClass(
                              lobby.status
                            )}`}
                          >
                            {getStatusText(lobby.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Empty placeholder rows to fill space */}
                    {Array.from({ length: placeholderCount }).map(
                      (_, index) => {
                        // Calculate if this row should be odd or even based on filtered lobbies length
                        const rowIndex = filteredLobbies.length + index;
                        const isOdd = rowIndex % 2 === 0;
                        return (
                          <tr
                            key={`empty-${index}`}
                            className={`empty-placeholder-row ${isOdd ? "odd" : "even"
                              }`}
                          >
                            <td>
                              <div className="lobby-host">
                                <div
                                  className="lobby-flag"
                                  style={{ visibility: "hidden" }}
                                />
                                <span
                                  className="lobby-hostname"
                                  style={{ visibility: "hidden" }}
                                >
                                  —
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                className="lobby-route"
                                style={{ visibility: "hidden" }}
                              >
                                —
                              </span>
                            </td>
                            <td>
                              <span
                                className="lobby-mode"
                                style={{ visibility: "hidden" }}
                              >
                                —
                              </span>
                            </td>
                            <td className="text-right">
                              <span
                                className="lobby-players"
                                style={{ visibility: "hidden" }}
                              >
                                —
                              </span>
                            </td>
                            <td className="text-right">
                              <span style={{ visibility: "hidden" }}>—</span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="lobby-browser-actions">
              <button
                className="lobby-browser-action-btn refresh-btn"
                onClick={handleRefresh}
              >
                <IoRefresh />
                Refresh
              </button>
              <button
                className="lobby-browser-action-btn join-btn"
                onClick={handleJoinLobby}
                disabled={!selectedLobby}
              >
                Join Lobby
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LobbyBrowser;
