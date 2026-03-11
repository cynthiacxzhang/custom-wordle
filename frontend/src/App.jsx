import { useState, useEffect, useCallback } from "react";
import { createGame, submitGuess, getHint } from "./api";
import GameSetup from "./components/GameSetup";
import GameBoard from "./components/GameBoard";
import Keyboard from "./components/Keyboard";
import "./App.css";

const STATUS_PRIORITY = { green: 3, yellow: 2, gray: 1 };

function buildLetterStates(guesses) {
  const map = new Map();
  for (const { word, feedback } of guesses) {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const next = feedback[i];
      const current = map.get(letter);
      if (!current || STATUS_PRIORITY[next] > STATUS_PRIORITY[current]) {
        map.set(letter, next);
      }
    }
  }
  return map;
}

const INITIAL_STATE = {
  gameId: null,
  wordLength: 5,
  maxGuesses: 6,
  guesses: [],
  currentInput: "",
  status: "idle",
  answer: null,
  toast: null,
  shake: false,
  bounce: false,
  hint: null,
  hintLoading: false,
};

export default function App() {
  const [state, setState] = useState(INITIAL_STATE);
  const letterStates = buildLetterStates(state.guesses);

  const showToast = (msg, type = "error") => {
    setState((s) => ({ ...s, toast: { msg, type } }));
    setTimeout(() => setState((s) => ({ ...s, toast: null })), 2000);
  };

  const triggerShake = () => {
    setState((s) => ({ ...s, shake: true }));
    setTimeout(() => setState((s) => ({ ...s, shake: false })), 600);
  };

  const handleStart = async (wordLength) => {
    try {
      const game = await createGame(wordLength);
      setState({
        ...INITIAL_STATE,
        gameId: game.game_id,
        wordLength: game.word_length,
        maxGuesses: game.max_guesses,
        status: "in_progress",
      });
    } catch {
      showToast("Failed to start game");
    }
  };

  const handleHint = async () => {
    setState((s) => ({ ...s, hintLoading: true, hint: null }));
    try {
      const data = await getHint(state.gameId);
      setState((s) => ({ ...s, hint: data.hint, hintLoading: false }));
    } catch (e) {
      setState((s) => ({ ...s, hintLoading: false }));
      showToast(e.message);
    }
  };

  const handleKey = useCallback(
    async (key) => {
      if (state.status !== "in_progress") return;

      if (key === "Backspace") {
        setState((s) => ({ ...s, currentInput: s.currentInput.slice(0, -1) }));
        return;
      }

      if (key === "Enter") {
        if (state.currentInput.length !== state.wordLength) {
          showToast(`Need ${state.wordLength} letters`);
          triggerShake();
          return;
        }
        try {
          const game = await submitGuess(state.gameId, state.currentInput);
          const won = game.status === "won";
          const lost = game.status === "lost";
          setState((s) => ({
            ...s,
            guesses: game.guesses,
            status: game.status,
            answer: game.answer,
            currentInput: "",
            hint: null,
            bounce: won,
          }));
          if (won) showToast("Brilliant!", "win");
          if (lost) showToast(`The word was ${game.answer.toUpperCase()}`, "lose");
        } catch (e) {
          showToast(e.message);
          triggerShake();
        }
        return;
      }

      if (/^[a-zA-Z]$/.test(key) && state.currentInput.length < state.wordLength) {
        setState((s) => ({ ...s, currentInput: s.currentInput + key.toLowerCase() }));
      }
    },
    [state]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleKey(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  return (
    <div className="app">
      {state.toast && (
        <div className={`toast toast--${state.toast.type}`}>{state.toast.msg}</div>
      )}

      <div className="card">
        <header className="header">
          <h1>Wordle</h1>
        </header>

        {state.status === "idle" ? (
          <GameSetup onStart={handleStart} />
        ) : (
          <div className="game">
            <p className="game-meta">
              {state.wordLength}-letter word &nbsp;·&nbsp; {state.maxGuesses} guesses
            </p>

            <GameBoard
              wordLength={state.wordLength}
              maxGuesses={state.maxGuesses}
              guesses={state.guesses}
              currentInput={state.currentInput}
              shake={state.shake}
              bounce={state.bounce}
            />

            {/* AI Hint — appears after first guess, only while in progress */}
            {state.status === "in_progress" && state.guesses.length > 0 && (
              <>
                {state.hint && (
                  <div className="hint-box">
                    <p className="hint-box-label">✦ AI Hint</p>
                    <p>{state.hint}</p>
                  </div>
                )}
                <button
                  className="hint-btn"
                  onClick={handleHint}
                  disabled={state.hintLoading}
                >
                  {state.hintLoading ? "Thinking…" : "✦ Get a hint"}
                </button>
              </>
            )}

            {state.status !== "in_progress" && (
              <div className="game-over">
                {state.status === "lost" && (
                  <p className="answer-reveal">
                    The word was
                    <strong>{state.answer?.toUpperCase()}</strong>
                  </p>
                )}
                <button className="play-again" onClick={() => setState(INITIAL_STATE)}>
                  Play Again
                </button>
              </div>
            )}

            <Keyboard letterStates={letterStates} onKey={handleKey} />
          </div>
        )}
      </div>
    </div>
  );
}
