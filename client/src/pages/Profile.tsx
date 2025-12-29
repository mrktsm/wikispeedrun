import { useNavigate } from "react-router-dom";
import { IoSearch, IoChevronDown } from "react-icons/io5";
import { FaCog, FaSignInAlt, FaTrophy, FaClock, FaGamepad, FaFire } from "react-icons/fa";
import "./Leaderboard.css";
import "./Profile.css";

// Mock player data - will be replaced with real data later
const mockPlayerData = {
  name: "WikiSpeedRunner",
  country: "US",
  joinDate: "Aug 2024",
  bio: "I'm occasionally good at finding the shortest paths between articles.",
  level: 54,
  yearsOfService: 1,
  xp: 200,
  
  // Overall stats
  gamesPlayed: 247,
  wins: 142,
  winRate: 57.5,
  totalClicks: 8234,
  avgClicks: 33.3,
  bestTime: "23.4s",
  totalPlaytime: "24h 32m",
  avgTimePerArticle: "12.8s",
  
  // Recent matches
  recentMatches: [
    { route: "Apple to Banana", mode: "Race", result: "Win", clicks: 6, time: "45.2s", date: "2 hours ago" },
    { route: "Moon to Sun", mode: "Race", result: "Win", clicks: 8, time: "52.1s", date: "5 hours ago" },
    { route: "Paris to London", mode: "Race", result: "Loss", clicks: 12, time: "1m 23s", date: "1 day ago" },
    { route: "JavaScript to Python", mode: "Race", result: "Win", clicks: 7, time: "48.9s", date: "1 day ago" },
    { route: "Football to World Cup", mode: "Race", result: "Win", clicks: 5, time: "39.4s", date: "2 days ago" },
    { route: "Cat to Dog", mode: "Race", result: "Win", clicks: 4, time: "23.4s", date: "3 days ago" },
    { route: "Japan to United States", mode: "Race", result: "Win", clicks: 5, time: "31.2s", date: "3 days ago" },
    { route: "Pizza to Italy", mode: "Race", result: "Win", clicks: 3, time: "18.7s", date: "4 days ago" },
    { route: "React to JavaScript", mode: "Race", result: "Loss", clicks: 9, time: "1m 15s", date: "4 days ago" },
    { route: "Coffee to Brazil", mode: "Race", result: "Win", clicks: 6, time: "42.3s", date: "5 days ago" },
    { route: "Mars to Space", mode: "Race", result: "Win", clicks: 7, time: "51.8s", date: "5 days ago" },
    { route: "Python to Programming", mode: "Race", result: "Win", clicks: 4, time: "28.9s", date: "6 days ago" },
  ],
  
  // Achievements
  achievements: [
    { name: "Speed Demon", icon: "⚡", unlocked: true },
    { name: "Click Master", icon: "🎯", unlocked: true },
    { name: "100 Games", icon: "🏆", unlocked: true },
    { name: "Winning Streak", icon: "🔥", unlocked: true },
    { name: "Perfect Path", icon: "⭐", unlocked: true },
    { name: "Marathon Runner", icon: "🏃", unlocked: false },
  ],
  
  // Badges
  badges: [
    { name: "M", xp: "500+", unlocked: true },
    { name: "Dog", icon: "🐕", unlocked: true },
    { name: "Check", icon: "✓", unlocked: true },
  ],
  
  // Stats
  gamesOwned: 247,
  dlcOwned: 0,
  reviews: 12,
  achievementsCount: 1327,
  perfectGames: 8,
  avgCompletion: 25,
};

