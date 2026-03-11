from dataclasses import dataclass, field
from collections import Counter


@dataclass
class Guess:
    word: str
    feedback: list[str]  # per-letter: "green" | "yellow" | "gray"


@dataclass
class GameState:
    game_id: str
    word_length: int
    max_guesses: int
    target_word: str
    guesses: list[Guess] = field(default_factory=list)
    status: str = "in_progress"  # "in_progress" | "won" | "lost"


def score_guess(guess: str, target: str) -> list[str]:
    """
    Two-pass algorithm matching NYT Wordle behavior for repeated letters.
    Pass 1: mark exact matches green, decrement available counts.
    Pass 2: mark wrong-position matches yellow using remaining counts.
    """
    result = ["gray"] * len(guess)
    available = Counter(target)

    for i, letter in enumerate(guess):
        if letter == target[i]:
            result[i] = "green"
            available[letter] -= 1

    for i, letter in enumerate(guess):
        if result[i] == "green":
            continue
        if available[letter] > 0:
            result[i] = "yellow"
            available[letter] -= 1

    return result


def apply_guess(state: GameState, word: str) -> GameState:
    feedback = score_guess(word, state.target_word)
    state.guesses.append(Guess(word=word, feedback=feedback))

    if word == state.target_word:
        state.status = "won"
    elif len(state.guesses) >= state.max_guesses:
        state.status = "lost"

    return state
