import { useState, useEffect } from "react";
import "./SamePageNotification.css"; // Reuse existing styles

export type NotificationType = "same-page" | "finish";

interface GameNotificationProps {
    playerName: string;
    playerColor: string;
    type: NotificationType;
    visible: boolean;
}

const GameNotification = ({ playerName, playerColor, type, visible }: GameNotificationProps) => {
    const [shouldRender, setShouldRender] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            setIsFadingOut(false);
            // Start fade-out after 2.7 seconds
            const fadeOutTimer = setTimeout(() => {
                setIsFadingOut(true);
            }, 2700);
            // Unmount after fade-out completes (2.7s + 0.3s = 3s)
            const unmountTimer = setTimeout(() => {
                setShouldRender(false);
            }, 3000);
            return () => {
                clearTimeout(fadeOutTimer);
                clearTimeout(unmountTimer);
            };
        } else {
            setShouldRender(false);
            setIsFadingOut(false);
        }
    }, [visible]);

    if (!shouldRender) return null;

    return (
        <div className={`same-page-notification ${isFadingOut ? 'fade-out' : ''}`}>
            <div className="notification-avatar">
                {playerName.charAt(0).toUpperCase()}
            </div>
            <span className="notification-text">
                <span className="notification-name" style={{ color: playerColor }}>
                    {playerName}
                </span>
                {" "}
                {type === "same-page" ? "is on the same page" : "reached the target article!"}
            </span>
        </div>
    );
};

export default GameNotification;
