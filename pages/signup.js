import { useState } from "react";
import { auth } from "../src/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/router";
import styles from "./signup.module.css";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic validation
    if (!username.trim()) {
      setError("Username is required");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      router.push("/home");
    } catch (err) {
      console.error("Signup error:", err);
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists");
          break;
        case "auth/invalid-email":
          setError("Invalid email address");
          break;
        case "auth/operation-not-allowed":
          setError("Email/password accounts are not enabled");
          break;
        case "auth/weak-password":
          setError("Password is too weak");
          break;
        default:
          setError("Failed to create account. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Create an Account</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleSignup} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value.trim())}
            required
            placeholder="Your username"
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            required
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
            disabled={loading}
            minLength={6}
          />
        </div>

        <button 
          type="submit" 
          className={styles.button} 
          disabled={loading}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <Link href="/login" className={styles.link}>
        Already have an account? Log in
      </Link>
    </div>
  );
}
