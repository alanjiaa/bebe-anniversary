import { useState } from "react";
import { auth } from "../src/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/router";
import styles from "./login.module.css";
import Link from "next/link";


export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/home");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Log In</h1>

      {error && <div className={styles.error}>{error}</div>}

      <form onSubmit={handleLogin}>
        <label className={styles.label} htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />

        <label className={styles.label} htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Your password"
        />

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <Link href="/signup" className={styles.link}>
  Don't have an account? Sign up
</Link>

    </div>
  );
}
