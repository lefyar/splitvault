# SplitVault — Project Architecture
> On-chain shared subscription splitting on Celo / MiniPay
> Last updated: May 2026 | Version: 0.1.1 | Toolchain: Foundry

---

## 0. TL;DR for AI Agents

SplitVault is a MiniPay Mini App + smart contract system that lets groups of people
split recurring SaaS/subscription payments using cUSD on Celo L2.
Members fund a shared vault contract; a keeper fires payment on the billing date via
one of three routes (direct on-chain, Stripe Bridge, or virtual Visa card).

**The one non-obvious thing**: the contract is trustless, but Bridge/Visa are Web2 APIs.
A thin backend relayer bridges the gap. The contract always holds funds; the relayer
is only a messenger, never a custodian.

---

## 1. Monorepo Structure

```
splitvault/
├── packages/
│   ├── contracts/          # Solidity smart contracts (Foundry)
│   │   ├── src/            # Contract source files
│   │   ├── test/           # Forge tests (.t.sol)
│   │   ├── script/         # Forge deployment scripts (.s.sol)
│   │   ├── lib/            # forge install dependencies
│   │   └── foundry.toml    # Foundry config (networks, solc version)
│   ├── relayer/            # Node.js backend — event listener + API bridge
│   ├── miniapp/            # React frontend — MiniPay Mini App
│   └── shared/             # Types, ABIs, constants shared across packages
│       └── abis/           # Exported ABIs from forge build (out/)
├── docs/
│   ├── ARCHITECTURE.md     # This file
│   ├── CONTRACTS.md        # Contract interface reference
│   ├── RELAYER.md          # Relayer setup and API reference
│   └── MINIAPP.md          # Frontend flows and component map
├── .env.example
└── package.json            # Workspace root (relayer + miniapp only; contracts use forge)
```

---

## 2. Technology Stack

| Layer          | Technology                            | Why                                                       |
|----------------|---------------------------------------|-----------------------------------------------------------|
| Blockchain     | Celo L2 (Ethereum L2)                 | Sub-cent fees, 1s finality, cUSD native stablecoin        |
| Smart Contract | Solidity 0.8.x + Foundry              | Faster tests, built-in fuzzer, forge script for deploy    |
| Automation     | Gelato Network (on-chain keeper)      | Trustless time-based execution, no cron server needed     |
| Off-ramp       | Stripe Bridge API                     | cUSD → fiat, covers all Stripe-billed SaaS merchants      |
| Virtual Card   | Bridge Card Issuing API (Visa)        | Fallback for non-Stripe merchants, works anywhere Visa is |
| Relayer        | Node.js + Viem + Express              | Thin event → API bridge; never holds funds                |
| Frontend       | React + MiniPay SDK                   | MiniPay Mini App, wallet connection, ERC-20 signing       |
| Notifications  | Web Push API (via MiniPay)            | Remind members to fund before deadline                    |
| Database       | PostgreSQL (Supabase)                 | Off-chain vault metadata, member invites, payment logs    |

---

## 3. Smart Contract Architecture

### 3.1 Contracts Overview

```
packages/contracts/
├── src/
│   ├── SubscriptionVault.sol       # Core vault (one per subscription)
│   ├── VaultFactory.sol            # Deploys new vaults, tracks all vaults
│   └── interfaces/
│       ├── ISubscriptionVault.sol
│       └── IVaultFactory.sol
├── test/
│   ├── SubscriptionVault.t.sol     # Unit tests (forge test)
│   ├── VaultFactory.t.sol          # Factory tests
│   └── fuzz/
│       └── VaultFuzz.t.sol         # Fuzz tests — random amounts, member counts, timing
├── script/
│   ├── Deploy.s.sol                # Deploy VaultFactory to Celo
│   ├── RegisterKeeper.s.sol        # Register Gelato keeper post-deploy
│   └── SeedTestVaults.s.sol        # Seed test vaults on Alfajores
├── lib/
│   ├── forge-std/                  # forge install foundry-rs/forge-std
│   └── openzeppelin-contracts/     # forge install OpenZeppelin/openzeppelin-contracts
└── foundry.toml
```

