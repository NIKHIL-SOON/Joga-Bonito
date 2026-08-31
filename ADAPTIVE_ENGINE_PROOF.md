# Adaptive Engine Integration — Proof of Working

**Verdict: confirmed working.** The backend genuinely delegates every difficulty
decision to the external Adaptive Engine (`https://adaptive-engine-ohnq.onrender.com`)
and does not compute or guess difficulty itself, matching the architecture
required in `masterContext.md`.

This document is a real, reproducible test run captured on **2026-08-30**, not a
description of intended behavior. Every response below is pasted verbatim from
the actual HTTP calls. The test account was deleted from MongoDB after the run;
its corresponding record still exists on the external engine's own store,
which is itself part of the proof (see Step 3/6/9).

---

## How this is verified, not just claimed

The strongest evidence in this document isn't "the app returned a number" — it's
that **three independent things agree with each other**, none of which could
have been faked by only one side of the system:

1. Our backend's response after creating a session (`difficulty: N`)
2. The *external* engine's own record for that user, queried **directly**,
   bypassing our backend entirely
3. The score our backend *submitted* to the engine, recomputed independently
   from the normalization formula in `backend/src/utils/adaptiveEngine.js`

All three matched exactly, every time, across three rounds of play.

---

## Architecture reference

| Requirement (from `masterContext.md`) | Where it's enforced |
|---|---|
| Adaptive Engine is the single source of truth for difficulty | `backend/src/utils/adaptiveEngine.js` — `getStartingDifficulty()` / `reportScore()` |
| Backend asks the engine at session start, never guesses | `backend/src/controllers/sessions.controllers.js` → `createSession()` calls `getStartingDifficulty(userId)` |
| Backend reports results after a session, never decides the next level itself | `sessions.controllers.js` → `endSession()` calls `reportScore(...)` |
| Frontend/game only executes the assigned difficulty, never computes it | Each game (`MemoryMatchGame.jsx`, `AttentionFlickerGame.jsx`, `ShoppingCartGame.jsx`, `LeafDirectionGame.jsx`, `SimonPatternGame.jsx`, `BalloonPopGame.jsx`) reads `data.difficulty` from the session-create response and maps it to its own starting level/config — no local "if score > X" logic anywhere |
| Coach analysis surfaced to the user is the engine's own text | `frontend/src/components/AdaptiveCoachNote.jsx` renders `adaptive.analysis` verbatim from the API response |

---

## Live test transcript

Demo account: `adaptive-proof@example.com`, Mongo `_id: 6a9479e17a497999cfcaa43b`
(deleted after this run).

### Step 1 — Register

```
POST /api/auth/register
{"name":"Adaptive Proof","email":"adaptive-proof@example.com","password":"password123"}

→ 201 Created
{"success":true,"message":"User registered successfully", ...}
```

### Step 2 — Login

```
POST /api/auth/login
→ 200 OK — session cookies issued
```

### Step 3 — Raw engine state, queried directly (before any gameplay)

```
GET https://adaptive-engine-ohnq.onrender.com/api/v1/adaptive/6a9479e17a497999cfcaa43b

{
    "user_id": "6a9479e17a497999cfcaa43b",
    "current_level": 1,
    "recent_scores": [],
    "average_score": 0.0,
    "trend": "new_user",
    "is_new_user": true,
    "analysis": "We'll start with an easier level and gradually adjust the challenge based on your performance.",
    "last_updated": null
}
```

Confirms this user is genuinely brand-new **on the engine's own side**, not
just in our database.

### Step 4 — Our backend creates a session (Memory Match)

```
POST /api/sessions/create   {"gameId":"memory-match"}

→ 201 Created
{
    "data": {
        "gameId": "memory-match",
        "difficulty": 1,
        "adaptive": {
            "analysis": "We'll start with an easier level and gradually adjust the challenge based on your performance.",
            "trend": "new_user",
            "isNewUser": true,
            "available": true
        }
    }
}
```

`difficulty: 1` and the `analysis` text are **byte-for-byte identical** to the
raw engine query in Step 3 — this response was not invented locally.

### Step 5 — End session #1 with a strong performance

```
POST /api/sessions/end
{"score":850,"accuracy":0.96,"timeTaken":28,"mistakes":0,"hintsUsed":0,"averageLatencyMs":450}

→ 200 OK
{
    "data": {
        "adaptive": {
            "decision": "increase",
            "currentLevel": 1,
            "nextDifficulty": 2,
            "analysis": "Great job on the high score! Let's try the next level to keep your mind sharp.",
            "trend": "stable",
            "challengeState": "too_easy",
            "available": true
        }
    }
}
```

The engine decided **`increase`**, level 1 → 2, based on a strong score. This
decision was not computed by our code — `adaptiveEngine.js` only forwards the
raw performance numbers and relays back whatever the engine returns.

### Step 6 — Raw engine state, queried directly again

