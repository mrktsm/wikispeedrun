import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaCog, FaSignInAlt, FaChevronDown, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css";

interface NavbarProps {
    activePage?: string;
    secondaryNav?: React.ReactNode;
}

const Navbar: React.FC<NavbarProps> = ({ activePage = "", secondaryNav }) => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [showPlayDropdown, setShowPlayDropdown] = useState(false);
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const playButtonRef = useRef<HTMLDivElement>(null);
    const userButtonRef = useRef<HTMLDivElement>(null);

    // Close user dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userButtonRef.current && !userButtonRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
            }
        };

        if (showUserDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserDropdown]);

    const handlePageClick = (page: string, path: string) => {
        if (page === "play") return; // Play is handled by dropdown/hover
        if (page === "donate") {
            window.open("https://github.com/sponsors/mrktsm", "_blank");
            return;
        }
        navigate(path);
    };

    return (
        <nav className="leaderboard-nav">
            <div className="leaderboard-nav-container">
                <div className="leaderboard-nav-content">
                    {/* Main Navigation Links */}
                    <div className="leaderboard-nav-left">
                        <div className="leaderboard-nav-links">
                            <button
                                className={`leaderboard-nav-button ${activePage === "home" ? "active" : ""}`}
                                onClick={() => navigate("/")}
                            >
                                HOME
                            </button>
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
                                className={`leaderboard-nav-button ${activePage === "about" ? "active" : ""}`}
                                onClick={() => handlePageClick("about", "/about")}
                            >
                                ABOUT
                            </button>
                            <button
                                className={`leaderboard-nav-button ${activePage === "community" ? "active" : ""}`}
                                onClick={() => handlePageClick("community", "/community")}
                            >
                                COMMUNITY
                            </button>
                            <button
                                className="leaderboard-nav-button gold"
                                onClick={() => handlePageClick("donate", "/donate")}
                            >
                                SUPPORT
                            </button>
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
                        {user ? (
                            <div
                                className={`play-dropdown-container user-dropdown-container ${showUserDropdown ? 'active' : ''}`}
                                ref={userButtonRef}
                                style={{ position: 'relative' }}
                            >
                                <button
                                    className="leaderboard-nav-button"
                                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                                >
                                    {user.user_metadata?.nickname || user.email}
                                    <FaChevronDown style={{
                                        marginLeft: '6px',
                                        fontSize: '10px',
                                        transform: showUserDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease'
                                    }} />
                                </button>
                                {showUserDropdown && (
                                    <div className="play-dropdown-menu" style={{ right: 0, left: 'auto' }}>
                                        <button
                                            className="play-dropdown-item"
                                            onClick={() => {
                                                navigate("/profile");
                                                setShowUserDropdown(false);
                                            }}
                                        >
                                            <FaUserCircle />
                                            Profile
                                        </button>
                                        <button
                                            className="play-dropdown-item"
                                            onClick={async () => {
                                                await signOut();
                                                navigate("/");
                                                setShowUserDropdown(false);
                                            }}
                                        >
                                            <FaSignOutAlt />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                className={`leaderboard-nav-button blue ${activePage === 'auth' ? 'active' : ''}`}
                                onClick={() => navigate("/auth")}
                            >
                                <FaSignInAlt className="leaderboard-nav-icon" />
                                Sign in
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Navigation (Tabs) */}
            {secondaryNav}
        </nav>
    );
};

export default Navbar;
