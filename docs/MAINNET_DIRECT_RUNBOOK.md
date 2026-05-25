# SplitVault Mainnet Direct Runbook

This is the production path after the Celo Sepolia/mock-cUSD MVP:

- deploy `VaultFactory` on Celo mainnet using real cUSD
- use only `DIRECT` vaults
- pay merchants/services that can receive stablecoins to a wallet address
- call `performUpkeep(0x)` when vaults are due

SplitVault coordinates shared recurring cUSD payments. It does not own the external service account and does not cancel the merchant service for users. If a group stops using a service, members can stop funding future cycles; the group should also cancel or pause the actual service with the merchant.

## Merchant Fit

SplitVault's current contract pays a fixed cUSD amount to one wallet address. That means the best first merchants are ones that can accept direct wallet settlement or issue stablecoin invoices, not card-only subscriptions.

Good first targets:

- Creator/community memberships with a public treasury wallet.
- Agencies, software vendors, DAOs, or service providers willing to invoice in stablecoins.
- Crypto-native SaaS/tools where payment reconciliation can use the vault address, transaction hash, and service name.
- Payment gateways that expose merchant wallet settlement, hosted checkout, API invoices, subscriptions, and webhooks.

Avoid for v0.2:

- Merchants that require card rails only.
- Merchants that need fiat bank settlement before service delivery.
- Variable-amount subscriptions, usage billing, trials, prorations, and chargeback-style flows.
- Any merchant that cannot confirm the exact receiving chain/token/address.

Provider shortlist to evaluate:

| Provider | Fit | Notes |
| --- | --- | --- |
| Direct merchant wallet | Best MVP path | No provider dependency. Merchant gives a Celo address and agrees to receive cUSD. |
| QBitFlow | Possible | Markets non-custodial direct-to-wallet recurring crypto payments. Confirm supported chains/tokens before integrating. |
| ATLOS | Possible | Markets direct-to-wallet crypto payments and recurring subscriptions. Confirm whether Celo/cUSD is supported. |
| Zateway | Possible | Markets stablecoin payments direct to merchant wallet and subscription beta. Currently appears focused on USDT/USDC chains, so likely not cUSD-native. |
| MakePay | Possible | Markets wallet-settled invoices and recurring notifications. Confirm API maturity and supported networks. |
| BchainPay | Possible fallback | Developer payment intents and webhooks, but it is a gateway model rather than pure direct merchant wallet payment. |
| Stripe Bridge/Card | Later | Useful for fiat/card-style merchants, but adds KYC, provider risk, webhooks, and refund/reconciliation complexity. |

## Due-Date Calling

The current due-date mechanism is:

1. Members call `fundShare()`.
2. After `cycleDeadline`, anyone can call `VaultFactory.performUpkeep(0x)`.
3. The factory loops through vaults.
4. Fully funded due vaults call `executePayment()` and transfer cUSD to `merchantAddress`.
5. Underfunded due vaults call `refundCycle()`, return funded shares, and reset for the next cycle.

Lifecycle expectations:

- A funded due cycle pays the merchant and then waits for the relayer reset path.
- An underfunded due cycle does not pay the merchant.
- Not funding is effectively a way to skip that payment cycle, but it is not a merchant-side cancellation.
- The vault remains reusable after refund/reset unless a future contract version adds explicit vault cancellation or archival.

For mainnet, run both:

- Gelato or another automation keeper calling `performUpkeep(0x)`.
- A small fallback cron/worker calling `checkUpkeep(0x)` and then `performUpkeep(0x)` when needed.

Keep the fallback worker funded with CELO for gas. It does not custody user funds.

## Mainnet Env

Frontend:

```bash
VITE_CELO_CHAIN_ID=42220
VITE_CELO_RPC_URL=https://forno.celo.org
VITE_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
VITE_VAULT_FACTORY_ADDRESS=<mainnet VaultFactory>
VITE_RELAYER_BASE_URL=<https relayer url>
VITE_ENABLE_BRIDGE_CARD=false
```

Contracts/relayer:

```bash
CELO_RPC_URL=https://forno.celo.org
CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
FACTORY_ADDRESS=<mainnet VaultFactory>
RELAYER_ADDRESS=<relayer EOA>
ENABLE_BRIDGE_CARD=false
```

## Merchant Registry

Apply `docs/supabase-schema.sql` before using verified merchant selection. The app now calls:

```text
GET /api/merchants?chainId=<chain>&tokenAddress=<token>
```

For the direct route, add one `merchant_payment_methods` row per merchant/token where:

```text
mode = static_wallet
payout_address = <verified merchant wallet on that chain>
enabled = true
```

Example:

```sql
insert into merchant_payment_methods (
  merchant_id,
  chain_id,
  token_symbol,
  token_address,
  mode,
  payout_address,
  enabled
) values (
  'custom-direct-wallet',
  42220,
  'cUSD',
  '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  'static_wallet',
  '<merchant wallet>',
  true
);
```