### 3.2 SubscriptionVault.sol — Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SubscriptionVault {

  // ── State ──────────────────────────────────────────────────────────────────

  address public factory;
  address public cUSD;               // Celo cUSD token address
  uint256 public monthlyAmount;      // Total subscription cost in cUSD (18 decimals)
  uint256 public billingDay;         // Day of month (1–28) to execute payment
  PaymentRoute public route;         // DIRECT | BRIDGE | CARD

  enum PaymentRoute { DIRECT, BRIDGE, CARD }

  struct Member {
    address wallet;
    uint256 sharePercent;    // e.g. 3333 = 33.33% (basis points * 100)
    uint256 shareAmount;     // Pre-calculated cUSD amount
    bool funded;
  }

  mapping(address => Member) public members;
  address[] public memberList;
  address public merchantAddress;   // Used for DIRECT route only
  string  public bridgeAccountId;   // Used for BRIDGE route (off-chain ref)
  string  public cardId;            // Used for CARD route (off-chain ref)

  uint256 public cycleDeadline;     // Unix timestamp — must fund before this
  bool    public cycleActive;
  uint256 public totalFunded;

  // ── Events ─────────────────────────────────────────────────────────────────

  event MemberFunded(address indexed member, uint256 amount, uint256 timestamp);
  event PaymentExecuted(uint256 amount, PaymentRoute route, uint256 timestamp);
  event CycleRefunded(uint256 timestamp);
  event CycleReset(uint256 nextDeadline);

  // ── Member Actions ─────────────────────────────────────────────────────────

  // Member approves cUSD allowance first, then calls this
  function fundShare() external;

  // ── Keeper-Called (Gelato) ─────────────────────────────────────────────────

  // Called by Gelato on billing date if vault is fully funded
  // For DIRECT route: transfers cUSD to merchantAddress
  // For BRIDGE/CARD: emits PaymentExecuted → relayer picks up and calls API
  function executePayment() external onlyKeeper;

  // Called by Gelato if vault is NOT fully funded 24h before deadline
  function refundCycle() external onlyKeeper;

  // Called by relayer after successful Bridge/Card payment to reset cycle
  function confirmPaymentAndReset() external onlyRelayer;

  // ── View ──────────────────────────────────────────────────────────────────

  function getFundingStatus() external view returns (
    uint256 totalFunded,
    uint256 totalRequired,
    uint256 membersCount,
    uint256 membersFunded
  );
  function isMember(address addr) external view returns (bool);
}
```

### 3.3 Key Design Decisions

**Shares as basis points**: `sharePercent` uses 1/10000 precision to avoid integer
rounding errors when splitting amounts. E.g. 33.33% = 3333.

**Pre-calculated amounts**: `shareAmount` is stored at deploy time. If price changes,
the vault must be redeployed (intentional — prevents surprise charges).

**Relayer auth**: `onlyRelayer` modifier checks a whitelisted EOA address that the
relayer signs with. This is the weakest trust assumption in the system — see
Security section for mitigations.

**No upgradeable proxy**: Vaults are intentionally not upgradeable. Deploy a new
vault if config needs to change. Simplifies security model.

### 3.4 Foundry Config (foundry.toml)

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200

[profile.ci]
fuzz = { runs = 10000 }   # More fuzz runs in CI

[rpc_endpoints]
celo       = "${CELO_RPC_URL}"
alfajores  = "${ALFAJORES_RPC_URL}"

[etherscan]
celo = { key = "${CELOSCAN_API_KEY}", url = "https://api.celoscan.io/api" }
```

### 3.5 Foundry Tooling Reference

