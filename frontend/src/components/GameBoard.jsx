import Tile from "./Tile";

const FEEDBACK_TO_STATUS = { green: "green", yellow: "yellow", gray: "gray" };

export default function GameBoard({ wordLength, maxGuesses, guesses, currentInput, shake, bounce }) {
  const rows = [];

  for (const guess of guesses) {
    rows.push({
      tiles: guess.word.split("").map((letter, i) => ({
        letter,
        status: FEEDBACK_TO_STATUS[guess.feedback[i]],
        reveal: true,
      })),
      submitted: true,
    });
  }

  if (guesses.length < maxGuesses) {
    rows.push({
      tiles: Array.from({ length: wordLength }, (_, i) => ({
        letter: currentInput[i] ?? "",
        status: currentInput[i] ? "tbd" : "empty",
        reveal: false,
      })),
      submitted: false,
      isCurrent: true,
    });
  }

  while (rows.length < maxGuesses) {
    rows.push({
      tiles: Array.from({ length: wordLength }, () => ({ letter: "", status: "empty", reveal: false })),
      submitted: false,
    });
  }

  // The last submitted row is the winning row (bounce target)
  const winRowIndex = bounce ? guesses.length - 1 : -1;

  return (
    <div className="board" style={{ "--word-length": wordLength }}>
      {rows.map((row, r) => {
        const isCurrentRow = row.isCurrent;
        const isWinRow = r === winRowIndex;
        return (
          <div key={r} className={`row${isCurrentRow && shake ? " row--shake" : ""}`}>
            {row.tiles.map((tile, c) => (
              <Tile
                key={c}
                letter={tile.letter}
                status={tile.status}
                reveal={tile.reveal}
                index={c}
                bounce={isWinRow}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