Only `status = verified` merchants with enabled payment methods are returned to the miniapp. If the registry is unavailable or empty, the miniapp falls back to the custom merchant option so local testing still works.

The miniapp also keeps a custom merchant option available, but warns users that custom payout addresses are not registry-verified.

Verified merchants should be added only after confirming:

- the merchant controls the payout wallet
- the wallet is on Celo mainnet
- the merchant accepts cUSD for the intended service
- the merchant can reconcile payment from vault address, transaction hash, service name, or invoice metadata

Merchant writes can also go through the relayer:

```text
POST /api/merchants
Authorization: Bearer <MERCHANT_ADMIN_TOKEN>
```

Use this for controlled admin scripts or one-off seeding. Never expose `MERCHANT_ADMIN_TOKEN` to the frontend or any `VITE_` variable.

Admin listing:

```text
GET /api/merchants/admin
Authorization: Bearer <MERCHANT_ADMIN_TOKEN>
```

The public miniapp endpoint only returns `verified` merchants with an enabled payment method matching the active chain/token. The admin endpoint returns draft, verified, and disabled merchants plus all payment methods.

Local seed command:

```bash
cd packages/relayer
npm run admin:seed-merchant
```

Local list command:

```bash
cd packages/relayer
npm run admin:list-merchants
```

Required env vars for the seed command:

```bash
RELAYER_BASE_URL=
MERCHANT_ADMIN_TOKEN=
MERCHANT_SEED_TOKEN_ADDRESS=
MERCHANT_SEED_PAYOUT_ADDRESS=
```

To disable a merchant, POST the same merchant with:

```json
{
  "id": "merchant-id",
  "name": "Merchant Name",
  "description": "Merchant description",
  "status": "disabled"
}
```

To hide one payment method while keeping the merchant record, POST the method with `enabled: false`.

## Deploy Mainnet Factory

Before deployment:

- Rotate any key that has ever been pasted into logs, chats, screenshots, or build output.
- Use a fresh deployer wallet with only enough CELO for deployment.
- Use a relayer EOA you control, funded only for operational gas.
- Run contract tests.

Commands:

```bash
npm run contracts:test
cd packages/contracts
forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify -vvv
```

After deployment:

- Set `FACTORY_ADDRESS` and `VITE_VAULT_FACTORY_ADDRESS`.
- Redeploy relayer.
- Redeploy frontend.
- Create a tiny mainnet test vault with your own merchant wallet.
- Fund all members with a tiny amount.
- Wait until due or deploy a short-cycle test variant before real merchant use.
- Call `performUpkeep(0x)` and confirm the merchant received cUSD.

## Frontend Deployment

Vercel should build from repo root with:

```bash
npm ci
npm run build
```

Output directory:

```text
packages/miniapp/dist
```

The miniapp build was verified locally with `npm run miniapp:build`.

## Production Checks

- Hosted frontend uses `VITE_CELO_CHAIN_ID=42220`.
- `Mint Test cUSD` is hidden on mainnet.
- The selected token is real cUSD, not `MockcUSD`.
- Factory address is non-zero and points to the mainnet deployment.
- Relayer health endpoint returns `{ "ok": true }`.
- Supabase service key is only in the relayer environment, never in `VITE_` variables.
- Merchant address is confirmed by the merchant on Celo mainnet.

## Settlement Path To Mainnet

Before mainnet settlement:

- Dashboard shows connected-wallet active share, funded amount, and remaining amount.
- Member dashboard discovery is repaired for every vault in Supabase.
- `POST /api/vaults/repair` can backfill any missing metadata from chain.
- DIRECT `PaymentExecuted` events are recorded in `payment_events`.
- A keeper or cron fallback calls `performUpkeep(0x)` when `checkUpkeep(0x)` says work is due.
- Mainnet factory is deployed with real cUSD only after explicit approval.
- Mainnet merchant registry has a verified `static_wallet` cUSD method.
- First settlement uses a tiny cUSD amount and a wallet we control.

Relayer upkeep endpoints:

```bash
curl "$RELAYER_BASE_URL/api/upkeep/status" \
  -H "Authorization: Bearer $MERCHANT_ADMIN_TOKEN"
```

```bash
curl -X POST "$RELAYER_BASE_URL/api/upkeep/run" \
  -H "Authorization: Bearer $MERCHANT_ADMIN_TOKEN"
```

`/api/upkeep/run` checks `checkUpkeep(0x)` first and only sends a transaction when the factory reports that upkeep is needed. Use this as the cron fallback behind Gelato or another keeper.

Railway built-in cron fallback:

```bash
ENABLE_UPKEEP_CRON=true
UPKEEP_INTERVAL_MS=300000
```

For mainnet, the relayer refuses to broadcast upkeep unless this is also set:

```bash
ALLOW_MAINNET_UPKEEP=true
```
