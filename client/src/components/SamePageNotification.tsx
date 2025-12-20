import { useState, useEffect } from "react";
import "./SamePageNotification.css";

interface SamePageNotificationProps {
  playerName: string;
  playerColor: string;
  visible: boolean;
}

const SamePageNotification = ({ playerName, playerColor, visible }: SamePageNotificationProps) => {
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

  // Get lighter color for border (mix with white)
  const getLighterColor = (color: string): string => {
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const r = parseInt(rgbMatch[0]);
      const g = parseInt(rgbMatch[1]);
      const b = parseInt(rgbMatch[2]);
      // Mix with white (70% original, 30% white) to lighten
      const lighterR = Math.min(255, Math.floor(r * 0.7 + 255 * 0.3));
      const lighterG = Math.min(255, Math.floor(g * 0.7 + 255 * 0.3));
      const lighterB = Math.min(255, Math.floor(b * 0.7 + 255 * 0.3));
      return `rgb(${lighterR}, ${lighterG}, ${lighterB})`;
    }
    return color;
  };

  // Get very light tinted color for letter (mix heavily with white but keep tint)
  const getLetterColor = (color: string): string => {
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
      const r = parseInt(rgbMatch[0]);
      const g = parseInt(rgbMatch[1]);
      const b = parseInt(rgbMatch[2]);
      // Mix with white (20% original, 80% white) to create a very light tinted version
      const lightR = Math.min(255, Math.floor(r * 0.2 + 255 * 0.8));
      const lightG = Math.min(255, Math.floor(g * 0.2 + 255 * 0.8));
      const lightB = Math.min(255, Math.floor(b * 0.2 + 255 * 0.8));
      return `rgb(${lightR}, ${lightG}, ${lightB})`;
    }
    return '#fff';
  };

  return (
    <div className={`same-page-notification ${isFadingOut ? 'fade-out' : ''}`}>
      <div 
        className="notification-avatar"
        style={{ 
          backgroundColor: playerColor,
          borderColor: '#fff',
          color: getLetterColor(playerColor)
        }}
      >
        {playerName.charAt(0).toUpperCase()}
      </div>
      <span className="notification-text">
        <span className="notification-name" style={{ color: playerColor }}>
          {playerName}
        </span>
        {" "}is on the same page
      </span>
    </div>
  );
};

export default SamePageNotification;