const Profile = () => {
  const navigate = useNavigate();

  const getCountryFlagUrl = (countryCode: string) => {
    return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  };

  return (
    <div className="profile-page">
      {/* Navigation Bar */}
      <nav className="leaderboard-nav">
        <div className="leaderboard-nav-container">
          <div className="leaderboard-nav-content">
            <div className="leaderboard-nav-left">
              <div className="leaderboard-nav-links">
                <button
                  className="leaderboard-nav-button"
                  onClick={() => navigate("/")}
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
      </nav>

      {/* Spacer */}
      <div className="profile-nav-spacer" />

      {/* Main Content */}
      <main className="profile-main">
        {/* Profile Header */}
        <div className="profile-header-section">
          <div className="profile-header-container">
            <div className="profile-header-left">
              <div className="profile-avatar-large">
                <div className="profile-avatar-placeholder-large" />
              </div>
              <div className="profile-header-info">
                <div className="profile-name-row">
                  <h1 className="profile-name-large">{mockPlayerData.name}</h1>
                  <IoChevronDown className="profile-name-dropdown" />
                </div>
                <div className="profile-location">
                  <img
                    src={getCountryFlagUrl(mockPlayerData.country)}
                    alt={mockPlayerData.country}
                    className="profile-flag-small"
                  />
                  <span>United States</span>
                </div>
                <p className="profile-bio">{mockPlayerData.bio}</p>
              </div>
            </div>
            <div className="profile-header-right">
              <button className="profile-edit-button">Edit Profile</button>
            </div>
          </div>
        </div>

        {/* Content Area - Two Column Layout */}
        <div className="profile-content-wrapper">
          <div className="profile-content-container">
            {/* Left Column */}
            <div className="profile-left-column">
              {/* Recent Matches Table */}
              <div className="profile-showcase-section">
                <div className="profile-showcase-header">
                  <h2 className="profile-showcase-title">Recent Matches</h2>
                </div>
                <div className="leaderboard-center">
                  <div className="leaderboard-table-wrapper">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>Result</th>
                          <th>Route</th>
                          <th className="text-right">Clicks</th>
                          <th className="text-right">Time</th>
                          <th className="text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockPlayerData.recentMatches.map((match, index) => (
                          <tr key={index}>
                            <td>
                              <span className="match-result-badge" data-result={match.result.toLowerCase()}>
                                {match.result === "Win" ? "W" : "L"}
                              </span>
                            </td>
                            <td>
                              <span className="match-route">{match.route}</span>
                            </td>
                            <td className="text-right">
                              <span className="match-stat-value">{match.clicks}</span>
                            </td>
                            <td className="text-right">
                              <span className="match-stat-value">{match.time}</span>
                            </td>
                            <td className="text-right">
                              <span className="match-date">{match.date}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="profile-right-column">
              <div className="profile-sidebar-card">
                <div className="profile-status">
                  <div className="profile-status-label">Currently Online</div>
                </div>
                <div className="profile-stats-sidebar">
                  <div className="profile-stat-sidebar-item">
                    <div className="profile-stat-sidebar-label">Total Playtime</div>
                    <div className="profile-stat-sidebar-value">{mockPlayerData.totalPlaytime}</div>
                  </div>
                  <div className="profile-stat-sidebar-item">
                    <div className="profile-stat-sidebar-label">Games Played</div>
                    <div className="profile-stat-sidebar-value">{mockPlayerData.gamesPlayed}</div>
                  </div>
                  <div className="profile-stat-sidebar-item">
                    <div className="profile-stat-sidebar-label">Wins</div>
                    <div className="profile-stat-sidebar-value">{mockPlayerData.wins}</div>
                  </div>
                  <div className="profile-stat-sidebar-item">
                    <div className="profile-stat-sidebar-label">Best Time</div>
                    <div className="profile-stat-sidebar-value">{mockPlayerData.bestTime}</div>
                  </div>
                  <div className="profile-stat-sidebar-item">
                    <div className="profile-stat-sidebar-label">Articles Visited</div>
                    <div className="profile-stat-sidebar-value">{mockPlayerData.totalClicks.toLocaleString()}</div>
                  </div>
                  <div className="profile-stat-sidebar-item">
                    <div className="profile-stat-sidebar-label">Avg Time/Article</div>
                    <div className="profile-stat-sidebar-value">{mockPlayerData.avgTimePerArticle}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
