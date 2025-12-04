import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import MainMenu from "./pages/MainMenu";
import Game from "./pages/Game";
import "./App.css";

function AppRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("entering");

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage("exiting");
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === "exiting") {
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("entering");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [transitionStage, location]);

  return (
    <div className={`page-transition ${transitionStage}`}>
      <Routes location={displayLocation}>
        <Route path="/" element={<MainMenu />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