```bash
# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std

# Run all tests
forge test -vv

# Run with Celo fork (tests real cUSD)
forge test --fork-url $CELO_RPC_URL -vvv

# Fuzz a specific test
forge test --match-test testFuzz_SplitRounding -vv

# Deploy to Alfajores testnet
forge script script/Deploy.s.sol --rpc-url alfajores --broadcast --verify

# Deploy to Celo mainnet
forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify

# Generate ABI for relayer/miniapp
forge inspect SubscriptionVault abi > ../shared/abis/SubscriptionVault.json
forge inspect VaultFactory abi > ../shared/abis/VaultFactory.json
```

### 3.6 Key Test Cases (VaultFuzz.t.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SubscriptionVault.sol";

contract VaultFuzzTest is Test {

    // Fuzz: any split combination that sums to 100% should never over/under-charge
    function testFuzz_SplitRounding(uint256[4] memory shares) public {
        // bound each share, normalize to sum = 10000 (basis points)
        // deploy vault, fund all members, assert totalFunded == monthlyAmount
    }

    // Fuzz: random billing timestamps should always trigger correctly
    function testFuzz_BillingTiming(uint256 deployTime, uint256 executeTime) public {
        // executePayment should only succeed at/after billingDay
    }

    // Fuzz: partial funding should always refund exactly what was deposited
    function testFuzz_PartialRefund(uint256 membersWhoFund) public {
        // if < all members fund, refundCycle() returns exact amounts
    }
}
```

---

## 4. Payment Routes

### 4.1 DIRECT (crypto-native merchants)

```
Vault.executePayment()
  └─ ERC-20 transfer: vault → merchantAddress
     └─ Done. Merchant receives cUSD on Celo.
```
No relayer needed. Fully trustless.

**Required at vault creation**: merchant's Celo wallet address.

### 4.2 BRIDGE (Stripe-based merchants)

```
Vault.executePayment() → emits PaymentExecuted(BRIDGE)
  └─ Relayer hears event
     └─ POST /v1/transfers → Bridge API
        └─ Bridge converts cUSD → USD
           └─ USD charges Stripe subscription (merchant sees fiat)
              └─ Relayer calls vault.confirmPaymentAndReset()
```

**Required at vault creation**:
- Treasurer's Bridge account (KYC'd)
- Merchant's Stripe subscription ID (linked at Bridge account setup)
- Pre-authorized recurring pull: Bridge needs a signed permission to pull
  cUSD from the vault on the relayer's behalf each cycle.

**The recurring pull auth problem**:
Bridge's `POST /v1/payment-methods` can register a vault address + relayer signature
as a payment source. The relayer signs a payload each cycle: `{vaultAddress, amount, cycleId}`.
Bridge verifies the signature matches the registered relayer EOA for that vault.

### 4.3 CARD (any merchant — Visa virtual card)

```
Vault.executePayment() → emits PaymentExecuted(CARD)
  └─ Relayer hears event
     └─ Bridge Card Issuing API: load balance on virtual card
        └─ Merchant's recurring charge hits card (auto, no action needed)
           └─ Relayer calls vault.confirmPaymentAndReset()
