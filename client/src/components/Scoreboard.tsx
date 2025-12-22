import "./Scoreboard.css";
import type { Player } from "../hooks/useMultiplayer";

interface ScoreboardPlayer {
  username: string;
  scoreDiff: string; // e.g., "+5", "-3", "0"
  linksClicked: number;
  isAhead: boolean | null; // true = ahead (green), false = behind (red), null = neutral
  colorIndex: number; // Index for color assignment
}

interface ScoreboardProps {
  players: Player[];
  currentPlayerClicks: number;
}

// Cursor colors matching Game.tsx - these are drastically different colors
const CURSOR_COLORS = [
  "rgba(255, 71, 87, 1)",   // Red/Pink
  "rgba(52, 152, 219, 1)",  // Blue
  "rgba(46, 204, 113, 1)",  // Green
  "rgba(241, 196, 15, 1)",  // Yellow
  "rgba(155, 89, 182, 1)",  // Purple
  "rgba(230, 126, 34, 1)",  // Orange
  "rgba(26, 188, 156, 1)",  // Turquoise
  "rgba(231, 76, 60, 1)",   // Red
];

// Hash function to get consistent color index from player name
// This ensures the same name always gets the same color regardless of other players
const hashStringToIndex = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % CURSOR_COLORS.length;
};

const Scoreboard = ({ players, currentPlayerClicks }: ScoreboardProps) => {
  // Get color based on player name hash (matches cursor colors)
  const getPlayerColor = (name: string): string => {
    const index = hashStringToIndex(name);
    const color = CURSOR_COLORS[index];
    // Convert rgba to rgb for CSS color
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const r = parseInt(rgbMatch[0]);
      const g = parseInt(rgbMatch[1]);
      const b = parseInt(rgbMatch[2]);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return color;
  };

  
  // Convert Player[] to ScoreboardPlayer[] and calculate diffs
  // Sort by clicks for display
  const sortedPlayers = [...players].sort((a, b) => b.clicks - a.clicks);
  
  const scoreboardPlayers: ScoreboardPlayer[] = sortedPlayers.map((player) => {
    const diff = player.clicks - currentPlayerClicks;
    const scoreDiff = diff > 0 ? `+${diff}` : diff === 0 ? "0" : `${diff}`;
    const isAhead = diff > 0 ? true : diff < 0 ? false : null;
    
    return {
      username: player.name,
      scoreDiff,
      linksClicked: player.clicks,
      isAhead,
      colorIndex: 0, // Not used anymore, kept for interface compatibility
    };
  });

  return (
    <div className="scoreboard-widget">
      <div className="scoreboard-header">
        <div className="scoreboard-title">
          <div className="title-row">
            <span>Scoreboard</span>
            <div className="stats-header-labels">
              <span className="stats-header-diff">Diff</span>
              <span className="stats-header-links">Links</span>
            </div>
          </div>
        </div>
      </div>

      <div className="players-list">
        {scoreboardPlayers.map((player, index) => (
          <div key={index} className="player-row">
            <div 
              className="player-name"
              style={{ color: getPlayerColor(player.username) }}
            >
              {player.username}
            </div>
            <div className="player-stats">
              <span
                className={`score-diff ${
                  player.isAhead === true
                    ? "ahead"
                    : player.isAhead === false
                    ? "behind"
                    : ""
                }`}
              >
                {player.scoreDiff}
              </span>
              <span className="links-count">{player.linksClicked}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;

