import { useSearchParams } from "react-router-dom";
import SpeedrunWidget from "../components/SpeedrunWidget";
import WikipediaViewer from "../components/WikipediaViewer";
import Scoreboard from "../components/Scoreboard";
import "../App.css";
import "./Game.css";

const Game = () => {
  const [searchParams] = useSearchParams();
  const startArticle =
    searchParams.get("start") || "React_(JavaScript_library)";

  return (
    <div className="game-page">
      <Scoreboard />
      <SpeedrunWidget />
      <WikipediaViewer initialTitle={startArticle} hideControls={true} />
    </div>
  );
};

export default Game;