```

**Required at vault creation**:
- One-time: issue card via Bridge Card Issuing API (KYC the treasurer)
- One-time: enter virtual card number into the merchant's billing settings
- Top-up timing: relayer must load card 24–48h before expected merchant charge

**Card custody**: Card PAN/CVV stored encrypted in relayer's Supabase. Only the
relayer can read it. Members never see it. On member change → rotate card.

---

## 5. Relayer Architecture

### 5.1 Overview

The relayer is a Node.js server with one job: listen for vault events and translate
them into Bridge/Visa API calls. It never holds cUSD or user funds.

```
relayer/
├── src/
│   ├── index.ts                # Express server + startup
│   ├── listener.ts             # Celo RPC event listener (Viem)
│   ├── handlers/
│   │   ├── paymentExecuted.ts  # Routes event to bridge or card handler
│   │   ├── bridgeHandler.ts    # Calls Bridge /v1/transfers
│   │   └── cardHandler.ts      # Calls Bridge Card Issuing API
│   ├── bridge/
│   │   ├── client.ts           # Bridge API HTTP client
│   │   └── auth.ts             # OAuth2 + request signing
│   ├── db/
│   │   ├── vaults.ts           # Vault metadata CRUD
│   │   └── payments.ts         # Payment log CRUD
│   └── utils/
│       ├── signer.ts           # EOA signing (relayer wallet)
│       └── retry.ts            # Exponential backoff for API calls
├── .env.example
└── package.json
```

### 5.2 Event Listener (listener.ts)

```typescript
import { createPublicClient, http, parseAbiItem } from 'viem'
import { celo } from 'viem/chains'

const client = createPublicClient({ chain: celo, transport: http(CELO_RPC_URL) })

// Watch all vaults registered in VaultFactory
client.watchContractEvent({
  address: FACTORY_ADDRESS,
  abi: FACTORY_ABI,
  eventName: 'PaymentExecuted',
  onLogs: (logs) => logs.forEach(handlePaymentExecuted),
})

// Also watch for CycleRefunded (for logging/notification)
client.watchContractEvent({
  address: FACTORY_ADDRESS,
  abi: FACTORY_ABI,
  eventName: 'CycleRefunded',
  onLogs: (logs) => logs.forEach(handleRefund),
})
```

### 5.3 Bridge Handler (bridgeHandler.ts)

```typescript
async function handleBridgePayment(vaultAddress: string, amount: bigint, cycleId: number) {
  // 1. Load vault metadata from DB (bridgeAccountId, subscriptionId)
  const vault = await db.vaults.findByAddress(vaultAddress)

  // 2. Sign the cycle payload
  const sig = await relayerSigner.signMessage(`${vaultAddress}:${cycleId}:${amount}`)

  // 3. Call Bridge API
  const transfer = await bridgeClient.post('/v1/transfers', {
    source: { type: 'crypto', currency: 'cusd', amount, walletAddress: vaultAddress },
    destination: { type: 'stripe_subscription', subscriptionId: vault.stripeSubscriptionId },
    signature: sig,
    idempotencyKey: `${vaultAddress}-cycle-${cycleId}`,
  })

  // 4. Wait for Bridge webhook confirming fiat settlement
  await waitForBridgeWebhook(transfer.id, timeout: 300_000)

  // 5. Call vault.confirmPaymentAndReset() on Celo
  await vaultContract.write.confirmPaymentAndReset()

  // 6. Log
  await db.payments.insert({ vaultAddress, cycleId, bridgeTransferId: transfer.id, status: 'settled' })
}
```

### 5.4 Failure Handling

| Failure Scenario | What Happens |
|------------------|--------------|
| Relayer down when event fires | Viem re-emits missed events on reconnect (block range scan) |
| Bridge API 5xx | Exponential backoff, 3 retries over 10 minutes |
| Bridge rejects (insufficient funds) | Vault.refundCycle() called; members refunded on-chain |
| Card top-up too late (merchant charges before load) | Card declines; relayer notifies members; retry next cycle |
| Celo RPC outage | Relayer reconnects to backup RPC; queue processed on recovery |

---

## 6. Frontend — MiniPay Mini App

### 6.1 Screens Map

```
App
├── /dashboard
│   ├── WalletBalanceCard
│   ├── VaultList → VaultCard[]
│   └── NewVaultButton
│
├── /vault/new (4-step wizard)
│   ├── Step 1: ServicePicker
│   ├── Step 2: RouteInfoScreen (auto-selected, informational)
│   ├── Step 3: MemberManager
│   └── Step 4: ReviewAndDeploy → DeployAnimation → SuccessScreen
│
├── /vault/:id
│   ├── VaultHeader (status, progress bar)
│   ├── Tabs: Members | Route | History
│   └── FundButton (if user's share unfunded)
│
└── /vault/:id/fund
    ├── FundConfirmScreen (shows amount, wallet impact)
    ├── TxProcessingScreen (ERC-20 approve + transfer)
    └── FundSuccessScreen
```

### 6.2 MiniPay SDK Integration

```typescript
// packages/miniapp/src/lib/minipay.ts

import { createWalletClient, custom } from 'viem'
import { celo } from 'viem/chains'

// MiniPay injects window.ethereum like MetaMask
export const walletClient = createWalletClient({
  chain: celo,
  transport: custom(window.ethereum),
})

// Get connected address
export async function getAddress(): Promise<Address> {
  const [address] = await walletClient.requestAddresses()
  return address
}

// Approve cUSD spending for vault
export async function approveCUSD(vaultAddress: Address, amount: bigint) {
  return walletClient.writeContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [vaultAddress, amount],
  })
}

