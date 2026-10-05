import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Mail,
  Sparkles,
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import { useAuth } from "./AuthContext";
import heroImage from "../../assets/hero.png";

export function LandingPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app" replace />;
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link to="/" className="brand">
          <span className="brand-mark">p</span>
          <span>
            papyr<span className="brand-period">.</span>
          </span>
        </Link>
        <div>
          <Link to="/login" className="landing-login">
            Log in
          </Link>
          <Link to="/signup" className="button button-primary">
            Create your library <ArrowRight size={15} />
          </Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <Sparkles size={13} /> A LITTLE SPACE FOR EVERY STORY
          </div>
          <h1>
            Your books.
            <br />
            Your <em>next chapter.</em>
          </h1>
          <p>
            A personal home for the editions you collect, the pages you turn,
            and everything a good book leaves behind.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="button button-primary">
              Start your library <ArrowRight size={16} />
            </Link>
            <span>Free, private, and all yours.</span>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars">
              <i>J</i>
              <i>M</i>
              <i>A</i>
            </div>
            <span>Made for the stories you keep</span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src={heroImage}
            alt="Illustration of a reader enjoying a book beside a stack of books"
          />
          <div className="hero-note">
            <span>✳</span>
            <div>
              <b>A quiet place to keep reading.</b>
              <small>One book at a time.</small>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-features">
        <article>
          <span>01</span>
          <BookOpen />
          <h2>A shelf that feels like yours</h2>
          <p>
            Keep track of the exact editions you own, want to read, or hope to
            find.
          </p>
        </article>
        <article>
          <span>02</span>
          <span className="feature-glyph">↗</span>
          <h2>Keep your reading rhythm</h2>
          <p>
            Log progress, finish a book, and keep every reread in your history.
          </p>
        </article>
        <article>
          <span>03</span>
          <span className="feature-glyph">♡</span>
          <h2>Hold on to what it meant</h2>
          <p>
            Save private ratings, reviews, and notes for the books that stay
            with you.
          </p>
        </article>
      </section>
      <footer className="landing-footer">
        <span>papyr. &nbsp; a little home for your reading life</span>
        <span>
          Book data by{" "}
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
            Open Library
          </a>
        </span>
      </footer>
    </main>
  );
}

export function AuthPage({
  mode,
}: {
  mode: "login" | "signup" | "forgot" | "reset";
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!loading && user && mode !== "reset")
    return <Navigate to="/app" replace />;
  const titles = {
    login: ["Welcome back", "Your next chapter is right where you left it."],
    signup: [
      "Make room for stories",
      "Start a personal library that feels like yours.",
    ],
    forgot: ["A little reset", "We’ll send you a secure link to get back in."],
    reset: [
      "Choose a new password",
      "Let’s get you back to your reading life.",
    ],
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (!supabase)
        throw new Error(
          "Add your Supabase URL and publishable key to .env, then restart the dev server.",
        );
      if (mode === "signup") {
        if (password !== confirm)
          throw new Error("Those passwords do not match.");
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (authError) throw authError;
        if (data.session) navigate("/app");
        else
          setMessage(
            "Check your email for a confirmation link to finish creating your account.",
          );
      } else if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        navigate((location.state as { from?: string } | null)?.from ?? "/app");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (authError) throw authError;
        setMessage(
          "If an account exists for that email, a password reset link is on its way.",
        );
      } else {
        if (password.length < 8)
          throw new Error("Use at least 8 characters for your password.");
        if (password !== confirm)
          throw new Error("Those passwords do not match.");
        const { error: authError } = await supabase.auth.updateUser({
          password,
        });
        if (authError) throw authError;
        setMessage("Password updated. You can continue to your library.");
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <Link to="/" className="brand">
        <span className="brand-mark">p</span>
        <span>
          papyr<span className="brand-period">.</span>
        </span>
      </Link>
      <section className="auth-card">
        <div className="auth-icon">
          <BookOpen size={20} />
        </div>
        <h1>{titles[mode][0]}</h1>
        <p>{titles[mode][1]}</p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Your name
              <input
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jamie Reader"
                maxLength={80}
              />
            </label>
          )}
          {(mode === "login" || mode === "signup" || mode === "forgot") && (
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          )}
          {(mode === "login" || mode === "signup" || mode === "reset") && (
            <label>
              {mode === "reset" ? "New password" : "Password"}
              <input
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </label>
          )}
          {(mode === "signup" || mode === "reset") && (
            <label>
              Confirm password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Enter it again"
              />
            </label>
          )}
          {mode === "login" && (
            <div className="form-extra">
              <span>Keep your library private.</span>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-success" role="status">
              <CheckCircle2 size={16} />
              {message}
            </p>
          )}
          <button className="button button-primary auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : mode === "signup"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Update password"}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="auth-switch">
          {mode === "login" ? (
            <>
              New to Papyr? <Link to="/signup">Create an account</Link>
            </>
          ) : mode === "signup" ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : mode === "forgot" ? (
            <Link to="/login">
              <ArrowLeft size={13} /> Back to login
            </Link>
          ) : (
            <Link to="/login">Return to login</Link>
          )}
        </div>
      </section>
      <footer className="auth-foot">
        <Mail size={13} /> Your library is yours. We’ll never share your
        personal reading data.
      </footer>
    </main>
  );
}
