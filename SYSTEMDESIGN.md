# System Design — Custom Wordle

## Overview

A full-stack Wordle clone with configurable word length (5–8 letters) and multi-game support. Users can start any number of independent games, enter guesses via keyboard or on-screen keys, and receive letter-by-letter color feedback per standard Wordle rules.

Stack: **FastAPI** (Python) backend · **React + Vite** frontend · **Docker** for backend dev environment.

---

## Architecture

```
Browser (React/Vite :5173)
        │
        │  HTTP/REST (fetch)
        ▼
FastAPI Server (:8000)
        │
        │  in-memory dict (no DB for assessment scope)
        ▼
   Game Store { game_id → GameState }
        │
        │  reads
        ▼
  Word List (words_by_length.json, bundled in /backend)
```

### Why No Database
For this assessment, an in-memory store keyed by UUID is appropriate. The trade-offs are documented in NOTES.md. In production: swap the store dict for SQLAlchemy + SQLite or Postgres — the service layer is isolated enough to make this a one-file change.

---

## Data Models

### GameState (server-side, Python dataclass)

```python
@dataclass
class GameState:
    game_id: str          # UUID4
    word_length: int      # 5–8
    max_guesses: int      # word_length + 1
    target_word: str      # hidden from client until game over
    guesses: list[Guess]  # ordered list of submitted guesses
    status: str           # "in_progress" | "won" | "lost"
```

### Guess (server-side)

```python
@dataclass
class Guess:
    word: str             # normalized to lowercase
    feedback: list[str]   # per-letter: "green" | "yellow" | "gray"
```

---

## API Contract

### POST `/games`
Create a new game. Backend picks a random target word of the requested length.

**Request body:**
```json
{ "word_length": 5 }   // integer, 5–8 inclusive
```

**Response 201:**
```json
{
  "game_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "word_length": 5,
  "max_guesses": 6,
  "guesses": [],
  "status": "in_progress"
}
```

**Error 422:** `word_length` outside 5–8.

---

### GET `/games/{game_id}`
Retrieve current game state. Target word is hidden unless game is over.

**Response 200:**
```json
{
  "game_id": "...",
  "word_length": 5,
  "max_guesses": 6,
  "guesses": [
    {
      "word": "crane",
      "feedback": ["gray", "green", "yellow", "gray", "gray"]
    }
  ],
  "status": "in_progress",
  "answer": null          // revealed as string when status is "won" or "lost"
}
```

**Error 404:** game not found.

---

### POST `/games/{game_id}/guesses`
Submit a guess. Server validates, scores, and updates game state.

**Request body:**
```json
{ "word": "crane" }
```

**Response 200:** same shape as GET `/games/{game_id}` (returns full updated state).

**Error 400 — invalid word:** `{ "detail": "Not a valid word" }`
**Error 400 — wrong length:** `{ "detail": "Word must be N letters" }`
**Error 400 — game over:** `{ "detail": "Game is already over" }`
**Error 404:** game not found.

---

## Coloring Algorithm

This is the most nuanced part of the system. Standard two-pass algorithm that correctly handles repeated letters:

```
function score(guess, target):
    result = ["gray"] * len(guess)
    available = Counter(target)   # letter → remaining count

    # Pass 1: exact matches (green)
    for i in range(len(guess)):
        if guess[i] == target[i]:
            result[i] = "green"
            available[guess[i]] -= 1

    # Pass 2: wrong-position matches (yellow)
    for i in range(len(guess)):
        if result[i] == "green":
            continue
        if guess[i] in available and available[guess[i]] > 0:
            result[i] = "yellow"
            available[guess[i]] -= 1

    return result
```

**Example — repeated letters:**
- Target: `ABBEY`, Guess: `ABBED`
- Pass 1: A→green, B→green, B→green, E→green, D→gray. `available = {Y:1}`
- Pass 2: no yellows (D not in remaining available)
- Result: `[green, green, green, green, gray]` ✓

---

## Word List Strategy

**File**: `backend/words_by_length.json`

```json
{
  "5": ["crane", "slate", "audio", ...],
  "6": ["carpet", "simple", ...],
  "7": ["cabinet", ...],
  "8": ["absolute", ...]
}
```

- Pre-filtered: lowercase, alpha-only, no plurals (best effort), no proper nouns.
- Source: Dwyl's `english-words` repo (public domain) or similar, filtered programmatically.
- Same list used for both: **answer selection** (random from length bucket) and **guess validation** (membership check via set).
- Word sets loaded once at server startup into a module-level dict for O(1) lookup.

---

## Backend Module Structure

```
backend/
├── main.py              # FastAPI app, route handlers
├── game.py              # GameState dataclass, game logic, scoring
├── words.py             # Word list loading, validation, random selection
├── words_by_length.json # Bundled word list
└── requirements.txt
```

