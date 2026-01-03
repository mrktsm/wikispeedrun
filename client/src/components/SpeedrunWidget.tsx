import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import "./SpeedrunWidget.css";

interface Segment {
  name: string;
  timeDiff: string | null; // null means empty, "-" means no diff
  cumulativeTime: string;
  isCurrent: boolean;
  isAhead: boolean | null; // true = green (< 1 min), false = red (>= 1 min), null = neutral/empty
}

interface SpeedrunWidgetProps {
  gameMode?: string;
  startArticle?: string;
  endArticle?: string;
  isRunning?: boolean;
  isStopped?: boolean;
  isMultiplayer?: boolean;
}

export interface SegmentData {
  name: string;
  time: string;
  timeDiff: string | null;
}

export interface SpeedrunWidgetRef {
  addSegment: (articleName: string) => void;
  getCurrentTime: () => string;
  getSegmentsCount: () => number;
  getSegments: () => SegmentData[];
}

const SpeedrunWidget = forwardRef<SpeedrunWidgetRef, SpeedrunWidgetProps>(
  (
    {
      gameMode = "Single Player",
      startArticle = "Start",
      endArticle = "Link to reach",
      isMultiplayer = false,
      isRunning = false,
      isStopped = false,
    },
    ref
  ) => {
    const [currentTime, setCurrentTime] = useState("0:00.00");

    // Truncate article names to max characters with ellipsis
    const truncateArticleName = (name: string, maxLength: number = 25): string => {
      const cleanName = name.replace(/_/g, " ");
      if (cleanName.length <= maxLength) return cleanName;
      return cleanName.substring(0, maxLength) + "...";
    };

    // Determine timer color class
    const getTimerClass = () => {
      if (isStopped) return "timer-stopped";
      if (!isRunning || currentTime === "0:00.00") return "timer-idle";
      return "timer-running";
    };
    const [segments, setSegments] = useState<Segment[]>([]);
    const segmentTimesRef = useRef<number[]>([]); // Store times in centiseconds
    const MAX_SEGMENTS = 8; // Show 8 segments max (7 articles + End)
    const previousSegment = segments[segments.length - 1];
    const previousDiffText =
      previousSegment && previousSegment.timeDiff
        ? previousSegment.timeDiff
        : "-";
    const previousDiffClass =
      previousSegment && previousSegment.isAhead !== null
        ? previousSegment.isAhead
          ? "ahead"
          : "behind"
        : "";

    // Convert centiseconds to formatted time string
    const formatTime = (centiseconds: number): string => {
      const hours = Math.floor(centiseconds / 360000);
      const minutes = Math.floor((centiseconds % 360000) / 6000);
      const seconds = Math.floor((centiseconds % 6000) / 100);
      const c = centiseconds % 100;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}.${c.toString().padStart(2, "0")}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, "0")}.${c
          .toString()
          .padStart(2, "0")}`;
      }
    };

    // Convert time string to centiseconds
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(":");
      if (parts.length === 2) {
        const minutes = parseInt(parts[0]);
        const [secs, centis] = parts[1].split(".");
        const seconds = parseInt(secs);
        return minutes * 6000 + seconds * 100 + parseInt(centis);
      } else {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const [secs, centis] = parts[2].split(".");
        const seconds = parseInt(secs);
        return (
          hours * 360000 + minutes * 6000 + seconds * 100 + parseInt(centis)
        );
      }
    };

    // Format time difference (in centiseconds)
    const formatTimeDiff = (
      diffCentis: number
    ): { text: string; isAhead: boolean } => {
      const totalSeconds = diffCentis / 100;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toFixed(1);

      const isAhead = totalSeconds < 60; // Green if under 1 minute, red otherwise

      if (minutes > 0) {
        return { text: `+${minutes}:${seconds.padStart(4, "0")}`, isAhead };
      } else {
        return { text: `+${seconds}`, isAhead };
      }
    };

    // Expose addSegment method via ref
    useImperativeHandle(ref, () => ({
      addSegment: (articleName: string) => {
        const currentTimeCentis = parseTime(currentTime);
        const prevTime =
          segmentTimesRef.current.length > 0
            ? segmentTimesRef.current[segmentTimesRef.current.length - 1]
            : 0;

        const timeDiff = currentTimeCentis - prevTime;
        const { text: diffText, isAhead } = formatTimeDiff(timeDiff);

        segmentTimesRef.current.push(currentTimeCentis);

        setSegments((prev) => {
          const newSegments = [...prev];
          // Remove current marker from previous segment
          newSegments.forEach((s) => (s.isCurrent = false));

          // Add new segment
          newSegments.push({
            name: articleName.replace(/_/g, " "),
            timeDiff: diffText,
            cumulativeTime: formatTime(currentTimeCentis),
            isCurrent: true,
            isAhead: isAhead ? true : false,
          });

          // Keep only MAX_SEGMENTS - 1 (reserve last for End)
          if (newSegments.length > MAX_SEGMENTS - 1) {
            return newSegments.slice(-(MAX_SEGMENTS - 1));
          }

          return newSegments;
        });
      },
      getCurrentTime: () => currentTime,
      getSegmentsCount: () => segments.length,
      getSegments: () =>
        segments.map((s) => ({
          name: s.name,
          time: s.cumulativeTime,
          timeDiff: s.timeDiff,
        })),
    }));

    useEffect(() => {
      // Only run timer when isRunning is true and not stopped
      if (!isRunning || isStopped) return;

      // Timer starts at 0:00.00 and increments
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          let parts = prev.split(":");
          let hours = 0;
          let minutes, seconds;

          if (parts.length === 2) {
            // Format: "M:SS.CC"
            minutes = parseInt(parts[0]);
            const [secs, centis] = parts[1].split(".");
            seconds = parseInt(secs);
            let totalCentis = minutes * 6000 + seconds * 100 + parseInt(centis);
            totalCentis += 1;
            hours = Math.floor(totalCentis / 360000);
            minutes = Math.floor((totalCentis % 360000) / 6000);
            seconds = Math.floor((totalCentis % 6000) / 100);
            const c = totalCentis % 100;

            if (hours > 0) {
              return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}.${c.toString().padStart(2, "0")}`;
            } else {
              return `${minutes}:${seconds.toString().padStart(2, "0")}.${c
                .toString()
                .padStart(2, "0")}`;
            }
          } else {
            // Format: "H:MM:SS.CC"
            hours = parseInt(parts[0]);
            minutes = parseInt(parts[1]);
            const [secs, centis] = parts[2].split(".");
            seconds = parseInt(secs);
            let totalCentis =
              hours * 360000 +
              minutes * 6000 +
              seconds * 100 +
              parseInt(centis);
            totalCentis += 1;
            hours = Math.floor(totalCentis / 360000);
            minutes = Math.floor((totalCentis % 360000) / 6000);
            seconds = Math.floor((totalCentis % 6000) / 100);
            const c = totalCentis % 100;

            if (hours > 0) {
              return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
                .toString()
                .padStart(2, "0")}.${c.toString().padStart(2, "0")}`;
            } else {
              return `${minutes}:${seconds.toString().padStart(2, "0")}.${c
                .toString()
                .padStart(2, "0")}`;
            }
          }
        });
      }, 10);
      return () => clearInterval(interval);
    }, [isRunning, isStopped]);

    return (
      <div className={`speedrun-widget ${isMultiplayer ? 'multiplayer-mode' : ''}`}>
        <div className="speedrun-header">
          <div className="game-title">
            <div>{truncateArticleName(startArticle, 20)} to {truncateArticleName(endArticle, 20)}</div>
            <div className="category">{gameMode} • Random</div>
          </div>
        </div>

        <div className="segments-list">
          {/* Render filled segments */}
          {segments.map((segment, index) => (
            <div
              key={index}
              className={`segment ${segment.isCurrent ? "current-segment" : ""
                }`}
            >
              <div className="segment-name">{truncateArticleName(segment.name, 25)}</div>
              <div className="segment-times">
                {segment.timeDiff && (
                  <span
                    className={`time-diff ${segment.isAhead === true
                        ? "ahead"
                        : segment.isAhead === false
                          ? "behind"
                          : ""
                      }`}
                  >
                    {segment.timeDiff}
                  </span>
                )}
                <span className="cumulative-time">
                  {segment.cumulativeTime}
                </span>
              </div>
            </div>
          ))}

          {/* Render empty segments */}
          {Array.from({
            length: Math.max(0, MAX_SEGMENTS - segments.length - 1),
          }).map((_, index) => (
            <div key={`empty-${index}`} className="segment">
              <div className="segment-name">&nbsp;</div>
              <div className="segment-times">
                <span className="cumulative-time">-</span>
              </div>
            </div>
          ))}

          {/* Always show End segment */}
          <div className="segment">
            <div className="segment-name">End</div>
            <div className="segment-times">
              <span className="cumulative-time">-</span>
            </div>
          </div>
        </div>

        <div className={`current-time-display ${getTimerClass()}`}>
          {currentTime.slice(0, -2)}
          <span className="timer-centiseconds">{currentTime.slice(-2)}</span>
        </div>

        <div className="speedrun-stats">
          <div className="stat">
            <span className="stat-label">Previous Segment:</span>
            <span className={`stat-value ${previousDiffClass || ""}`}>
              {previousDiffText}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Best Possible Time:</span>
            <span className="stat-value">-</span>
          </div>
        </div>
      </div>
    );
  }
);

SpeedrunWidget.displayName = "SpeedrunWidget";

export default SpeedrunWidget;