// Fund the vault (member calls this after approving)
export async function fundVaultShare(vaultAddress: Address) {
  return walletClient.writeContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'fundShare',
  })
}
```

### 6.3 State Management

Use Zustand for global state. Keep it flat.

```typescript
// packages/miniapp/src/store.ts

interface AppState {
  address: Address | null
  balance: bigint          // cUSD balance
  vaults: VaultWithMeta[]  // Hydrated from contract + DB
  activeVaultId: string | null

  // Actions
  loadVaults: () => Promise<void>
  fundShare: (vaultId: string) => Promise<void>
  createVault: (params: CreateVaultParams) => Promise<string>
}
```

---

## 7. Database Schema (Supabase / PostgreSQL)

```sql
-- Off-chain metadata for vaults (contract is source of truth for funds)

CREATE TABLE vaults (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_addr   TEXT NOT NULL UNIQUE,
  service_id      TEXT NOT NULL,              -- 'claude', 'netflix', etc.
  route           TEXT NOT NULL,              -- 'direct' | 'bridge' | 'card'
  monthly_amount  NUMERIC(12, 6) NOT NULL,
  billing_day     INT NOT NULL,
  created_by      TEXT NOT NULL,              -- wallet address of creator
  bridge_acct_id  TEXT,                       -- Bridge account ID (BRIDGE route)
  card_id         TEXT,                       -- Bridge card ID (CARD route), encrypted
  stripe_sub_id   TEXT,                       -- Stripe subscription ID (BRIDGE route)
  merchant_addr   TEXT,                       -- Celo address (DIRECT route)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vault_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        UUID REFERENCES vaults(id),
  wallet_addr     TEXT NOT NULL,
  display_name    TEXT,
  share_percent   INT NOT NULL,               -- basis points * 100 (3333 = 33.33%)
  share_amount    NUMERIC(12, 6) NOT NULL,
  invited_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vault_id, wallet_addr)
);

CREATE TABLE payment_cycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        UUID REFERENCES vaults(id),
  cycle_number    INT NOT NULL,
  status          TEXT NOT NULL,              -- 'funded' | 'executed' | 'refunded' | 'failed'
  scheduled_at    TIMESTAMPTZ NOT NULL,
  executed_at     TIMESTAMPTZ,
  bridge_tx_id    TEXT,
  celo_tx_hash    TEXT,
  amount          NUMERIC(12, 6),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE member_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID REFERENCES payment_cycles(id),
  wallet_addr     TEXT NOT NULL,
  amount          NUMERIC(12, 6) NOT NULL,
  celo_tx_hash    TEXT NOT NULL,
  funded_at       TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. Environment Variables

