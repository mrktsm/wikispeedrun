import { useState } from "react";
import Scoreboard from "./Scoreboard";
import type { Player } from "../hooks/useMultiplayer";
import { FaTrophy } from "react-icons/fa";
import "./VictoryModal.css";

interface SegmentData {
  name: string;
  time: string;
  timeDiff: string | null;
}

export interface ChatMessage {
  id: string;
  type: "system" | "chat";
  playerName?: string;
  text: string;
  timestamp: Date;
}

interface VictoryModalProps {
  finalTime: string;
  segments: SegmentData[];
  startArticle: string;
  endArticle: string;
  players: Player[];
  messages: ChatMessage[];
  currentPlayerClicks: number;
  onPlayAgain: () => void;
  onNewRoute: () => void;
  onSendMessage: (text: string) => void;
  currentPlayerName: string;
}

const VictoryModal = ({
  finalTime,
  segments,
  startArticle,
  endArticle,
  players,
  messages,
  currentPlayerClicks,
  onPlayAgain,
  onNewRoute,
  onSendMessage,
  currentPlayerName,
}: VictoryModalProps) => {
  const [chatInput, setChatInput] = useState("");
  const initialPlayerId = players.find(p => p.name === currentPlayerName)?.id || players[0]?.id || null;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(initialPlayerId);

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const isMeSelected = selectedPlayer?.name === currentPlayerName;

  const clickCount = isMeSelected ? segments.length : (selectedPlayer?.clicks || 0);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput("");
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return { main: "--:--", centis: "" };
    const parts = timeStr.split(":");
    if (parts.length === 2) {
      const mins = parts[0].padStart(2, "0");
      const rest = parts[1];
      return { main: `${mins}:${rest.slice(0, 2)}`, centis: rest.slice(3) };
    }
    return { main: timeStr, centis: "" };
  };

  const getFinishTimeStr = (finishTimeMs: number | undefined) => {
    if (!finishTimeMs) return "--:--.--";
    const totalSeconds = finishTimeMs / 1000;
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(2);
    const [seconds, milliseconds] = secs.split('.');
    return `${mins}:${seconds.padStart(2, "0")}.${milliseconds.padEnd(2, "0")}`;
  };

  const time = isMeSelected
    ? formatTime(finalTime)
    : formatTime(getFinishTimeStr(selectedPlayer?.finishTime));

  // Calculate time per click
  const getTimePerClick = () => {
    if (clickCount === 0) return "-";
    let totalSeconds = 0;
    if (isMeSelected) {
      const parts = finalTime.split(":");
      if (parts.length === 2) {
        totalSeconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
      }
    } else if (selectedPlayer?.finishTime) {
      totalSeconds = selectedPlayer.finishTime / 1000;
    }

    if (totalSeconds === 0) return "-";
    const avg = totalSeconds / clickCount;
    return `${avg.toFixed(1)}s`;
  };

  const maxVisiblePathRows = 10;

  // Use segments for "me", and path for others
  const currentPlayerPath = isMeSelected
    ? segments
    : (selectedPlayer?.path || []).map(name => ({ name, time: "-", timeDiff: null }));

  const placeholders =
    currentPlayerPath.length < maxVisiblePathRows
      ? Array.from(
        { length: maxVisiblePathRows - currentPlayerPath.length },
        () => ({ name: "-", time: "-", timeDiff: null as string | null })
      )
      : [];
  const displaySegments =
    currentPlayerPath.length < maxVisiblePathRows
      ? [...currentPlayerPath, ...placeholders]
      : currentPlayerPath;


  return (
    <div className="victory-overlay" onClick={onNewRoute}>
      <div className="victory-banner-row" onClick={(e) => e.stopPropagation()}>
        <div className="victory-status-banner is-me">
          <div className="victory-status-left">
            <FaTrophy className="victory-status-icon" />
            <span className="victory-status-text">You Won This Match!</span>
          </div>
          <div className="victory-status-right">
            <span className="victory-status-meta">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="victory-status-separator">|</span>
            <span className="victory-status-meta">
              Best Possible: <span className="victory-meta-value">1:02.45</span>
            </span>
          </div>
        </div>
      </div>

      <div className="victory-container" onClick={(e) => e.stopPropagation()}>

        <div className="victory-left-column">
          <div className="victory-modal">
            {/* Header - route as title */}
            <div className="victory-header">
              <span className="victory-header-title">
                {startArticle.replace(/_/g, " ")} to {endArticle.replace(/_/g, " ")}
                {isMeSelected ? <span className="me-label"> (You)</span> : <span className="me-label"> ({selectedPlayer?.name || 'Player'})</span>}
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
                  <div className="victory-stat-number">{isMeSelected ? (segments.length > 0 ? segments.length + 1 : 1) : (selectedPlayer?.path.length || 0)}</div>
                  <div className="victory-stat-name">Articles</div>
                </div>
              </div>
            </div>

            {/* Path taken */}
            {currentPlayerPath.length > 0 && (
              <div className="victory-path-section">
                <div className="victory-path-header">
                  {isMeSelected ? 'YOUR PATH' : `${selectedPlayer?.name?.toUpperCase() || 'PLAYER'}'S PATH`}
                </div>
                <div className="victory-path-list">
                  {displaySegments.map((seg, index) => (
                    <div key={index} className="victory-path-item">
                      <span className="victory-path-name">{seg.name}</span>
                      <span className="victory-path-times">
                        {seg.timeDiff && (
                          <span
                            className={`victory-path-diff ${seg.timeDiff.startsWith("+") ? "behind" : "ahead"
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

        {/* Sidebar */}
        <div className="victory-sidebar">
          <Scoreboard
            players={players}
            currentPlayerClicks={currentPlayerClicks}
            maxSlots={6}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
            currentPlayerName={currentPlayerName}
          />

          <div className="victory-chat">
            <div className="victory-chat-header scoreboard-header">
              <div className="scoreboard-title">
                <div className="title-row">
                  <span>Chat</span>
                </div>
              </div>
            </div>
            <div className="victory-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`victory-chat-message ${msg.type}`}>
                  {msg.type === "chat" && <span className="victory-chat-player">{msg.playerName}: </span>}
                  <span className="victory-chat-text">{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="victory-chat-input-row">
              <input
                type="text"
                className="victory-chat-input"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="victory-bottom-spacer"></div>
    </div>
  );
};

export default VictoryModal;
