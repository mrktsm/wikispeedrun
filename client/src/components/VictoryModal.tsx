import "./VictoryModal.css";

interface SegmentData {
  name: string;
  time: string;
  timeDiff: string | null;
}

interface VictoryModalProps {
  finalTime: string;
  segments: SegmentData[];
  startArticle: string;
  endArticle: string;
  onPlayAgain: () => void;
  onNewRoute: () => void;
}

const VictoryModal = ({
  finalTime,
  segments,
  startArticle,
  endArticle,
  onPlayAgain,
  onNewRoute,
}: VictoryModalProps) => {
  const clickCount = segments.length;

  // Format time for display
  const formatTime = () => {
    const parts = finalTime.split(":");
    if (parts.length === 2) {
      const mins = parts[0].padStart(2, "0");
      const rest = parts[1];
      return { main: `${mins}:${rest.slice(0, 2)}`, centis: rest.slice(3) };
    }
    return { main: finalTime, centis: "" };
  };

  // Calculate time per click
  const getTimePerClick = () => {
    if (clickCount === 0) return "-";
    const parts = finalTime.split(":");
    let totalSeconds = 0;
    if (parts.length === 2) {
      totalSeconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    const avg = totalSeconds / clickCount;
    return `${avg.toFixed(1)}s`;
  };

  const time = formatTime();
  const maxVisiblePathRows = 7;
  const placeholders =
    segments.length < maxVisiblePathRows
      ? Array.from(
          { length: maxVisiblePathRows - segments.length },
          () => ({ name: "-", time: "-", timeDiff: null as string | null })
        )
      : [];
  const displaySegments =
    segments.length < maxVisiblePathRows
      ? [...segments, ...placeholders]
      : segments;

  return (
    <div className="victory-overlay" onClick={onNewRoute}>
      <div className="victory-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header - route as title */}
        <div className="victory-header">
          <span className="victory-header-title">
            {startArticle.replace(/_/g, " ")} to {endArticle.replace(/_/g, " ")}
          </span>
        </div>

        {/* Statistics */}
        <div className="victory-stats-section">
          <div className="victory-stats-label">STATISTICS</div>
          <div className="victory-stats-grid">
            <div className="victory-stat-box">
              <div className="victory-stat-number">{clickCount}</div>
              <div className="victory-stat-name">Clicks</div>
            </div>
            <div className="victory-stat-box">
              <div className="victory-stat-number">{getTimePerClick()}</div>
              <div className="victory-stat-name">Per Click</div>
            </div>
            <div className="victory-stat-box">
              <div className="victory-stat-number">{segments.length > 0 ? segments.length + 1 : 1}</div>
              <div className="victory-stat-name">Articles</div>
            </div>
          </div>
        </div>

        {/* Path taken */}
        {segments.length > 0 && (
          <div className="victory-path-section">
            <div className="victory-path-header">PATH TAKEN</div>
            <div className="victory-path-list">
              {displaySegments.map((seg, index) => (
                <div key={index} className="victory-path-item">
                  <span className="victory-path-name">{seg.name}</span>
                  <span className="victory-path-times">
                    {seg.timeDiff && (
                      <span
                        className={`victory-path-diff ${
                          seg.timeDiff.startsWith("+") ? "behind" : "ahead"
                        }`}
                      >
                        {seg.timeDiff}
                      </span>
                    )}
                    <span className="victory-path-time">{seg.time}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time */}
        <div className="victory-time-section">
          <div className="victory-time">
            {time.main}
            {time.centis && <span className="victory-time-centis">.{time.centis}</span>}
          </div>
        </div>

        {/* Buttons */}
        <div className="victory-actions">
          <button className="victory-btn secondary" onClick={onNewRoute}>
            Back to Menu
          </button>
          <button className="victory-btn primary" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
