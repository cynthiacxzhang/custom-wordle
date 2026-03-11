"""
Run once to generate words_by_length.json from /usr/share/dict/words.

Per the spec: "Answers are never plural" — the plural filter applies only
to the answers list (target words). The valid list (guess validation) keeps
all real words regardless of plurality, because the spec doesn't restrict guesses.

Usage:  python build_wordlist.py
Output: words_by_length.json
"""
import json
import re

LENGTHS = [5, 6, 7, 8]

# ENABLE (Enhanced North American Benchmark Lexicon) — standard word game dictionary,
# public domain, includes inflected forms (plurals, conjugations, etc.).
# Fallback to system dict if not present.
SOURCE = "enable1.txt"


def is_alpha_lower(word: str) -> bool:
    """Only include words that were originally lowercase (excludes proper nouns)."""
    return bool(re.fullmatch(r"[a-z]+", word))


def likely_plural(word: str) -> bool:
    """
    Heuristic to exclude obvious plurals from the answer pool.
    Keeps words that naturally end in 's' but aren't plurals
    (e.g. 'glass', 'focus', 'virus', 'basis', 'bonus').
    """
    if not word.endswith("s"):
        return False
    # Second-to-last letter signals a non-plural 's' ending
    if len(word) >= 3 and word[-2] in "suioaelnr":
        return False
    return True


def build():
    try:
        from wordfreq import top_n_list
        common = set(top_n_list("en", 50000))
    except ImportError:
        print("wordfreq not installed — answers will equal valid words")
        common = None

    with open(SOURCE) as f:
        raw_lines = [line.strip() for line in f]

    # ENABLE is already all-lowercase with no proper nouns
    all_words = {w for w in raw_lines if is_alpha_lower(w)}

    result = {}
    for length in LENGTHS:
        valid = sorted(w for w in all_words if len(w) == length)

        # Answers: common words only, no plurals
        answers = [
            w for w in valid
            if not likely_plural(w) and (common is None or w in common)
        ]

        result[str(length)] = {"valid": valid, "answers": answers}
        print(f"  {length}-letter: {len(valid)} valid, {len(answers)} answers")

    with open("words_by_length.json", "w") as f:
        json.dump(result, f)
    print("Written: words_by_length.json")


if __name__ == "__main__":
    build()
