import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCog, FaSignInAlt, FaBolt } from "react-icons/fa";
import {
  IoSearch,
  IoPersonSharp,
  IoPeopleSharp,
  IoShuffle,
  IoSwapHorizontal,
  IoChevronDown,
  IoChevronUp,
} from "react-icons/io5";
import fightIcon from "../assets/fight-svgrepo-com(1).svg";
import "./Leaderboard.css";

// Wikipedia API helpers
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

const getRandomWikipediaArticle = async (
  language: string = "en"
): Promise<string> => {
  try {
    const response = await fetch(
      `https://${language}.wikipedia.org/w/api.php?` +
        new URLSearchParams({
          action: "query",
          list: "random",
          rnnamespace: "0",
          rnlimit: "1",
          format: "json",
          origin: "*",
        })
    );
    const data = await response.json();
    return data.query?.random?.[0]?.title || "Random Article";
  } catch (error) {
    console.error("Random article error:", error);
    return "Random Article";
  }
};

interface LeaderboardEntry {
  rank: number;
  username: string;
  country: string;
  gamesPlayed: number;
  bestTime: string;
  avgTime: string;
  winRate: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [showSoloModal, setShowSoloModal] = useState(false);
  const [startArticle, setStartArticle] = useState("");
  const [endArticle, setEndArticle] = useState("");
  const [language, setLanguage] = useState("en");
  const [autoScroll, setAutoScroll] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sampleSize, setSampleSize] = useState(50);

  // Autocomplete state
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [showStartSuggestions, setShowStartSuggestions] = useState(false);
  const [showEndSuggestions, setShowEndSuggestions] = useState(false);
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingEnd, setIsLoadingEnd] = useState(false);
  const [isRandomizingStart, setIsRandomizingStart] = useState(false);
  const [isRandomizingEnd, setIsRandomizingEnd] = useState(false);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const endDropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const debounceRef = useRef<{ start?: NodeJS.Timeout; end?: NodeJS.Timeout }>({});

  const searchStart = useCallback(
    (query: string) => {
      if (debounceRef.current.start) clearTimeout(debounceRef.current.start);
      if (!query.trim()) {
        setStartSuggestions([]);
        setShowStartSuggestions(false);
        return;
      }
      setIsLoadingStart(true);
      debounceRef.current.start = setTimeout(async () => {
        const results = await searchWikipediaArticles(query, language);
        setStartSuggestions(results);
        setShowStartSuggestions(results.length > 0);
        setIsLoadingStart(false);
      }, 300);
    },
    [language]
  );

  const searchEnd = useCallback(
    (query: string) => {
      if (debounceRef.current.end) clearTimeout(debounceRef.current.end);
      if (!query.trim()) {
        setEndSuggestions([]);
        setShowEndSuggestions(false);
        return;
      }
      setIsLoadingEnd(true);
      debounceRef.current.end = setTimeout(async () => {
        const results = await searchWikipediaArticles(query, language);
        setEndSuggestions(results);
        setShowEndSuggestions(results.length > 0);
        setIsLoadingEnd(false);
      }, 300);
    },
    [language]
  );

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSwapArticles = () => {
    const temp = startArticle;
    setStartArticle(endArticle);
    setEndArticle(temp);
    setShowStartSuggestions(false);
    setShowEndSuggestions(false);
  };

  const handleRandomStart = async () => {
    setIsRandomizingStart(true);
    const randomArticle = await getRandomWikipediaArticle(language);
    setStartArticle(randomArticle);
    setShowStartSuggestions(false);
    setIsRandomizingStart(false);
  };

  const handleRandomEnd = async () => {
    setIsRandomizingEnd(true);
    const randomArticle = await getRandomWikipediaArticle(language);
    setEndArticle(randomArticle);
    setShowEndSuggestions(false);
    setIsRandomizingEnd(false);
  };

  const handleSelectStartSuggestion = (suggestion: string) => {
    setStartArticle(suggestion);
    setShowStartSuggestions(false);
    setStartSuggestions([]);
  };

  const handleSelectEndSuggestion = (suggestion: string) => {
    setEndArticle(suggestion);
    setShowEndSuggestions(false);
    setEndSuggestions([]);
  };

  const handlePlayNow = () => {
    if (startArticle && endArticle) {
      navigate(`/game?start=${encodeURIComponent(startArticle)}&end=${encodeURIComponent(endArticle)}`);
      setShowSoloModal(false);
    }
  };

  const handleFeelingLucky = async () => {
    // Fetch two random articles and start the game
    const [randomStart, randomEnd] = await Promise.all([
      getRandomWikipediaArticle(language),
      getRandomWikipediaArticle(language),
    ]);
    navigate(
      `/game?start=${encodeURIComponent(randomStart)}&end=${encodeURIComponent(randomEnd)}`
    );
    setShowSoloModal(false);
  };

  // Sample leaderboard data
  const leaderboardData: LeaderboardEntry[] = [
    {
      rank: 1,
      username: "WikiMaster",
      country: "US",
      gamesPlayed: 247,
      bestTime: "0:45.23",
      avgTime: "1:23.45",
      winRate: "87%",
    },
    {
      rank: 2,
      username: "LinkRunner",
      country: "GB",
      gamesPlayed: 189,
      bestTime: "0:52.11",
      avgTime: "1:31.22",
      winRate: "82%",
    },
    {
      rank: 3,
      username: "SpeedCrawler",
      country: "DE",
      gamesPlayed: 156,
      bestTime: "0:58.34",
      avgTime: "1:35.67",
      winRate: "79%",
    },
    {
      rank: 4,
      username: "ArticleAce",
      country: "CA",
      gamesPlayed: 203,
      bestTime: "1:02.15",
      avgTime: "1:42.11",
      winRate: "75%",
    },
    {
      rank: 5,
      username: "PathFinder",
      country: "FR",
      gamesPlayed: 134,
      bestTime: "1:05.89",
      avgTime: "1:48.33",
      winRate: "73%",
    },
    {
      rank: 6,
      username: "WikiWizard",
      country: "AU",
      gamesPlayed: 178,
      bestTime: "1:08.44",
      avgTime: "1:52.56",
      winRate: "71%",
    },
    {
      rank: 7,
      username: "LinkLegend",
      country: "JP",
      gamesPlayed: 145,
      bestTime: "1:12.33",
      avgTime: "1:55.78",
      winRate: "68%",
    },
    {
      rank: 8,
      username: "CrawlKing",
      country: "BR",
      gamesPlayed: 167,
      bestTime: "1:15.67",
      avgTime: "2:01.12",
      winRate: "65%",
    },
    {
      rank: 9,
      username: "RouteRacer",
      country: "IT",
      gamesPlayed: 112,
      bestTime: "1:18.22",
      avgTime: "2:05.44",
      winRate: "63%",
    },
    {
      rank: 10,
      username: "WikiWarrior",
      country: "ES",
      gamesPlayed: 198,
      bestTime: "1:21.55",
      avgTime: "2:08.89",
      winRate: "61%",
    },
    {
      rank: 11,
      username: "ArticleHunter",
      country: "NL",
      gamesPlayed: 89,
      bestTime: "1:24.11",
      avgTime: "2:12.33",
      winRate: "58%",
    },
    {
      rank: 12,
      username: "LinkSprinter",
      country: "SE",
      gamesPlayed: 124,
      bestTime: "1:28.45",
      avgTime: "2:15.67",
      winRate: "55%",
    },
    {
      rank: 13,
      username: "WikiExplorer",
      country: "NO",
      gamesPlayed: 98,
      bestTime: "1:32.11",
      avgTime: "2:18.22",
      winRate: "52%",
    },
    {
      rank: 14,
      username: "PathPioneer",
      country: "PL",
      gamesPlayed: 145,
      bestTime: "1:35.67",
      avgTime: "2:22.44",
      winRate: "49%",
    },
  ];

  const getCountryFlagUrl = (countryCode: string) => {
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  const getTrophyIcon = (rank: number) => {
    if (rank === 1) return <FaTrophy className="leaderboard-rank-icon gold" />;
    if (rank === 2)
      return <FaTrophy className="leaderboard-rank-icon silver" />;
    if (rank === 3)
      return <FaTrophy className="leaderboard-rank-icon bronze" />;
    return null;
  };

  return (
    <div className="leaderboard-page">
      {/* Navigation Bar */}
      <nav className="leaderboard-nav">
        <div className="leaderboard-nav-container">
          <div className="leaderboard-nav-content">
            {/* Navigation Links */}
            <div className="leaderboard-nav-left">
              <div className="leaderboard-nav-links">
                <button className="leaderboard-nav-button">PLAY</button>
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

            {/* Right Side Actions */}
            <div className="leaderboard-nav-links">
              <button className="leaderboard-nav-button gray">
                <IoSearch className="leaderboard-nav-icon" />
              </button>
              <button className="leaderboard-nav-button gray">
                <FaCog className="leaderboard-nav-icon" />
              </button>
              <button className="leaderboard-nav-button blue">
                <FaSignInAlt className="leaderboard-nav-icon" />
                Sign in
              </button>
            </div>
          </div>
        </div>
        {/* Secondary Nav - Tabs */}
        <div className="leaderboard-nav-secondary">
          <div className="leaderboard-tabs">
            <button className="leaderboard-tab active">Quick pairing</button>
            <button className="leaderboard-tab">Lobby</button>
            <button className="leaderboard-tab">Correspondence</button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="leaderboard-main">
        <div className="leaderboard-grid">
          {/* Left Sidebar - Active Games */}
          <div className="leaderboard-sidebar leaderboard-sidebar-left">
            <div className="game-button-group">
              <div
                className="game-button first"
                onClick={() => setShowSoloModal(true)}
              >
                <div className="game-button-icon game-button-icon-small">
                  <IoPersonSharp className="game-button-icon-svg" />
                </div>
                <div className="game-button-info">
                  <div className="game-button-title">Solo</div>
                  <div className="game-button-meta">
                    Race against the clock solo
                  </div>
                </div>
              </div>

              <div className="game-button middle">
                <div className="game-button-icon game-button-icon-large">
                  <IoPeopleSharp className="game-button-icon-svg" />
                </div>
                <div className="game-button-info">
                  <div className="game-button-title">Race</div>
                  <div className="game-button-meta">
                    Compete with multiple players
                  </div>
                </div>
              </div>

              <div className="game-button last">
                <div className="game-button-icon game-button-icon-large">
                  <img
                    src={fightIcon}
                    alt="Duel"
                    className="game-button-icon-img"
                  />
                </div>
                <div className="game-button-info">
                  <div className="game-button-title">Duel</div>
                  <div className="game-button-meta">Head-to-head challenge</div>
                </div>
              </div>
            </div>

            <div className="leaderboard-about">
              <p>Wiki Runners is a free, open source Wikipedia racing game.</p>
              <a href="#" className="leaderboard-about-link">
                About Wiki Runners...
              </a>
            </div>
          </div>

          {/* Center - Leaderboard Table */}
          <div className="leaderboard-center">
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>
                      <div className="leaderboard-player-head">
                        <span className="leaderboard-rank-header">#</span>
                        <span className="leaderboard-player-label">Player</span>
                      </div>
                    </th>
                    <th className="text-right">Rating</th>
                    <th className="text-right">Time</th>
                    <th className="text-right">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboardData.map((entry) => (
                    <tr key={entry.rank}>
                      <td>
                        <div className="leaderboard-player">
                          <span className="leaderboard-rank-slot">
                            {getTrophyIcon(entry.rank) || (
                              <span className="leaderboard-rank-number">
                                {entry.rank}
                              </span>
                            )}
                          </span>
                          <img
                            src={getCountryFlagUrl(entry.country)}
                            alt={entry.country}
                            className="leaderboard-flag"
                          />
                          <span className="leaderboard-username">
                            {entry.username}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <span className="leaderboard-rating">
                          {1800 + entry.rank * 50}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="leaderboard-time">
                          {entry.bestTime}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="leaderboard-mode">
                          <FaBolt className="mode-icon" /> Rated
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="leaderboard-sidebar leaderboard-sidebar-right">
            {/* Today's Article */}
            <div className="right-panel">
              <div className="article-card">
                <div className="article-header">
                  <div className="panel-label">Today's Article</div>
                  <span className="article-date">Dec 8</span>
                </div>
                <div className="article-title">Aurora Borealis</div>
                <p className="article-description">
                  The aurora borealis, or northern lights, is a natural light
                  display in Earth's sky, predominantly seen in high-latitude
                  regions around the Arctic.
                </p>
                <div className="article-divider" />
                <div className="article-actions">
                  <a
                    href="https://en.wikipedia.org/wiki/Aurora"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="article-link"
                  >
                    Read on Wikipedia
                  </a>
                  <button className="article-play-btn">Play</button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="right-panel">
              <div className="activity-card">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th className="activity-heading">Recent Activity</th>
                      <th className="text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="activity-entry">
                        <span className="activity-result win">W</span>
                        <span className="activity-vs">vs LinkRunner</span>
                      </td>
                      <td className="text-right activity-when">2m</td>
                    </tr>
                    <tr>
                      <td className="activity-entry">
                        <span className="activity-result loss">L</span>
                        <span className="activity-vs">vs WikiMaster</span>
                      </td>
                      <td className="text-right activity-when">15m</td>
                    </tr>
                    <tr>
                      <td className="activity-entry">
                        <span className="activity-result win">W</span>
                        <span className="activity-vs">vs SpeedCrawler</span>
                      </td>
                      <td className="text-right activity-when">1h</td>
                    </tr>
                    <tr>
                      <td className="activity-entry">
                        <span className="activity-result win">W</span>
                        <span className="activity-vs">vs PathFinder</span>
                      </td>
                      <td className="text-right activity-when">2h</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Online Stats */}
            <div className="online-stats">16,883 games played today</div>
          </div>
        </div>
      </div>

      {/* Solo Modal */}
      {showSoloModal && (
        <div className="solo-modal-overlay" onClick={() => setShowSoloModal(false)}>
          <div className="solo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="solo-modal-header">
              <h2>Solo Game Setup</h2>
              <button
                className="solo-modal-close"
                onClick={() => setShowSoloModal(false)}
              >
                ×
              </button>
            </div>

            <div className="solo-modal-body">
              {/* Language Dropdown */}
              <div className="solo-option-group">
                <label className="solo-label">Language</label>
                <select
                  className="solo-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English (en)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                  <option value="de">German (de)</option>
                </select>
              </div>

              {/* Start Article */}
              <div className="solo-option-group">
                <label className="solo-label">Start Article</label>
                <div className="solo-input-row">
                  <div className="solo-autocomplete-wrapper">
                    <input
                      ref={startInputRef}
                      type="text"
                      className="solo-input"
                      placeholder="Search for an article..."
                      value={startArticle}
                      onChange={(e) => {
                        setStartArticle(e.target.value);
                        searchStart(e.target.value);
                      }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (startSuggestions.length > 0) {
                          handleSelectStartSuggestion(startSuggestions[0]);
                        } else if (startArticle.trim()) {
                          setShowStartSuggestions(false);
                        }
                      }
                    }}
                      onFocus={() => {
                        if (startSuggestions.length > 0) setShowStartSuggestions(true);
                      }}
                    />
                    {isLoadingStart && <span className="solo-loading-indicator">...</span>}
                    {showStartSuggestions && startSuggestions.length > 0 && (
                      <div ref={startDropdownRef} className="solo-suggestions-dropdown">
                        {startSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="solo-suggestion-item"
                            onClick={() => handleSelectStartSuggestion(suggestion)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className={`solo-shuffle-btn ${isRandomizingStart ? "loading" : ""}`}
                    onClick={handleRandomStart}
                    title="Random article"
                    disabled={isRandomizingStart}
                  >
                    <IoShuffle />
                  </button>
                </div>
              </div>

              {/* Swap Button */}
              <div className="solo-swap-container">
                <button
                  className="solo-swap-btn"
                  onClick={handleSwapArticles}
                  title="Swap articles"
                >
                  <IoSwapHorizontal />
                </button>
              </div>

              {/* End Article */}
              <div className="solo-option-group">
                <label className="solo-label">End Article</label>
                <div className="solo-input-row">
                  <div className="solo-autocomplete-wrapper">
                    <input
                      ref={endInputRef}
                      type="text"
                      className="solo-input"
                      placeholder="Search for an article..."
                      value={endArticle}
                      onChange={(e) => {
                        setEndArticle(e.target.value);
                        searchEnd(e.target.value);
                      }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (endSuggestions.length > 0) {
                          handleSelectEndSuggestion(endSuggestions[0]);
                        } else if (endArticle.trim()) {
                          setShowEndSuggestions(false);
                        }
                      }
                    }}
                      onFocus={() => {
                        if (endSuggestions.length > 0) setShowEndSuggestions(true);
                      }}
                    />
                    {isLoadingEnd && <span className="solo-loading-indicator">...</span>}
                    {showEndSuggestions && endSuggestions.length > 0 && (
                      <div ref={endDropdownRef} className="solo-suggestions-dropdown">
                        {endSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="solo-suggestion-item"
                            onClick={() => handleSelectEndSuggestion(suggestion)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className={`solo-shuffle-btn ${isRandomizingEnd ? "loading" : ""}`}
                    onClick={handleRandomEnd}
                    title="Random article"
                    disabled={isRandomizingEnd}
                  >
                    <IoShuffle />
                  </button>
                </div>
              </div>

              {/* Auto-scroll Checkbox */}
              <div className="solo-option-group">
                <label className="solo-checkbox-label">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  Enable auto-scrolling
                </label>
              </div>

              {/* Random Article Generator Settings */}
              <div className="solo-collapsible">
                <button
                  className="solo-collapsible-header"
                  onClick={() => toggleSection("random")}
                >
                  <span>Random Article Generator Settings</span>
                  {expandedSection === "random" ? <IoChevronUp /> : <IoChevronDown />}
                </button>
                {expandedSection === "random" && (
                  <div className="solo-collapsible-content">
                    <label className="solo-label">Sample size:</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={sampleSize}
                      onChange={(e) => setSampleSize(Number(e.target.value))}
                      className="solo-slider"
                    />
                    <p className="solo-hint">
                      Sampling from {sampleSize * 60} most popular articles
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="solo-action-buttons">
                <button
                  className={`solo-play-btn ${startArticle && endArticle ? "active" : ""}`}
                  onClick={handlePlayNow}
                  disabled={!startArticle || !endArticle}
                >
                  Play Now
                </button>
                <button
                  className="solo-lucky-btn"
                  onClick={handleFeelingLucky}
                >
                  I'm Feeling Lucky
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