### packages/contracts/.env
```
# Used by forge script --broadcast
DEPLOYER_PRIVATE_KEY=           # Deployer EOA private key
CELO_RPC_URL=https://forno.celo.org
ALFAJORES_RPC_URL=https://alfajores-forno.celo-testnet.org
CELOSCAN_API_KEY=               # For --verify on forge script
GELATO_API_KEY=
CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
CUSD_ADDRESS_ALFAJORES=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
```

### packages/relayer/.env
```
CELO_RPC_URL=https://forno.celo.org
CELO_RPC_URL_BACKUP=https://rpc.ankr.com/celo
RELAYER_PRIVATE_KEY=            # Hot wallet for signing confirmations ONLY
FACTORY_ADDRESS=                # Deployed VaultFactory address
BRIDGE_API_KEY=
BRIDGE_API_SECRET=
BRIDGE_WEBHOOK_SECRET=          # For verifying Bridge webhooks
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
PORT=3000
```

### packages/miniapp/.env
```
VITE_FACTORY_ADDRESS=
VITE_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
VITE_CELO_RPC_URL=https://forno.celo.org
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 9. Deployment Guide

### Step 1: Install contract dependencies

```bash
cd packages/contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

### Step 2: Run tests (including fork tests)

```bash
# Unit tests
forge test -vv

# Fork tests against real cUSD on Alfajores
forge test --fork-url $ALFAJORES_RPC_URL -vvv

# Full fuzz suite (run before any deploy)
forge test --match-path test/fuzz/* --fuzz-runs 10000
```

### Step 3: Deploy contracts

```bash
# Alfajores testnet first
forge script script/Deploy.s.sol \
  --rpc-url alfajores \
  --broadcast \
  --verify \
  -vvvv

# Mainnet (after audit)
forge script script/Deploy.s.sol \
  --rpc-url celo \
  --broadcast \
  --verify \
  -vvvv

# Export ABIs for relayer + miniapp
forge inspect SubscriptionVault abi > ../shared/abis/SubscriptionVault.json
forge inspect VaultFactory abi > ../shared/abis/VaultFactory.json

# Note: VaultFactory address → set FACTORY_ADDRESS in relayer + miniapp .env
```

### Step 4: Register Gelato keeper

```bash
forge script script/RegisterKeeper.s.sol \
  --rpc-url alfajores \
  --broadcast \
  -vvvv
# Gelato will call executePayment() and refundCycle() based on on-chain conditions
```

### Step 5: Deploy relayer

```bash
cd packages/relayer
npm run build
# Deploy to Railway / Render / Fly.io
# Set all env vars
# Register Bridge webhook endpoint: POST /webhooks/bridge
```

### Step 6: Deploy Mini App

```bash
cd packages/miniapp
npm run build
# Deploy to Vercel / Netlify
# Register as MiniPay Mini App at https://miniapps.minipay.xyz
```

---

## 10. Security Considerations

### 10.1 Trust Model

| Component | Trust Level | Why |
|-----------|------------|-----|
| SubscriptionVault.sol | Trustless | Funds only move per contract rules |
| Gelato Keeper | Trust-minimized | Decentralized, but off-chain trigger |
| Relayer | Trusted for messaging | Can call confirmPaymentAndReset() but cannot move funds |
| Bridge API | Trusted third party | KYC'd account holder is responsible |
| Virtual Card | Trusted third party | Card PAN controlled by relayer |

### 10.2 Relayer Compromise

If the relayer is compromised, an attacker can:
- Call `confirmPaymentAndReset()` prematurely → resets cycle without payment
- Skip calling Bridge API → members lose their funded share for the cycle

Mitigations:
- `confirmPaymentAndReset()` requires a valid Bridge/Visa settlement proof
  (bridge transaction ID stored on-chain or verified via oracle — v2 feature)
- Multisig relayer wallet (Gnosis Safe) for production
- Vault guardian: a second EOA that can pause the vault if relayer is suspected compromised

### 10.3 KYC Centralization

The Bridge/Card routes require one KYC'd person (the "treasurer").
This person:
- Controls the Bridge account that moves fiat
- Is the named card holder for the virtual Visa

