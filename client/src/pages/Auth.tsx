import { useState } from "react";
import Navbar from "../components/Navbar";
import { FaWikipediaW } from "react-icons/fa";
import "./Auth.css";
import "../pages/Leaderboard.css";

type AuthMode = "login" | "register";

function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual auth logic
    console.log("Auth submitted:", { mode, email, password });
  };

  const handleWikipediaSignIn = () => {
    // TODO: Implement Wikipedia OAuth
    console.log("Wikipedia sign-in clicked");
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    console.log("Google sign-in clicked");
  };

  const isLogin = mode === "login";
  const title = isLogin ? "Sign In" : "Create Your Account";
  const buttonText = isLogin ? "Sign In" : "Continue";

  return (
    <div className="auth-page">
      <Navbar activePage="auth" />

      {/* Main Content */}
      <main className="auth-main">
        <div className="auth-nav-spacer" />

        <div className="auth-content">
          <h1 className="auth-title">{title}</h1>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>


            <div className="auth-field">
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
              />
            </div>

            {!isLogin && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {!isLogin && (
              <div className="auth-checkbox-row">
                <input
                  type="checkbox"
                  id="terms"
                  className="auth-checkbox"
                  required
                />
                <label htmlFor="terms" className="auth-checkbox-label">
                  I agree to the{" "}
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    Privacy Policy
                  </a>
                </label>
              </div>
            )}

            <button type="submit" className="auth-submit-btn">
              {buttonText}
            </button>
          </form>

          <div className="auth-or-divider">
            <span>Or</span>
          </div>

          {/* Social Sign-In Row */}
          <div className="auth-social-row">
            <button
              type="button"
              className="auth-social-btn"
              onClick={handleGoogleSignIn}
            >
              <svg
                className="auth-social-icon"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>

            <button
              type="button"
              className="auth-social-btn auth-wikipedia-btn"
              onClick={handleWikipediaSignIn}
            >
              <FaWikipediaW className="auth-social-icon" />
              Wikipedia
            </button>
          </div>

          <div className="auth-switch">
            {isLogin ? (
              <>
                Don't have an account?{" "}
                <button
                  className="auth-switch-link"
                  onClick={() => setMode("register")}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  className="auth-switch-link"
                  onClick={() => setMode("login")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Auth;
