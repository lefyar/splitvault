# SplitVault

SplitVault is a Celo MiniPay-ready app for shared recurring cUSD payments.
Users create a vault, add members, fund their own share, and the vault pays a
verified or custom merchant wallet directly when the cycle is due.

The current version focuses on the `DIRECT` route only: on-chain cUSD/MockcUSD
funding, direct merchant wallet payout, Supabase metadata, and relayer-assisted
upkeep. Bridge/Card style routes are future work.

## Current Status

- Celo Sepolia testnet flow is working with MockcUSD.
- Custom merchant wallet flow is available.
- Merchant registry is implemented for future verified Celo mainnet merchants.
- Members can see their active share, funded amount, and remaining amount.
- Relayer upkeep can check due vaults and trigger payment/refund cycles.
- Mainnet deployment is intentionally gated until key rotation and tiny-value
  smoke settlement are complete.

## Project Structure

```text
splitvault/
├── packages/
│   ├── contracts/   # Solidity contracts and Foundry tests
│   ├── miniapp/     # React MiniPay/mobile-wallet frontend
│   ├── relayer/     # Express relayer, Supabase sync, upkeep/admin APIs
│   └── shared/      # Shared ABIs
├── docs/
│   ├── ARCHITECTURE.md        # System design and lifecycle
│   ├── OPERATIONS.md          # Testnet, merchant registry, mainnet runbook
│   ├── PROJECT_SUBMISSION.md  # Submission/product copy
│   └── supabase-schema.sql    # Supabase tables, policies, seed data
└── package.json
```

## Quick Start

Install dependencies:

```bash
npm install
```

Run contract tests:

```bash
npm run contracts:test
```

Run the relayer:

```bash
cd packages/relayer
npm run dev
```

Run the miniapp:

```bash
cd packages/miniapp
npm run dev
```

Build checks:

```bash
npm run miniapp:build
npm run relayer:build
npm run test --workspace packages/miniapp
npm run test --workspace packages/relayer
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Operations](./docs/OPERATIONS.md)
- [Project Submission](./docs/PROJECT_SUBMISSION.md)
- [Supabase Schema](./docs/supabase-schema.sql)

## Mainnet Rule

Do not deploy or run real mainnet settlement without an explicit go-ahead. Before
mainnet, rotate exposed keys, swap only a tiny amount of CELO to cUSD, deploy the
factory, add a controlled smoke-test merchant wallet, and settle a tiny cUSD vault
before onboarding real merchants.

## Next Development Notes

- Improve the disconnected-wallet landing experience. Either upgrade the current
  wallet-not-connected screen or add a dedicated landing page that explains how
  SplitVault works, why it exists, who it is for, and includes a clear call to
  action before wallet connection.
