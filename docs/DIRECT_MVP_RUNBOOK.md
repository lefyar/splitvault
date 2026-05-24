# SplitVault DIRECT MVP Runbook

This runbook covers the current hosted/testnet-ready MVP:

- Celo Sepolia
- MockcUSD for test funding
- DIRECT merchant payout
- Supabase metadata
- Bridge/Card disabled

## Deployed Celo Sepolia Contracts

```text
MockcUSD:      0xBFa30e9f862776349b881875027990223bf122bD
VaultFactory:  0x72Ea74291A0354E4385ed5Cb2a0ad3B33634F26a
Chain ID:      11142220
RPC:           https://forno.celo-sepolia.celo-testnet.org
```

## Required Environment

Use `.env.example` as the template. For this MVP you only need to fill:

```bash
DEPLOYER_PRIVATE_KEY=
RELAYER_PRIVATE_KEY=
SUPABASE_URL=
SUPABASE_DB_URL=
SUPABASE_SERVICE_KEY=
```

Never expose `SUPABASE_SERVICE_KEY` in any `VITE_` variable.

## Supabase Setup

Run the SQL in:

```text
docs/supabase-schema.sql
```

Use the Supabase SQL Editor and paste the file contents, not the file path.

## Local Verification

Start services:

```bash
cd packages/relayer
npm run dev
```

```bash
cd packages/miniapp
npm run dev
```

Open:

```text
http://localhost:5173
```

Flow:

1. Connect wallet.
2. Confirm wallet is on Celo Sepolia.
3. Click `Mint Test cUSD`.
4. Create a DIRECT vault.
5. Use a merchant wallet you control.
6. Keep the default billing day to test payout immediately.
7. Fund every member share.
8. Click `Run Upkeep`.
9. Confirm:
   - merchant MockcUSD balance increases
   - vault history shows `Payment executed`
   - Blockscout tx links open correctly

## Hosting MVP

Yes, this MVP can be hosted.

Recommended setup:

- Frontend: Vercel, Netlify, or Cloudflare Pages
- Relayer: Railway, Render, Fly.io, or a small VPS
- Database: Supabase

Frontend environment variables:

```bash
VITE_CELO_CHAIN_ID=11142220
VITE_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
VITE_CUSD_ADDRESS=0xBFa30e9f862776349b881875027990223bf122bD
VITE_VAULT_FACTORY_ADDRESS=0x72Ea74291A0354E4385ed5Cb2a0ad3B33634F26a
VITE_RELAYER_BASE_URL=https://splitvault-relayer-production.up.railway.app
VITE_ENABLE_BRIDGE_CARD=false
```

Relayer environment variables:

```bash
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ENABLE_BRIDGE_CARD=false
```

Current hosted relayer:

```text
https://splitvault-relayer-production.up.railway.app
```

Health check:

```text
https://splitvault-relayer-production.up.railway.app/healthz
```

Build commands:

```bash
cd packages/miniapp
npm run build
```

```bash
cd packages/relayer
npm run build
npm start
```

## Pre-Bridge/Card Gate

Do not start Bridge/Card until these are stable:

- DIRECT create/fund/payout works from hosted frontend.
- Supabase metadata saves reliably.
- History shows funding and payout events.
- Contract tests pass.
- Relayer is deployed with HTTPS.
- No service role keys are exposed client-side.
