import "./MainMenu.css";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import multiplayerIcon from "../assets/two-players-joysticks-multiplayer-svgrepo-com.svg";
import fightIcon from "../assets/fight-svgrepo-com(1).svg";
import { IoCalendarNumberSharp } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import { FaGithub } from "react-icons/fa";
import { SiWikipedia } from "react-icons/si";
import { IoArrowBack } from "react-icons/io5";
import { FaRandom } from "react-icons/fa";
import ArticlePreview from "../components/ArticlePreview";

interface GameResults {
  time: string;
  segments: number;
  startArticle: string;
  endArticle: string;
}

const MainMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSinglePlayer, setShowSinglePlayer] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [startArticle, setStartArticle] = useState("");
  const [endArticle, setEndArticle] = useState("");

  // Check for results data from game completion
  useEffect(() => {
    const state = location.state as { results?: GameResults } | null;
    if (state?.results) {
      setGameResults(state.results);
      setShowResults(true);
      // Clear the state so refresh doesn't show results again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSinglePlayerClick = () => {
    setShowSinglePlayer(true);
  };

  const handleBackClick = () => {
    setShowSinglePlayer(false);
    setShowResults(false);
    setGameResults(null);
  };

  const handleStartGame = () => {
    if (startArticle.trim()) {
      const endArticleParam = endArticle.trim()
        ? `&end=${encodeURIComponent(endArticle.trim())}`
        : "";
      navigate(
        `/game?start=${encodeURIComponent(
          startArticle.trim()
        )}${endArticleParam}`
      );
    }
  };

  return (
    <div className="container">
      <div className="menu-header">
        <h1 className="menu-title">Wiki Runners</h1>
        <p className="menu-subtitle">
          Navigate through Wikipedia articles and compete with others to reach
          your destination.
        </p>
      </div>

      <div className="content-wrapper">
        {/* Main Menu Buttons */}
        <div
          className={`button-grid ${
            showSinglePlayer || showResults ? "hidden" : ""
          }`}
        >
          <div className="mail" onClick={handleSinglePlayerClick}>
            <i className="fa fa-play fa-3x mailIcon"></i>
            <span className="mailmail">Single Player</span>
          </div>

          <div className="calendar">
            <img
              src={multiplayerIcon}
              alt="Multiplayer"
              className="calendarIcon"
            />
            <span className="calendarDay">Multiplayer</span>
          </div>

          <div className="photos">
            <FaGithub className="photoIcon" />
            <span className="photophoto">GitHub</span>
          </div>

          <div className="skype">
            <img src={fightIcon} alt="Duel" className="skypeIcon" />
            <span className="skypeskype">Duel</span>
          </div>

          <div className="map">
            <IoCalendarNumberSharp className="mapIcon" />
            <span className="mapmap">Daily</span>
          </div>

          <div className="sports">
            <IoIosSettings className="sportsIcon" />
            <span className="sportsLabel">Settings</span>
          </div>

          <div className="help">
            <SiWikipedia className="helpIcon" />
            <span className="helphelp">Today's Article</span>
          </div>
        </div>

        {/* Single Player Options */}
        <div
          className={`single-player-options ${
            showSinglePlayer ? "visible" : ""
          }`}
        >
          <button className="back-button" onClick={handleBackClick}>
            <IoArrowBack />
            <span>Back</span>
          </button>

          <div className="options-form">
            <div className="option-group">
              <label className="option-label">Start Article</label>
              <div className="input-row">
                <input
                  type="text"
                  className="option-input"
                  placeholder="e.g., Cat"
                  value={startArticle}
                  onChange={(e) => setStartArticle(e.target.value)}
                />
                <button className="random-button">
                  <FaRandom />
                </button>
              </div>
            </div>

            <div className="option-group">
              <label className="option-label">End Article</label>
              <div className="input-row">
                <input
                  type="text"
                  className="option-input"
                  placeholder="e.g., Dog"
                  value={endArticle}
                  onChange={(e) => setEndArticle(e.target.value)}
                />
                <button className="random-button">
                  <FaRandom />
                </button>
              </div>
            </div>

            <button className="start-game-button" onClick={handleStartGame}>
              Start Game
            </button>
          </div>
        </div>

        {/* Game Results */}
        <div className={`results-panel ${showResults ? "visible" : ""}`}>
          <button className="back-button" onClick={handleBackClick}>
            <IoArrowBack />
            <span>Back</span>
          </button>

          {gameResults && (
            <div className="stats-container">
              <div className="stat-row">
                <span className="stat-label-result">Final Time</span>
                <span className="stat-value-result time">
                  {gameResults.time}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label-result">Articles Visited</span>
                <span className="stat-value-result">
                  {gameResults.segments}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label-result">Start</span>
                <span className="stat-value-result article">
                  {gameResults.startArticle.replace(/_/g, " ")}
                </span>
              </div>

              <div className="stat-row">
                <span className="stat-label-result">Destination</span>
                <span className="stat-value-result article">
                  {gameResults.endArticle.replace(/_/g, " ")}
                </span>
              </div>

            </div>
          )}
        </div>
      </div>

      <div className="menu-article-preview">
        <ArticlePreview title="Cat" />
      </div>
    </div>
  );
};

export default MainMenu;
