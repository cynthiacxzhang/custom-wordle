export default function GameSetup({ onStart }) {
  return (
    <div className="setup">
      <p className="setup-tagline">
        Guess the hidden word.<br />
        The fewer letters, the fewer tries.
      </p>

      <div className="setup-group">
        <p className="setup-label">Choose word length to begin</p>
        <div className="length-options">
          {[5, 6, 7, 8].map((n) => (
            <button key={n} className="length-btn" onClick={() => onStart(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