```
{
    "current_level": 2,
    "recent_scores": [94],
    "average_score": 94.0,
    "trend": "stable",
    "is_new_user": false,
    "analysis": "Great job on the high score! Let's try the next level to keep your mind sharp.",
    "last_updated": "2026-08-30T18:44:26.930244+00:00"
}
```

`current_level: 2` — **persisted on the engine's own server**, independent of
our backend, with a real `last_updated` timestamp.

`recent_scores: [94]` is the normalized score our backend actually
transmitted. Memory Match's raw score of `850` was normalized against its
scoring ceiling of `900` (`backend/src/utils/adaptiveEngine.js`,
`SCORE_CEILING_BY_ID`): `round(850 / 900 × 100) = 94`. This matches exactly,
proving the normalization math is really running, not stubbed.

### Step 7 — Create session #2 (a *different* game: Attention Challenge)

```
POST /api/sessions/create   {"gameId":"attention-flow"}

→ 201 Created
{ "data": { "gameId": "attention-flow", "difficulty": 2, ... } }
```

Starts at **difficulty 2** — the level-up from Step 5 carried over into a
completely different game. This also confirms the engine tracks **one global
difficulty per user**, not per-game (its `GET` endpoint takes only a
`user_id`, no game parameter) — an accurate reflection of the real service's
contract, not an assumption.

### Step 8 — End session #2 with a struggling performance

```
POST /api/sessions/end
{"score":90,"accuracy":0.25,"timeTaken":140,"mistakes":12,"hintsUsed":0,"averageLatencyMs":6800}

→ 200 OK
{
    "data": {
        "adaptive": {
            "decision": "decrease",
            "currentLevel": 2,
            "nextDifficulty": 1,
            "analysis": "I see you had a tough time recently, so let's try an easier level to keep it fun.",
            "trend": "declining",
            "challengeState": "too_hard",
            "available": true
        }
    }
}
```

A poor performance correctly triggers **`decrease`**, level 2 → 1.

### Step 9 — Raw engine state, queried directly a third time

```
{
    "current_level": 1,
    "recent_scores": [94, 11],
    "average_score": 52.5,
    "trend": "declining",
    "analysis": "I see you had a tough time recently, so let's try an easier level to keep it fun.",
    "last_updated": "2026-08-30T18:44:58.841172+00:00"
}
```

`recent_scores` now shows both normalized scores in order: `94` (from Step 6)
and `11` (Attention Challenge's raw score `90` normalized against its ceiling
of `800`: `round(90 / 800 × 100) = 11`). Second exact match in a row.

### Step 10 — Create session #3 (a third game: Balloon Pop)

```
POST /api/sessions/create   {"gameId":"balloon-pop"}

→ 201 Created
{ "data": { "gameId": "balloon-pop", "difficulty": 1, ... } }
```

Correctly back at **difficulty 1**, matching Step 9's `current_level: 1`
exactly.

---

## Summary of what this proves

| Check | Result |
|---|---|
| New user starts at level 1 with the engine's own onboarding message | ✅ |
| Our backend's assigned difficulty always matches the engine's `current_level` at that moment | ✅ (3/3) |
| A strong score produces `increase`, persisted on the engine's server | ✅ |
| A weak score produces `decrease`, persisted on the engine's server | ✅ |
| Score normalization (`backend/src/utils/adaptiveEngine.js`) produces exactly the number the engine recorded | ✅ (2/2) |
| Difficulty carries across different games (global per-user, per the engine's real contract) | ✅ |
| Coach `analysis` text shown to the user is the engine's own wording, not scripted copy | ✅ |

## Known, accepted characteristics (not bugs)

- **Difficulty is global per user, not per-game.** This is the real external
  engine's contract (`GET /api/v1/adaptive/{user_id}` takes no game
  parameter) — not a limitation we introduced.
- **Render free-tier cold starts**: `getStartingDifficulty()` /
  `reportScore()` use an 8s timeout and fall back to level 1 /
  `decision: "maintain"` if the engine doesn't respond in time, so a cold
  engine degrades gracefully instead of blocking play.

## Reproducing this test

```bash
BASE="http://localhost:8000/api"   # match your backend's actual port
curl -s -c c.txt -H "Content-Type: application/json" \
  -d '{"name":"T","email":"t@example.com","password":"password123"}' "$BASE/auth/register"
curl -s -c c.txt -b c.txt -H "Content-Type: application/json" \
  -d '{"email":"t@example.com","password":"password123"}' "$BASE/auth/login"
curl -s -c c.txt -b c.txt -H "Content-Type: application/json" \
  -d '{"gameId":"memory-match"}' "$BASE/sessions/create"
curl -s -c c.txt -b c.txt -H "Content-Type: application/json" \
  -d '{"score":850,"accuracy":0.96,"timeTaken":28,"mistakes":0}' "$BASE/sessions/end"
# Then cross-check directly against the engine:
curl -s "https://adaptive-engine-ohnq.onrender.com/api/v1/adaptive/<mongo-user-id>"
```
