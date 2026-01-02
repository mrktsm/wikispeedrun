import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import RaceLobby from "./pages/RaceLobby";
import LobbyBrowser from "./pages/LobbyBrowser";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import "./App.css";

// Define route order for determining slide direction
const routeOrder: Record<string, number> = {
  "/": 0,
  "/game": 1,
  "/leaderboard": 2,
  "/race-lobby": 1,
  "/lobby-browser": 1,
  "/profile": 2,
  "/auth": 1,
};

function getRouteIndex(pathname: string): number {
  // Handle routes with query params
  const basePath = pathname.split("?")[0];
  return routeOrder[basePath] ?? 0;
}

function AppRoutes() {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState("idle");
  const [prevLocation, setPrevLocation] = useState(location);
  const [slideDirection, setSlideDirection] = useState<"forward" | "back">(
    "forward"
  );
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (location !== displayLocation) {
      // Determine direction based on route state or route order
      const locationState = location.state as { direction?: string } | null;
      if (locationState?.direction === "back") {
        setSlideDirection("back");
      } else {
        // Compare route indices to determine direction
        const currentIndex = getRouteIndex(displayLocation.pathname);
        const nextIndex = getRouteIndex(location.pathname);
        setSlideDirection(nextIndex > currentIndex ? "forward" : "back");
      }

      setTransitionStage("exiting");
      setPrevLocation(displayLocation);
    }
  }, [location, displayLocation]);

  useEffect(() => {
    if (transitionStage === "exiting") {
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("entering");
      }, 400);
      return () => clearTimeout(timer);
    } else if (transitionStage === "entering") {
      // Clear animation class after it completes to restore fixed positioning
      const timer = setTimeout(() => {
        setTransitionStage("idle");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [transitionStage, location]);

  const exitingClass = slideDirection === "back" ? "exiting-back" : "exiting";
  const enteringClass =
    slideDirection === "back" ? "entering-back" : "entering";

  return (
    <div className="page-transition-container">
      {transitionStage === "exiting" && (
        <div className={`page-transition ${exitingClass}`}>
          <Routes location={prevLocation}>
            <Route path="/" element={<Leaderboard />} />
            <Route path="/game" element={<Game />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/race-lobby" element={<RaceLobby />} />
            <Route path="/lobby-browser" element={<LobbyBrowser />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </div>
      )}
      <div
        className={`page-transition ${transitionStage === "entering" ? enteringClass : ""
          }`}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/game" element={<Game />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/race-lobby" element={<RaceLobby />} />
          <Route path="/lobby-browser" element={<LobbyBrowser />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
