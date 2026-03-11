import os
import uuid

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from game import GameState, Guess, apply_guess
from words import load_words, is_valid_word, get_random_word

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory game store: game_id -> GameState
_games: dict[str, GameState] = {}


@app.on_event("startup")
def startup():
    load_words()


# ---------- helpers ----------

def _serialize(state: GameState) -> dict:
    """Serialize game state for the client. Hide target until game is over."""
    return {
        "game_id": state.game_id,
        "word_length": state.word_length,
        "max_guesses": state.max_guesses,
        "guesses": [{"word": g.word, "feedback": g.feedback} for g in state.guesses],
        "status": state.status,
        "answer": state.target_word if state.status != "in_progress" else None,
    }


def _get_game(game_id: str) -> GameState:
    state = _games.get(game_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return state


# ---------- routes ----------

@app.get("/health")
def health():
    return {"status": "healthy"}


class CreateGameRequest(BaseModel):
    word_length: int

    @field_validator("word_length")
    @classmethod
    def validate_length(cls, v: int) -> int:
        if v < 5 or v > 8:
            raise ValueError("word_length must be between 5 and 8")
        return v


@app.post("/games", status_code=201)
def create_game(body: CreateGameRequest):
    game_id = str(uuid.uuid4())
    state = GameState(
        game_id=game_id,
        word_length=body.word_length,
        max_guesses=body.word_length + 1,
        target_word=get_random_word(body.word_length),
    )
    _games[game_id] = state
    return _serialize(state)


@app.get("/games/{game_id}")
def get_game(game_id: str):
    return _serialize(_get_game(game_id))


class GuessRequest(BaseModel):
    word: str


@app.post("/games/{game_id}/guesses")
def submit_guess(game_id: str, body: GuessRequest):
    state = _get_game(game_id)

    if state.status != "in_progress":
        raise HTTPException(status_code=400, detail="Game is already over")

    word = body.word.lower().strip()

    if len(word) != state.word_length:
        raise HTTPException(
            status_code=400, detail=f"Word must be {state.word_length} letters"
        )

    if not is_valid_word(word, state.word_length):
        raise HTTPException(status_code=400, detail="Not a valid word")

    apply_guess(state, word)
    return _serialize(state)


@app.post("/games/{game_id}/hint")
def get_hint(game_id: str):
    state = _get_game(game_id)

    if state.status != "in_progress":
        raise HTTPException(status_code=400, detail="Game is already over")
    if not state.guesses:
        raise HTTPException(status_code=400, detail="Make at least one guess first")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI hints not configured")

    guess_lines = []
    for g in state.guesses:
        symbols = " ".join(
            "🟩" if f == "green" else "🟨" if f == "yellow" else "⬜"
            for f in g.feedback
        )
        guess_lines.append(f"  {g.word.upper()}  {symbols}")

    prompt = (
        f"The player is guessing a {state.word_length}-letter English word in a Wordle game.\n\n"
        f"Guesses so far (🟩=right letter+position, 🟨=right letter+wrong position, ⬜=not in word):\n"
        + "\n".join(guess_lines)
        + "\n\nGive ONE strategic hint in 1–2 short sentences. "
        "Help them think about what they know — confirmed letters, ruled-out letters, "
        "possible positions — without revealing the answer."
    )

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=120,
        messages=[{"role": "user", "content": prompt}],
    )

    return {"hint": message.content[0].text}
