# Running Notes — Custom Wordle Assessment

## Status
- [x] Repo initialized and pushed to GitHub (custom-wordle)
- [x] README reviewed, requirements understood
- [x] Existing boilerplate reviewed (FastAPI skeleton + React/Vite skeleton)
- [ ] System design finalized
- [ ] Backend implementation
- [ ] Frontend implementation
- [ ] End-to-end smoke test

---

## Key Requirements (distilled from README)

| Requirement | Notes |
|---|---|
| Word length configurable 5–8 | User picks at game start |
| Max guesses = word_length + 1 | 5-letter → 6 guesses, 8-letter → 9 guesses |
| Multiple simultaneous games | Each game is independent, keyed by ID |
| Green/yellow/gray feedback per letter | Standard Wordle coloring, duplicate-letter aware |
| Guesses must be valid words | Need a word list / validation strategy |
| Answers never plural | Word list must be pre-filtered |
| Letters can repeat | Coloring algorithm must handle this correctly |

---

## Decisions Log

### Storage: In-Memory Dict (Python)
- **Decision**: Use a server-side in-memory dict keyed by UUID.
- **Why**: Assessment scope doesn't require persistence across restarts. No extra dependencies or Docker volume config needed. Simple to reason about, easy to review.
- **Trade-off**: Game state lost on server restart. Fine for demo/assessment.
- **Production alternative**: SQLite (already containerized) or PostgreSQL.

### Word List: Bundled Static File
- **Decision**: Bundle a `words.txt` in the backend directory, pre-filtered by length (5–8 letters), common English words only, no plurals where avoidable.
- **Why**: No external API dependency, no heavy NLP library install, deterministic, fast.
- **Source**: Will use the NLTK common words corpus or a curated public domain list (e.g. Dwyl's english-words filtered). Final call when implementing.
- **Validation**: Both answer selection and guess validation come from the same list per length bucket.

### Duplicate Letter Coloring — Algorithm Choice
Standard two-pass approach:
1. First pass: mark all exact-position matches green, decrement that letter's available count.
2. Second pass: for each non-green letter, if it exists in the target with remaining count > 0, mark yellow and decrement.
- This matches the original NYT Wordle behavior exactly.

### API Style: REST (not GraphQL, not WebSocket)
- Simple CRUD-style endpoints, matches assessment spec ("REST API").
- No real-time requirement — polling is fine since guesses are discrete actions.

### Frontend: No external UI library
- Keeping it to plain React + CSS to stay lightweight and reviewable.
- Will add Tailwind only if styling complexity warrants it — lean toward vanilla CSS first.
- No React Router needed — single-page with conditional rendering is enough.

### Game ID: UUID v4
- Server generates on POST /games.
- Frontend stores in state. No auth, no sessions needed.

---

## Open Questions / Risks

| Question | Status |
|---|---|
| Should we reveal the answer on game over? | Yes — show answer on loss. On win, optional. |
| Word list quality — are there enough 7/8 letter non-plural common words? | TBD — test during implementation |
| Docker volume for hot-reload on backend? Already in docker-compose.yml | Confirmed — volume mount `./backend:/app` exists |
| Should keyboard track per-letter state (green > yellow > gray priority)? | Yes — keyboard should reflect best known state per letter |

---

## Implementation Order (planned)
1. Backend: word list loading + random word selection per length
2. Backend: game creation endpoint
3. Backend: guess submission + coloring logic
4. Backend: game state retrieval
5. Frontend: game setup screen (word length picker)
6. Frontend: game board (grid)
7. Frontend: on-screen keyboard + physical keyboard support
8. Frontend: feedback rendering (colors)
9. Frontend: win/loss state

---

## Notes / Observations
- `docker-compose.yml` already has hot-reload via `--reload` flag on uvicorn and volume mount. No changes needed there.
- `frontend/src/App.jsx` is minimal — a clean slate essentially.
- No existing tests in either project. Won't add test infrastructure unless time permits — not in scope.
- The assessment explicitly says "Use of AI is allowed and encouraged."
