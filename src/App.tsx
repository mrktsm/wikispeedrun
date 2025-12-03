import SpeedrunWidget from "./components/SpeedrunWidget";
import WikipediaViewer from "./components/WikipediaViewer";
import Scoreboard from "./components/Scoreboard";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Scoreboard />
      <SpeedrunWidget />
      <WikipediaViewer />
    </div>
  );
}

export default App;
