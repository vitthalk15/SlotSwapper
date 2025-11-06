# SlotSwapper – Peer‑to‑Peer Time Slot Scheduling

SlotSwapper lets users mark calendar events as swappable and exchange them with other users. It demonstrates full‑stack auth, data modeling, guarded routes, and the core swap transaction.

## Why these choices
- Frontend: React + TypeScript, shadcn/ui (Radix) for accessible UI, React Router for routing
- State: Context for auth + lightweight server state via simple refetches (ready for React Query if needed)
- Backend: Node.js/Express, clear REST endpoints, JWT auth middleware
- DB: MongoDB (Mongoose) for flexible event/swap modeling and easy ownership swap

## Project structure
```
.
├─ backend/            # Express API + MongoDB
│  ├─ src/
│  │  ├─ models/       # User, Event, SwapRequest
│  │  ├─ routes/       # auth, events, swapRequests, profiles
│  │  ├─ middleware/   # authenticateToken
│  │  └─ server.js     # App bootstrap, routes, DB connect
│  ├─ .env             # Backend env (see .env.example)
│  └─ package.json
└─ frontend/           # React + Vite app
   ├─ src/
   │  ├─ pages/        # Auth, Dashboard, Marketplace, Requests
   │  ├─ components/   # UI + layout
   │  ├─ contexts/     # AuthContext
   │  └─ lib/          # api.ts (API client), auth.ts (helpers)
   ├─ public/
   ├─ .env             # Frontend env (see .env.example)
   └─ package.json
```

---

## Setup – run locally (Windows/macOS/Linux)

Prereqs
- Node.js 18+
- MongoDB (local or Atlas)

1) Backend
```bash
cd backend
npm install
# Configure env
# Copy .env.example to .env and set MONGODB_URI + JWT_SECRET
npm run dev   # starts http://localhost:3001
```

2) Frontend
```bash
cd ../frontend
npm install
# Configure env
# Copy .env.example to .env and set VITE_API_URL=http://localhost:3001
npm run dev   # starts http://localhost:8080
```

Notes
- Local MongoDB default URI: `mongodb://localhost:27017/swap-sync`
- Atlas: use `mongodb+srv://<user>:<pass>@<cluster>/swap-sync`

---

## Environment variables

backend/.env
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/swap-sync
JWT_SECRET=change-me
NODE_ENV=development
```

frontend/.env
```
VITE_API_URL=http://localhost:3001
```

---

## API – endpoints and usage
All protected endpoints require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint            | Body                              | Response                                 |
|-------:|---------------------|-----------------------------------|------------------------------------------|
|   POST | /api/auth/signup    | { name, email, password }         | { data: { user, token } }                 |
|   POST | /api/auth/signin    | { email, password }               | { data: { user, token } }                 |
|    GET | /api/auth/me        | –                                 | { data: { user } }                        |
|   POST | /api/auth/signout   | –                                 | { message }                               |

### Events
| Method | Endpoint                 | Body                                                          | Response                     |
|-------:|--------------------------|---------------------------------------------------------------|------------------------------|
|    GET | /api/events              | –                                                             | { data: Event[] }            |
|   POST | /api/events              | { title, start_time, end_time, status? }                      | { data: Event }              |
|    PUT | /api/events/:id          | { title?, start_time?, end_time?, status? }                   | { data: Event }              |
|  DELETE| /api/events/:id          | –                                                             | { message }                  |
|    GET | /api/events/swappable    | – (current user’s swappable)                                  | { data: Event[] }            |
|    GET | /api/swappable-slots     | – (other users’ swappable)                                    | { data: Event[] }            |

Event status enum: `BUSY | SWAPPABLE | SWAP_PENDING`

### Swap requests
| Method | Endpoint                               | Body                                        | Response            |
|-------:|----------------------------------------|---------------------------------------------|---------------------|
|    GET | /api/swap-requests/incoming            | –                                           | { data: Request[] } |
|    GET | /api/swap-requests/outgoing            | –                                           | { data: Request[] } |
|   POST | /api/swap-requests                     | { requester_event_id, recipient_event_id }  | { data: Request }   |
|   POST | /api/swap-request                      | { mySlotId, theirSlotId }                   | { data: Request }   |
|    PUT | /api/swap-requests/:id/respond         | { accept: true|false }                      | { data: Request }   |
|   POST | /api/swap-response/:requestId          | { accept: true|false }                      | { data: Request }   |

- Create request: verifies ownership + both slots `SWAPPABLE`, creates `PENDING`, sets both events `SWAP_PENDING`.
- Respond accept: swaps the two events’ `user_id`, sets both to `BUSY`.
- Respond reject: sets both back to `SWAPPABLE`.

---

## Using the app – quick walkthrough
1) Sign up (Account A) and create a few events (default `BUSY`).
2) Mark one event as `SWAPPABLE` (Dashboard → “Make Swappable”).
3) Sign in as Account B (incognito/browser 2), create and mark a slot as `SWAPPABLE`.
4) Account A → Marketplace: see Account B’s swappable slot → Request Swap → pick one of A’s swappable slots in the dialog.
5) Account B → Requests → Accept. Ownership swaps, both slots become `BUSY`.

---

## Assumptions
- All timestamps are stored in UTC; the UI displays local time.
- Overlap checks are not enforced (can be added as a validation rule).
- No automatic expiration for `PENDING` requests.
- Marketplace intentionally hides your own swappable events (only others’ are shown).

## Challenges & decisions
- Swap atomicity: implemented a simple two‑document update; production can add transactions for strict atomicity.
- Consistent response shape: backend returns `{ data: … }`; the client unwraps for safety and normalizes to arrays.
- Auth race conditions: after sign‑in/up we refresh user state and then navigate.

---

## Scripts
Backend
```bash
npm run dev   # node --watch
npm start     # production start
```
Frontend
```bash
npm run dev   # vite dev server
npm run build # production build
```

## License
MIT