Keeping it flat — no need for packages/subdirectories at assessment scale.

---

## Frontend Architecture

### Component Tree

```
App
├── GameSetup              # shown when no active game
│   └── WordLengthPicker   # radio or segmented control: 5 | 6 | 7 | 8
│
└── GameView               # shown when game is active
    ├── GameBoard           # N rows × word_length columns grid
    │   ├── GuessRow (×max_guesses)
    │   │   └── Tile (×word_length)  # letter + color state
    │   └── CurrentRow      # active input row (letters typed so far)
    │
    ├── GameMessage         # "You won!" / "Lost — the word was X" / empty
    │
    └── Keyboard
        ├── KeyRow (3 rows, standard QWERTY layout)
        │   └── Key         # colored by best known state for that letter
        └── ActionKeys      # Enter, Backspace
```

### State (App level)

```js
{
  gameId: string | null,
  wordLength: number,        // 5–8
  maxGuesses: number,        // wordLength + 1
  guesses: [                 // fetched from API, source of truth
    { word: string, feedback: string[] }
  ],
  currentInput: string,      // letters typed but not yet submitted
  status: "idle" | "in_progress" | "won" | "lost",
  answer: string | null,     // set on game over
  error: string | null,      // transient error message (invalid word, etc.)
}
```

### Derived state (computed, not stored)

```js
letterStates: Map<letter, "green"|"yellow"|"gray">
// for keyboard coloring — green wins over yellow wins over gray
```

### Keyboard Interaction

- Physical keyboard: `keydown` event listener on `window`.
  - A–Z → append to `currentInput` if `currentInput.length < wordLength`
  - Backspace → trim `currentInput`
  - Enter → submit guess
- On-screen keyboard: click handlers on `<Key>` components, same actions.
- Both paths funnel into the same `handleKey(key)` function.

### API Communication

- No library (no axios/react-query) — plain `fetch` is sufficient.
- All API calls in `App.jsx` or a single `api.js` helper module.
- Error responses from backend surfaced as transient `error` state, shown inline above keyboard, auto-cleared on next keypress.

---

## UI / Visual Design

### Game Board
- Fixed-size grid: `max_guesses` rows × `word_length` columns.
- Tiles: square, ~60px, border shown when empty/current row, filled with color when submitted.
- Color palette (matches original Wordle feel):
  - Empty: `#ffffff` border `#d3d6da`
  - Current row (typing): `#ffffff` border `#878a8c`
  - Green: `#6aaa64`
  - Yellow: `#c9b458`
  - Gray: `#787c7e`
  - Text: white on colored tiles, `#1a1a1b` on empty.

### Keyboard
- Three rows: QWERTY layout + bottom row with Backspace/Enter flanking the last letter row.
- Key colors match best known letter state (green > yellow > gray > unused).
- Wide keys for Enter and Backspace.

### Layout
- Centered column, max-width ~500px.
- Header: "WORDLE" in bold, centered.
- Board and keyboard stacked vertically with consistent spacing.
- No sidebar, no modal overlays — game over message renders inline below the board.

---

## Game Flow (end-to-end)

```
1. User lands on page → GameSetup rendered
2. User selects word length (default: 5) → clicks "Start Game"
3. Frontend: POST /games { word_length } → receives game_id, stores in state
4. GameView renders with empty board
5. User types letters (keyboard or on-screen)
6. User presses Enter:
   a. Frontend: POST /games/{id}/guesses { word: currentInput }
   b. On 400: show error, keep currentInput
   c. On 200: update guesses + status from response, clear currentInput
7. After each guess: board re-renders with new colored row, keyboard updates
8. If status === "won": show win message, disable input
9. If status === "lost": show answer reveal, disable input
10. "Play Again" button → reset to GameSetup (or new game, same length)
```

---

## Error Handling

| Scenario | Backend | Frontend |
|---|---|---|
| Invalid word_length in POST /games | 422 Unprocessable Entity | Picker UI prevents invalid values |
| Game not found | 404 + detail | "Game not found" error state |
| Guess wrong length | 400 + detail | UI prevents submission if length != wordLength |
| Guess not a valid word | 400 + detail | Show inline error message |
| Guess on finished game | 400 + detail | UI disables input when status != in_progress |
| Network failure | — | Show generic "Connection error, try again" |

---

## What's Out of Scope

- User accounts / authentication
- Persisting games across server restarts
- Multiple simultaneous users sharing state (in-memory store is not thread-safe at scale — fine for demo)
- Hard mode (must use known correct letters)
- Statistics / win streak tracking
- Animations (tile flip, etc.) — nice-to-have, added only if time permits
