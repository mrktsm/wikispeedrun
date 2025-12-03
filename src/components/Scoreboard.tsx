import "./Scoreboard.css";

interface Player {
  username: string;
  scoreDiff: string; // e.g., "+5", "-3", "0"
  linksClicked: number;
  isAhead: boolean | null; // true = ahead (green), false = behind (red), null = neutral
}

const Scoreboard = () => {
  // Generate a gradient based on username
  const getPlayerGradient = (username: string): string => {
    const gradients = [
      "linear-gradient(135deg, #FF6B6B, #EE5A6F)", // Red gradient
      "linear-gradient(135deg, #4ECDC4, #44A08D)", // Teal gradient
      "linear-gradient(135deg, #45B7D1, #2193B0)", // Blue gradient
      "linear-gradient(135deg, #FFA07A, #FF8C69)", // Light Salmon gradient
      "linear-gradient(135deg, #98D8C8, #7BC4A4)", // Mint gradient
      "linear-gradient(135deg, #F7DC6F, #F4D03F)", // Yellow gradient
      "linear-gradient(135deg, #BB8FCE, #9B59B6)", // Purple gradient
      "linear-gradient(135deg, #85C1E2, #5DADE2)", // Sky Blue gradient
      "linear-gradient(135deg, #F8B739, #F39C12)", // Orange gradient
      "linear-gradient(135deg, #52BE80, #27AE60)", // Green gradient
    ];
    // Simple hash function to get consistent gradient per username
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Sample data
  const players: Player[] = [
    {
      username: "Alex",
      scoreDiff: "+5",
      linksClicked: 12,
      isAhead: true,
    },
    {
      username: "Sam",
      scoreDiff: "-3",
      linksClicked: 8,
      isAhead: false,
    },
    {
      username: "Jordan",
      scoreDiff: "+2",
      linksClicked: 10,
      isAhead: true,
    },
    {
      username: "Casey",
      scoreDiff: "-1",
      linksClicked: 7,
      isAhead: false,
    },
    {
      username: "Morgan",
      scoreDiff: "+4",
      linksClicked: 11,
      isAhead: true,
    },
  ];

  return (
    <div className="scoreboard-widget">
      <div className="scoreboard-header">
        <div className="scoreboard-title">
          <div>Scoreboard</div>
          <div className="subtitle">Links Diff | Links Clicked</div>
        </div>
      </div>

      <div className="players-list">
        {players.map((player, index) => (
          <div key={index} className="player-row">
            <div
              className="player-avatar"
              style={{ backgroundImage: getPlayerGradient(player.username) }}
            >
              {player.username.charAt(0).toUpperCase()}
            </div>
            <div className="player-name">{player.username}</div>
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

