import { useNavigate } from "react-router-dom";
import { FaTrophy, FaCog, FaSignInAlt, FaBolt } from "react-icons/fa";
import { IoSearch, IoPersonSharp, IoPeopleSharp } from "react-icons/io5";
import fightIcon from "../assets/fight-svgrepo-com(1).svg";
import "./Leaderboard.css";

interface LeaderboardEntry {
  rank: number;
  username: string;
  gamesPlayed: number;
  bestTime: string;
  avgTime: string;
  winRate: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();

  // Sample leaderboard data
  const leaderboardData: LeaderboardEntry[] = [
    {
      rank: 1,
      username: "WikiMaster",
      gamesPlayed: 247,
      bestTime: "0:45.23",
      avgTime: "1:23.45",
      winRate: "87%",
    },
    {
      rank: 2,
      username: "LinkRunner",
      gamesPlayed: 189,
      bestTime: "0:52.11",
      avgTime: "1:31.22",
      winRate: "82%",
    },
    {
      rank: 3,
      username: "SpeedCrawler",
      gamesPlayed: 156,
      bestTime: "0:58.34",
      avgTime: "1:35.67",
      winRate: "79%",
    },
    {
      rank: 4,
      username: "ArticleAce",
      gamesPlayed: 203,
      bestTime: "1:02.15",
      avgTime: "1:42.11",
      winRate: "75%",
    },
    {
      rank: 5,
      username: "PathFinder",
      gamesPlayed: 134,
      bestTime: "1:05.89",
      avgTime: "1:48.33",
      winRate: "73%",
    },
    {
      rank: 6,
      username: "WikiWizard",
      gamesPlayed: 178,
      bestTime: "1:08.44",
      avgTime: "1:52.56",
      winRate: "71%",
    },
    {
      rank: 7,
      username: "LinkLegend",
      gamesPlayed: 145,
      bestTime: "1:12.33",
      avgTime: "1:55.78",
      winRate: "68%",
    },
    {
      rank: 8,
      username: "CrawlKing",
      gamesPlayed: 167,
      bestTime: "1:15.67",
      avgTime: "2:01.12",
      winRate: "65%",
    },
    {
      rank: 9,
      username: "RouteRacer",
      gamesPlayed: 112,
      bestTime: "1:18.22",
      avgTime: "2:05.44",
      winRate: "63%",
    },
    {
      rank: 10,
      username: "WikiWarrior",
      gamesPlayed: 198,
      bestTime: "1:21.55",
      avgTime: "2:08.89",
      winRate: "61%",
    },
    {
      rank: 11,
      username: "ArticleHunter",
      gamesPlayed: 89,
      bestTime: "1:24.11",
      avgTime: "2:12.33",
      winRate: "58%",
    },
    {
      rank: 12,
      username: "LinkSprinter",
      gamesPlayed: 124,
      bestTime: "1:28.45",
      avgTime: "2:15.67",
      winRate: "55%",
    },
  ];

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
            <button className="leaderboard-tab">Quick pairing</button>
            <button className="leaderboard-tab active">Lobby</button>
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
              <div className="game-button first" onClick={() => navigate("/")}>
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
                    <th>Player</th>
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
                          {getTrophyIcon(entry.rank)}
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
              <div className="panel-label">Recent Activity</div>
              <div className="activity-list">
                <div className="activity-row">
                  <span className="activity-status win">W</span>
                  <span className="activity-name">vs LinkRunner</span>
                  <span className="activity-time">2m</span>
                </div>
                <div className="activity-row">
                  <span className="activity-status loss">L</span>
                  <span className="activity-name">vs WikiMaster</span>
                  <span className="activity-time">15m</span>
                </div>
                <div className="activity-row">
                  <span className="activity-status win">W</span>
                  <span className="activity-name">Daily Challenge</span>
                  <span className="activity-time">1h</span>
                </div>
              </div>
            </div>

            {/* Online Stats */}
            <div className="online-stats">
              <span className="online-dot"></span>
              <span className="online-count">2,847</span>
              <span className="online-label">online now</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
