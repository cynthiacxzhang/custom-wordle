import json
import random
from pathlib import Path

_WORDS_FILE = Path(__file__).parent / "words_by_length.json"

# Loaded once at startup:
#   _answer_lists  – common words only; used for random target selection
#   _valid_sets    – full dictionary; used for O(1) guess validation
_answer_lists: dict[int, list[str]] = {}
_valid_sets: dict[int, set[str]] = {}


def load_words() -> None:
    with open(_WORDS_FILE) as f:
        raw: dict[str, dict] = json.load(f)
    for key, bucket in raw.items():
        n = int(key)
        _answer_lists[n] = bucket["answers"]
        _valid_sets[n] = set(bucket["valid"])


def is_valid_word(word: str, length: int) -> bool:
    return word in _valid_sets.get(length, set())


def get_random_word(length: int) -> str:
    return random.choice(_answer_lists[length])