This is an accepted centralization trade-off for v1. The smart contract ensures they
can never steal the cUSD itself — only fail to process the fiat payment (which triggers
a refund of on-chain funds automatically).

### 10.4 Smart Contract Risks

- **Reentrancy**: `fundShare()` updates state before transfer (CEI pattern)
- **Integer overflow**: Solidity 0.8.x has built-in overflow protection
- **Access control**: `onlyKeeper` and `onlyRelayer` use address allowlists, not
  role-based systems — simpler attack surface
- **Audit**: Required before mainnet with real funds. Suggest OpenZeppelin audit service
  or Code4rena contest for community audit

---

## 11. Roadmap

### v0.1 — Prototype (now)
- [x] UI prototype (React, mock data)
- [x] Architecture documentation

### v0.2 — Testnet MVP
- [ ] SubscriptionVault.sol + VaultFactory.sol
- [ ] Gelato keeper integration
- [ ] Relayer (DIRECT route only, no Bridge yet)
- [ ] MiniPay Mini App (dashboard + fund flow)
- [ ] Deploy to Celo Alfajores testnet

### v0.3 — Bridge Integration
- [ ] Bridge API integration (BRIDGE route)
- [ ] KYC flow in Mini App (redirects to Bridge KYC)
- [ ] Webhook handler + payment confirmation loop
- [ ] End-to-end test: cUSD → Bridge → Stripe subscription charged

### v0.4 — Card Integration
- [ ] Bridge Card Issuing API (CARD route)
- [ ] Card top-up automation
- [ ] Card PAN encrypted storage
- [ ] Member rotation → card rotation flow

### v1.0 — Mainnet
- [ ] Security audit
- [ ] Multi-language support (MiniPay is big in West Africa — French, Swahili)
- [ ] Celo mainnet deployment
- [ ] MiniPay Mini App store listing
- [ ] Member invitation via phone number (MiniPay supports phone-linked wallets)

---

## 12. Key External Docs for AI Agents

When working on this project, reference these:

| Topic | URL |
|-------|-----|
| Celo Docs | https://docs.celo.org |
| MiniPay Mini App SDK | https://docs.minipay.xyz/miniapps |
| Gelato Automate | https://docs.gelato.network/web3-services/automate |
| Stripe Bridge API | https://docs.bridge.xyz |
| Bridge Card Issuing | https://docs.bridge.xyz/docs/card-issuing |
| cUSD Token Address (mainnet) | 0x765DE816845861e75A25fCA122bb6898B8B1282a |
| cUSD Token Address (Alfajores) | 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1 |
| Viem Celo | https://viem.sh/docs/chains/celo |
| OpenZeppelin Contracts | https://docs.openzeppelin.com/contracts/5.x |
| Foundry Book | https://book.getfoundry.sh |
| Foundry Celo (fork config) | https://book.getfoundry.sh/reference/config/testing#fork_block_number |
| Gelato Foundry integration | https://docs.gelato.network/web3-services/automate/guides/foundry |

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| Vault | A deployed SubscriptionVault.sol instance for one subscription |
| Treasurer | The KYC'd person who owns the Bridge account / card for a vault |
| Keeper | Gelato automation that calls executePayment() on schedule |
| Relayer | Backend server that bridges on-chain events to Bridge/Visa APIs |
| Cycle | One billing period (monthly). Resets after each payment or refund |
| Share | A member's percentage + cUSD amount owed per cycle |
| Route | Payment method: DIRECT, BRIDGE, or CARD |
| cUSD | Celo Dollar — fiat-pegged stablecoin native to Celo |
| Bridge | Stripe-owned stablecoin orchestration platform (not the Celo bridge) |

---

*This document is the single source of truth for the SplitVault project.
Update it when architecture decisions change. AI agents should read this first
before touching any code in the repository.*
