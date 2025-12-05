import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SpeedrunWidget from "../components/SpeedrunWidget";
import type { SpeedrunWidgetRef } from "../components/SpeedrunWidget";
import WikipediaViewer from "../components/WikipediaViewer";
import Scoreboard from "../components/Scoreboard";
import "../App.css";
import "./Game.css";

const Game = () => {
  const [searchParams] = useSearchParams();
  const [hudVisible, setHudVisible] = useState(false);
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const speedrunWidgetRef = useRef<SpeedrunWidgetRef>(null);
  const navigate = useNavigate();
  const startArticle =
    searchParams.get("start") || "React_(JavaScript_library)";
  const endArticle = searchParams.get("end") || "End Article";

  // Show HUD after initial page transition completes (only on first mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHudVisible(true);
    }, 500); // Wait for page transition + article to start loading
    return () => clearTimeout(timer);
  }, [startArticle]);

  // Navigate to main menu with results when route is completed
  useEffect(() => {
    if (routeCompleted && speedrunWidgetRef.current) {
      const finalTime = speedrunWidgetRef.current.getCurrentTime();
      const segmentsCount = speedrunWidgetRef.current.getSegmentsCount();

      // Delay showing overlay, then navigate back after a longer pause
      const overlayTimer = setTimeout(() => {
        setShowOverlay(true);
      }, 700); // wait ~0.7s before showing text

      const navTimer = setTimeout(() => {
        navigate("/", {
          state: {
            direction: "back",
            results: {
              time: finalTime,
              segments: segmentsCount,
              startArticle: startArticle,
              endArticle: endArticle,
            },
          },
        });
      }, 2000); // slightly longer total wait before returning

      return () => {
        clearTimeout(overlayTimer);
        clearTimeout(navTimer);
      };
    }
    // Reset overlay if routeCompleted is cleared
    setShowOverlay(false);
  }, [routeCompleted, navigate, startArticle, endArticle]);

  const handleArticleNavigate = (articleName: string) => {
    if (speedrunWidgetRef.current) {
      speedrunWidgetRef.current.addSegment(articleName);
    }
  };

  return (
    <div className="game-page">
      <div className="game-article-container">
        <WikipediaViewer
          initialTitle={startArticle}
          hideControls={true}
          onArticleNavigate={handleArticleNavigate}
          endArticle={endArticle}
          onDestinationReached={() => setRouteCompleted(true)}
        />
      </div>
      <div className={`game-hud ${hudVisible ? "visible" : ""}`}>
        {/* <Scoreboard /> */}
        <SpeedrunWidget
          ref={speedrunWidgetRef}
          gameMode="Single Player"
          endArticle={endArticle}
          isRunning={hudVisible}
          isStopped={routeCompleted}
        />
      </div>
      {showOverlay && (
        <div className="route-overlay fade-in">
          <div className="route-overlay-card">
            <div className="route-overlay-title" data-text="ROUTE COMPLETED">
              ROUTE COMPLETED
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;
