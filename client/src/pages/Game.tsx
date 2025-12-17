import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SpeedrunWidget from "../components/SpeedrunWidget";
import type {
  SpeedrunWidgetRef,
  SegmentData,
} from "../components/SpeedrunWidget";
import WikipediaViewer from "../components/WikipediaViewer";
import VictoryModal from "../components/VictoryModal";
import "../App.css";
import "./Game.css";

const Game = () => {
  const [searchParams] = useSearchParams();
  const [hudVisible, setHudVisible] = useState(false);
  const [articleLoaded, setArticleLoaded] = useState(false);
  const [routeCompleted, setRouteCompleted] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [gameStats, setGameStats] = useState<{
    finalTime: string;
    segments: SegmentData[];
  } | null>(null);
  const speedrunWidgetRef = useRef<SpeedrunWidgetRef>(null);
  const navigate = useNavigate();
  const startArticle =
    searchParams.get("start") || "React_(JavaScript_library)";
  const endArticle = searchParams.get("end") || "End Article";

  // Show HUD immediately and track article loading
  useEffect(() => {
    setHudVisible(true);
    setArticleLoaded(false);
  }, [startArticle]);

  // Always enable dark mode for Wikipedia content
  useEffect(() => {
    document.documentElement.classList.add("wiki-dark-mode");
    return () => {
      document.documentElement.classList.remove("wiki-dark-mode");
    };
  }, []);

  // Show victory modal when route is completed
  useEffect(() => {
    if (routeCompleted && speedrunWidgetRef.current) {
      const finalTime = speedrunWidgetRef.current.getCurrentTime();
      const segments = speedrunWidgetRef.current.getSegments();

      // Small delay before showing modal for dramatic effect
      const timer = setTimeout(() => {
        setGameStats({ finalTime, segments });
        setShowVictoryModal(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [routeCompleted]);

  const handleArticleNavigate = (articleName: string) => {
    if (speedrunWidgetRef.current) {
      speedrunWidgetRef.current.addSegment(articleName);
    }
  };

  const handlePlayAgain = () => {
    // Restart with same route
    window.location.reload();
  };

  const handleNewRoute = () => {
    // Go back to menu to pick new route
    navigate("/", { state: { direction: "back" } });
  };

  return (
    <div className="game-page">
      <div className="game-article-container">
        <WikipediaViewer
          initialTitle={startArticle}
          hideControls={true}
          onArticleLoaded={() => setArticleLoaded(true)}
          onArticleNavigate={(articleName) => {
            handleArticleNavigate(articleName);
          }}
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
          isRunning={articleLoaded && hudVisible}
          isStopped={routeCompleted}
        />
      </div>
      {showVictoryModal && gameStats && (
        <VictoryModal
          finalTime={gameStats.finalTime}
          segments={gameStats.segments}
          startArticle={startArticle}
          endArticle={endArticle}
          onPlayAgain={handlePlayAgain}
          onNewRoute={handleNewRoute}
        />
      )}
    </div>
  );
};

export default Game;
