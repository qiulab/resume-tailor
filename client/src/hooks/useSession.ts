import { useState, useEffect } from "react";

const SESSION_KEY = "rt_session_token";

function generateToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useSession(): string {
  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const newToken = generateToken();
    localStorage.setItem(SESSION_KEY, newToken);
    return newToken;
  });

  useEffect(() => {
    if (!token) {
      const newToken = generateToken();
      localStorage.setItem(SESSION_KEY, newToken);
      setToken(newToken);
    }
  }, [token]);

  return token;
}

export function getSessionToken(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const newToken = generateToken();
  localStorage.setItem(SESSION_KEY, newToken);
  return newToken;
}
