# SplitVault Operations

This guide combines the testnet runbook, merchant registry notes, and mainnet
readiness checklist.

## Testnet MVP

Current Celo Sepolia deployment:

```text
MockcUSD:      0xBFa30e9f862776349b881875027990223bf122bD
VaultFactory: 0x72Ea74291A0354E4385ed5Cb2a0ad3B33634F26a
Chain ID:     11142220
RPC:          https://forno.celo-sepolia.celo-testnet.org
```

Frontend env:

```bash
VITE_CELO_CHAIN_ID=11142220
VITE_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
VITE_CUSD_ADDRESS=0xBFa30e9f862776349b881875027990223bf122bD
VITE_VAULT_FACTORY_ADDRESS=0x72Ea74291A0354E4385ed5Cb2a0ad3B33634F26a
VITE_RELAYER_BASE_URL=https://splitvault-relayer-production.up.railway.app
VITE_ENABLE_BRIDGE_CARD=false
```

Relayer env:

```bash
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
MERCHANT_ADMIN_TOKEN=
RELAYER_PRIVATE_KEY=
FACTORY_ADDRESS=0x72Ea74291A0354E4385ed5Cb2a0ad3B33634F26a
CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
ENABLE_UPKEEP_CRON=false
ALLOW_MAINNET_UPKEEP=false
ENABLE_BRIDGE_CARD=false
```

Test flow:

1. Connect wallet on Celo Sepolia.
2. Mint test cUSD.
3. Create a DIRECT vault with a custom merchant wallet you control.
4. Add members.
5. Fund every member share.
6. Run upkeep after the due cycle.
7. Confirm merchant MockcUSD balance increased and history shows payment.

If the cycle is underfunded by the deadline, upkeep refunds funded members and
resets the vault for the next cycle.

## Supabase

Run:

```text
docs/supabase-schema.sql
```

The schema creates:

- `vaults`
- `vault_members`
- `payment_events`
- `payment_tokens`
- `merchants`
- `merchant_payment_methods`

Do not expose `SUPABASE_SERVICE_KEY` to frontend or any `VITE_` variable.

## Merchant Registry

Public read:

```text
GET /api/merchants?chainId=<chain>&tokenAddress=<token>
```

Admin list:

```bash
cd packages/relayer
npm run admin:list-merchants
```

Seed/update:

```bash
cd packages/relayer
npm run admin:seed-merchant
```

Required seed env:

```bash
RELAYER_BASE_URL=
MERCHANT_ADMIN_TOKEN=
MERCHANT_SEED_TOKEN_ADDRESS=
MERCHANT_SEED_PAYOUT_ADDRESS=
```

The miniapp only shows merchants that are:

- `status = verified`
- attached to an enabled payment method
- matching the active `chainId` and `tokenAddress`

A merchant row without an enabled payment method is not shown by the public
endpoint. `custom-direct-wallet` can exist as metadata while the app still uses
the local custom wallet fallback.

Before adding a production verified merchant:

- confirm the merchant controls the payout wallet
- confirm the wallet is on Celo mainnet
- confirm the merchant accepts cUSD for the service
- confirm how the merchant reconciles payment
- send a tiny cUSD test payment

## Mainnet Readiness

Mainnet frontend env:

```bash
VITE_CELO_CHAIN_ID=42220
VITE_CELO_RPC_URL=https://forno.celo.org
VITE_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
VITE_VAULT_FACTORY_ADDRESS=<mainnet VaultFactory>
VITE_RELAYER_BASE_URL=<https relayer url>
VITE_ENABLE_BRIDGE_CARD=false
```

Mainnet relayer env:

```bash
CELO_RPC_URL=https://forno.celo.org
CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
FACTORY_ADDRESS=<mainnet VaultFactory>
RELAYER_ADDRESS=<relayer EOA>
RELAYER_PRIVATE_KEY=<fresh relayer key>
ALLOW_MAINNET_UPKEEP=false
ENABLE_UPKEEP_CRON=false
ENABLE_BRIDGE_CARD=false
```

Before mainnet:

1. Rotate every key that was pasted into chats, logs, screenshots, or build output.
2. Use a fresh deployer wallet with only enough CELO for deployment.
3. Keep some CELO for gas.
4. Swap a tiny amount of CELO to cUSD for smoke testing.
5. Run all tests.
6. Deploy `VaultFactory` on Celo mainnet with real cUSD.
7. Configure Vercel/Railway env vars.
8. Add a controlled `splitvault-mainnet-smoke` merchant payment method.
9. Create a tiny `0.01` or `0.05` cUSD vault.
10. Fund all member shares.
11. Run upkeep manually.
12. Confirm merchant wallet received cUSD and events were recorded.
13. Only then enable mainnet upkeep automation.

Deploy command:

```bash
npm run contracts:test
cd packages/contracts
forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify -vvv
```

Upkeep endpoints:

```bash
curl "$RELAYER_BASE_URL/api/upkeep/status" \
  -H "Authorization: Bearer $MERCHANT_ADMIN_TOKEN"
```

```bash
curl -X POST "$RELAYER_BASE_URL/api/upkeep/run" \
  -H "Authorization: Bearer $MERCHANT_ADMIN_TOKEN"
```

`/api/upkeep/run` checks `checkUpkeep(0x)` first and only sends a transaction
when the factory reports that upkeep is needed.
