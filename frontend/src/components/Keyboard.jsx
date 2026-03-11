const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["Enter", "z", "x", "c", "v", "b", "n", "m", "Backspace"],
];

export default function Keyboard({ letterStates, onKey }) {
  return (
    <div className="keyboard">
      {ROWS.map((row, r) => (
        <div key={r} className="key-row">
          {row.map((key) => {
            const status = letterStates.get(key) ?? "unused";
            const isWide = key === "Enter" || key === "Backspace";
            return (
              <button
                key={key}
                className={`key key--${status}${isWide ? " key--wide" : ""}`}
                onClick={() => onKey(key)}
                aria-label={key}
              >
                {key === "Backspace" ? "⌫" : key.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
