import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiArrowUpRight } from "react-icons/fi";
import { IoPaperPlane } from "react-icons/io5";
import "./ProfilePopover.css";

interface ProfilePopoverProps {
    children: React.ReactNode;
    name: string;
    country?: string;
    rating?: number;
    gamesPlayed?: number;
    bestTime?: string;
    winRate?: string;
}

// Basic country name mapping
const COUNTRY_NAMES: Record<string, string> = {
    "US": "United States",
    "GB": "United Kingdom",
    "DE": "Germany",
    "CA": "Canada",
    "AU": "Australia",
    "FR": "France",
    "JP": "Japan",
    "BR": "Brazil",
    "KR": "South Korea",
    "ES": "Spain",
    "IT": "Italy",
    "NL": "Netherlands",
};

const ProfilePopover = ({
    children,
    name,
    country,
    rating,
    gamesPlayed,
    bestTime,
    winRate,
}: ProfilePopoverProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; position: "above" | "below" } | null>(null);
    const triggerRef = useRef<HTMLSpanElement>(null);
    const timeoutRef = useRef<number | null>(null);

    // Get country flag URL
    const getCountryFlagUrl = (countryCode: string) => {
        return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
    };

    // Get full country name
    const getFullCountryName = (countryCode?: string) => {
        if (!countryCode) return "Unknown Location";
        return COUNTRY_NAMES[countryCode] || countryCode;
    };

    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;

        const isBottomHalf = rect.bottom > viewportHeight / 2;
        const position = isBottomHalf ? "above" : "below";

        // Center horizontally
        const left = rect.left + scrollX + (rect.width / 2);

        // Position vertically
        let top = 0;
        if (position === "below") {
            top = rect.bottom + scrollY;
        } else {
            top = rect.top + scrollY;
        }

        setCoords({ top, left, position });
    };

    const handleMouseEnter = () => {
        // Delay showing popover to prevent flicker on fast mouse movements
        timeoutRef.current = window.setTimeout(() => {
            calculatePosition();
            setIsVisible(true);
        }, 200);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    // Hide on scroll to prevent detached popovers
    useEffect(() => {
        if (isVisible) {
            const handleScroll = () => setIsVisible(false);
            window.addEventListener("scroll", handleScroll, true);
            window.addEventListener("resize", handleScroll);
            return () => {
                window.removeEventListener("scroll", handleScroll, true);
                window.removeEventListener("resize", handleScroll);
            };
        }
    }, [isVisible]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const popoverContent = isVisible && coords ? (
        <div
            className={`profile-popover profile-popover-portal ${coords.position}`}
            style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
            }}
        >
            <div className="profile-popover-content">
                {/* Banner */}
                <div className="profile-popover-banner" />

                {/* Header with Avatar */}
                <div className="profile-popover-header">
                    <div className="profile-popover-avatar">
                        {name.charAt(0).toUpperCase()}
                    </div>
                </div>

                <div className="profile-popover-actions">
                    <button className="popover-action-btn">
                        <FiArrowUpRight className="popover-icon-arrow" /> VIEW PROFILE
                    </button>
                    <button className="popover-action-btn">
                        <IoPaperPlane /> MESSAGE
                    </button>
                </div>

                {/* User Info */}
                <div className="profile-popover-info">
                    <div className="popover-user-title">
                        <span className="profile-popover-name">
                            {name}
                        </span>
                    </div>

                    <div className="popover-location">
                        {country && (
                            <img
                                src={getCountryFlagUrl(country)}
                                alt={country}
                                className="profile-popover-flag"
                            />
                        )}
                        <span>{getFullCountryName(country)}</span>
                    </div>

                    <div className="popover-divider" />

                    <div className="profile-popover-stats-grid">
                        <div className="popover-stat-item">
                            <span className="stat-label">Joined</span>
                            <span className="stat-value">2y ago</span>
                        </div>
                        <div className="popover-stat-item">
                            <span className="stat-label">Online</span>
                            <span className="stat-value">Now</span>
                        </div>
                        {rating !== undefined && (
                            <div className="popover-stat-item">
                                <span className="stat-label">Rating</span>
                                <span className="stat-value">{rating}</span>
                            </div>
                        )}
                        {gamesPlayed !== undefined && (
                            <div className="popover-stat-item">
                                <span className="stat-label">Games</span>
                                <span className="stat-value">{gamesPlayed}</span>
                            </div>
                        )}
                        {bestTime && (
                            <div className="popover-stat-item">
                                <span className="stat-label">Best</span>
                                <span className="stat-value">{bestTime}</span>
                            </div>
                        )}
                        {winRate && (
                            <div className="popover-stat-item">
                                <span className="stat-label">Win%</span>
                                <span className="stat-value">{winRate}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <span
                className="profile-popover-trigger"
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </span>
            {popoverContent && createPortal(popoverContent, document.body)}
        </>
    );
};

export default ProfilePopover;
