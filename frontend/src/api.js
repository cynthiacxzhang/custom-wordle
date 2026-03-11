const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? "Request failed");
  return data;
}

export const createGame = (wordLength) =>
  request("/games", {
    method: "POST",
    body: JSON.stringify({ word_length: wordLength }),
  });

export const getGame = (gameId) => request(`/games/${gameId}`);

export const submitGuess = (gameId, word) =>
  request(`/games/${gameId}/guesses`, {
    method: "POST",
    body: JSON.stringify({ word }),
  });

export const getHint = (gameId) =>
  request(`/games/${gameId}/hint`, { method: "POST" });
