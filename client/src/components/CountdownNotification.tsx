import { useState, useEffect } from "react";
import "./CountdownNotification.css";

interface CountdownNotificationProps {
  secondsLeft: number;
  visible: boolean;
}

const CountdownNotification = ({ secondsLeft, visible }: CountdownNotificationProps) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (visible && secondsLeft > 0) {
      setShouldRender(true);
      setIsFadingOut(false);
    } else if (shouldRender && (!visible || secondsLeft <= 0)) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [visible, secondsLeft, shouldRender]);

  if (!shouldRender) return null;

  // Calculate stroke dasharray for circle progress
  // Radius = 16, Circumference = 2 * pi * 16 ~= 100
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const maxTime = 60; // Assuming 60s max countdown for the visual progress
  // Fill the circle as time goes down, or empty it? usually empty it.
  // 30s left out of 60s => half circle.
  const progress = Math.min(secondsLeft / maxTime, 1);
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <div className={`countdown-notification ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="countdown-circle-container">
        <svg className="countdown-svg" viewBox="0 0 40 40" width="40" height="40">
           {/* Background circle */}
          <circle
            className="countdown-circle-bg"
            stroke="#3a3a3a"
            strokeWidth="3"
            fill="transparent"
            r={radius}
            cx="20"
            cy="20"
          />
           {/* Progress circle */}
          <circle
            className="countdown-circle-fg"
            stroke="#ff4444"
            strokeWidth="3"
            fill="transparent"
            r={radius}
            cx="20"
            cy="20"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 20 20)"
          />
          <text 
            x="50%" 
            y="50%" 
            dy=".35em" 
            textAnchor="middle" 
            className="countdown-text-number"
          >
            {secondsLeft}
          </text>
        </svg>
      </div>
      <span className="notification-text">
        Time remaining to finish
      </span>
    </div>
  );
};

export default CountdownNotification;
