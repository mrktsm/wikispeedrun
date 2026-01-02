import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaCog, FaSignInAlt } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import "./Navbar.css";

interface NavbarProps {
    activePage?: string;
    secondaryNav?: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ activePage = "leaderboard", secondaryNav }) => {
    const navigate = useNavigate();
    const [showPlayDropdown, setShowPlayDropdown] = useState(false);
    const playButtonRef = useRef<HTMLDivElement>(null);

    const handlePageClick = (page: string, path: string) => {
        if (page === "play") return; // Play is handled by dropdown/hover
        navigate(path);
    };

    return (
        <nav className="leaderboard-nav">
            <div className="leaderboard-nav-container">
                <div className="leaderboard-nav-content">
                    {/* Main Navigation Links */}
                    <div className="leaderboard-nav-left">
                        <div className="leaderboard-nav-links">
                            <div
                                className="play-dropdown-container"
                                ref={playButtonRef}
                                onMouseEnter={() => setShowPlayDropdown(true)}
                                onMouseLeave={() => setShowPlayDropdown(false)}
                            >
                                <button
                                    className={`leaderboard-nav-button ${activePage === "play" ? "active" : ""
                                        }`}
                                    onClick={() => navigate("/lobby-browser")}
                                >
                                    PLAY
                                </button>
                                {showPlayDropdown && (
                                    <div className="play-dropdown-menu">
                                        <button
                                            className="play-dropdown-item"
                                            onClick={() => {
                                                navigate("/race-lobby");
                                                setShowPlayDropdown(false);
                                            }}
                                        >
                                            Create lobby game
                                        </button>
                                        <button
                                            className="play-dropdown-item"
                                            onClick={() => {
                                                navigate("/lobby-browser");
                                                setShowPlayDropdown(false);
                                            }}
                                        >
                                            Quick game
                                        </button>
                                        <button
                                            className="play-dropdown-item"
                                            onClick={() => {
                                                // This would typically open a modal, but for now we'll just navigate
                                                navigate("/leaderboard");
                                                setShowPlayDropdown(false);
                                            }}
                                        >
                                            Solo
                                        </button>
                                        <button className="play-dropdown-item">Duel</button>
                                    </div>
                                )}
                            </div>
                            <button
                                className={`leaderboard-nav-button ${activePage === "leaderboard" ? "active" : ""
                                    }`}
                                onClick={() => handlePageClick("leaderboard", "/leaderboard")}
                            >
                                LEADERBOARD
                            </button>
                            <button className="leaderboard-nav-button gray">LEARN</button>
                            <button className="leaderboard-nav-button gray">COMMUNITY</button>
                            <button className="leaderboard-nav-button gray">TOOLS</button>
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="leaderboard-nav-links">
                        <button className="leaderboard-nav-button gray">
                            <IoSearch className="leaderboard-nav-icon" />
                        </button>
                        <button className="leaderboard-nav-button gray">
                            <FaCog className="leaderboard-nav-icon" />
                        </button>
                        <button
                            className={`leaderboard-nav-button blue ${activePage === 'auth' ? 'active' : ''}`}
                            onClick={() => navigate("/auth")}
                        >
                            <FaSignInAlt className="leaderboard-nav-icon" />
                            Sign in
                        </button>
                    </div>
                </div>
            </div>

            {/* Secondary Navigation (Tabs) */}
            {secondaryNav}
        </nav>
    );
};

export default Navbar;
