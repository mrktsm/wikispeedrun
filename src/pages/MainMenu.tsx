import "./MainMenu.css";
import multiplayerIcon from "../assets/two-players-joysticks-multiplayer-svgrepo-com.svg";
import fightIcon from "../assets/fight-svgrepo-com(1).svg";
import { IoCalendarNumberSharp } from "react-icons/io5";
import { IoIosSettings } from "react-icons/io";
import { FaGithub } from "react-icons/fa";
import { SiWikipedia } from "react-icons/si";
import ArticlePreview from "../components/ArticlePreview";
import { useNavigate } from "react-router-dom";

const MainMenu = () => {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    navigate("/game");
  };

  return (
    <div className="container">
      <div className="menu-header">
        <h1 className="menu-title">Wiki Crawlers</h1>
        <p className="menu-subtitle">
          Navigate through Wikipedia articles and compete with others to reach
          your destination.
        </p>
      </div>
      <div
        className="mail"
        onClick={handlePlayClick}
        style={{ cursor: "pointer" }}
      >
        <i className="fa fa-play fa-3x mailIcon"></i>
        <span className="mailmail">Single Player</span>
      </div>

      <div className="skype">
        <img src={fightIcon} alt="Duel" className="skypeIcon" />
        <span className="skypeskype">Duel</span>
      </div>

      <div className="map">
        <IoCalendarNumberSharp className="mapIcon" />
        <span className="mapmap">Daily</span>
      </div>

      <div className="calendar">
        <img src={multiplayerIcon} alt="Multiplayer" className="calendarIcon" />
        <span className="calendarDay">Multiplayer</span>
      </div>

      <div className="sports">
        <IoIosSettings className="sportsIcon" />
        <span className="sportsLabel">Settings</span>
      </div>

      <div className="photos">
        <FaGithub className="photoIcon" />
        <span className="photophoto">GitHub</span>
      </div>

      <div className="help">
        <SiWikipedia className="helpIcon" />
        <span className="helphelp">Today's Article</span>
      </div>

      <div className="menu-article-preview">
        <ArticlePreview title="Cat" />
      </div>
    </div>
  );
};

export default MainMenu;
