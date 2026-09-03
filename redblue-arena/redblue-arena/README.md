# RedBlue Arena

A live, gamified cybersecurity assessment platform. Red Team attacks a
sandboxed OWASP Juice Shop instance, Blue Team defends it in real time, and
each candidate's performance is minted as a verifiable on-chain credential
on the Polygon Amoy testnet.

This repo is a **working scaffold**, not a finished deployed product. Every
piece described in the build prompt exists here in runnable form — schema,
proxy, contract, and Next.js pages — but you still need to (a) create your
own free-tier accounts, (b) fill in env vars, and (c) deploy each piece.
Steps below walk through exactly that, in build order.

```
redblue-arena/
├── frontend/        Next.js 14 App Router control plane (Vercel)
├── proxy/            Express interceptor + Docker Compose bundle w/ Juice Shop (Fly.io/Render)
├── contracts/        Hardhat project — CredentialNFT.sol (Polygon Amoy)
└── supabase/         schema.sql + RLS policies
```

---

## 0. Prerequisites

- Node.js 18+ and npm
- Docker (for the proxy+Juice Shop bundle)
- Accounts (all free tier): Vercel, Supabase, Fly.io (or Render), Alchemy
  or Infura (Polygon Amoy RPC)
- A fresh EOA wallet for the service wallet (do NOT reuse a personal wallet)

---

## 1. Supabase — database, auth, realtime

1. Create a project at supabase.com (free tier).
2. Open the SQL editor and run `supabase/schema.sql`, then
   `supabase/policies.sql`.
3. Grab from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only — never in frontend env)

---

## 2. Proxy + Juice Shop container (Fly.io)

```bash
cd proxy
npm install
flyctl launch --no-deploy      # creates fly.toml, pick a region near you
flyctl secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... MATCH_ID_HEADER=x-match-id
flyctl deploy
```

Fly.io fallback: if `flyctl launch` gives you trouble, use Render → "New
Web Service" → point at this `proxy/` folder with the included
`Dockerfile`; set the same env vars in Render's dashboard.

Confirm it's reachable:
```bash
curl https://<your-app>.fly.dev/
```
You should see Juice Shop's HTML come back through the proxy. Copy this
URL — it becomes `target_url` when an admin creates a match.

**Isolate this container.** It has no Supabase service-role key baked in
beyond log-writing, no minting wallet key, nothing else. Treat it as
disposable; if possible, spin up a fresh Fly machine per match
(`flyctl machine run` scripted from `/admin`, left as a TODO — see
`proxy/README.md`).

---

## 3. Smart contract (Hardhat, Polygon Amoy)

```bash
cd contracts
npm install
cp .env.example .env     # fill in AMOY_RPC_URL + SERVICE_WALLET_PRIVATE_KEY
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

Fund the service wallet first from the
[Amoy faucet](https://faucet.polygon.technology/). Save the deployed
contract address — you'll need it as `CREDENTIAL_CONTRACT_ADDRESS` in the
frontend env.

---

## 4. Frontend (Next.js, Vercel)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in every value — see comments in the file
npm run dev
```

Visit `http://localhost:3000/admin` to confirm it boots locally before
deploying.

Deploy:
```bash
npx vercel        # link the project
npx vercel env add   # add every var from .env.local.example
npx vercel --prod
```

---

## 5. Wire it together

1. On `/admin`, create a match, paste the proxy's Fly.io URL as
   `target_url`, set duration, and generate the red/blue links.
2. Open `/arena/red?token=...` and `/arena/blue?token=...` in two tabs to
   dry-run solo before a live session (Section 10, step 9 of the build
   prompt).
3. End the match from `/admin` and click "Mint Credentials" — confirm a
   `credentials` row appears with either `mint_mode = 'onchain'` (check
   the tx on Amoy PolygonScan) or `mint_mode = 'simulated'` if the RPC
   timed out.
4. Visit `/verify/<txHash>` to confirm the public verification page
   renders correctly for both modes.

---

## 6. What's stubbed vs. what's real in this scaffold

**Real / runnable as-is:**
- Full Postgres schema + RLS policies
- Express proxy: request logging to Supabase, exploit-signature detection
  (SQLi/XSS/path traversal), WAF-rule gate, input sanitization
- Docker Compose bundling Juice Shop + proxy on one internal network
- ERC-721 `CredentialNFT` contract + Hardhat deploy script
- Next.js page skeletons for all four routes, Supabase client (browser +
  server), Realtime subscription wiring for the scoreboard

**Left as TODOs (marked `// TODO` in-file) — genuinely project-specific,
better done with your own design/business-logic calls:**
- Full admin UI polish (dark cyberpunk theme tokens are in
  `frontend/tailwind.config.js`, but layouts are intentionally minimal)
- CTF flag-panel UX and flag-storage table (not in the original schema —
  decide if flags live in `http_logs.attack_category` matches or a new
  table)
- Per-match Fly.io machine provisioning automation
- nft.storage / nft metadata pinning wiring (currently metadata JSON is
  written to Supabase Storage as a placeholder)

Hand this repo + the "What's stubbed" list to Claude Code
(`claude` in this folder) to fill in the remaining TODOs iteratively —
that's a better fit than a single one-shot generation for the
UI-polish and per-match provisioning pieces.
