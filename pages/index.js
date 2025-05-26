// pages/index.js
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login"); // Redirect to login page immediately
  }, [router]);

  return null; // Nothing is rendered on screen
}
