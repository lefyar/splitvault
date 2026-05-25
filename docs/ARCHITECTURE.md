# SplitVault Architecture

SplitVault coordinates shared recurring cUSD payments on Celo. A group creates a
vault, each member funds their own share, and the vault pays a merchant wallet
directly when the cycle is due.

The current production path is `DIRECT` only. Bridge, card, fiat off-ramp, and
API-invoice adapters are future extensions.

## System Overview

```text
Miniapp
  ├─ connects MiniPay / mobile wallet / injected wallet
  ├─ creates vaults through VaultFactory
  ├─ lets members fund shares with cUSD
  └─ reads metadata, merchants, and history from relayer/Supabase

Relayer
  ├─ stores vault metadata in Supabase
  ├─ exposes merchant registry reads/admin writes
  ├─ repairs missing vault metadata from chain
  ├─ records payment events
  └─ optionally runs upkeep as a cron fallback

Contracts
  ├─ VaultFactory deploys SubscriptionVault instances
  ├─ SubscriptionVault stores members, shares, cycle deadline, and merchant wallet
  └─ performUpkeep pays fully funded due cycles or refunds underfunded due cycles

Supabase
  ├─ vaults
  ├─ vault_members
  ├─ payment_events
  ├─ payment_tokens
  ├─ merchants
  └─ merchant_payment_methods
```

## Current Contracts

`VaultFactory`:

- stores the active cUSD token address
- deploys `SubscriptionVault`
- tracks creator vaults and all vaults
- implements `checkUpkeep(0x)` and `performUpkeep(0x)`

`SubscriptionVault`:

- stores the monthly/cycle amount
- stores members and fixed share amounts
- stores the direct merchant payout wallet
- accepts `fundShare()` from members
- pays the merchant through `executePayment()` when fully funded and due
- refunds funded members through `refundCycle()` when underfunded and due
- resets cycles after refund or relayer confirmation

## Payment Lifecycle

1. Creator chooses merchant, cycle amount, billing day, and members.
2. Factory deploys a vault.
3. Each member approves and calls `fundShare()`.
4. After `cycleDeadline`, upkeep checks the vault.
5. If fully funded, the vault transfers cUSD to `merchantAddress`.
6. If underfunded, the vault refunds funded members and resets.

Stopping funding is a way to skip an on-chain payment cycle. It is not a
merchant-side cancellation. Users still need to cancel or pause the actual
external service directly with the merchant.

## Merchant Model

SplitVault supports two merchant modes:

- Custom merchant: user manually enters a Celo wallet they have independently
  verified.
- Verified merchant: Supabase registry contains a merchant and an enabled
  payment method with a fixed payout wallet for the active chain/token.

Verified merchants are intended for future Celo mainnet services that accept
direct crypto payment and can reconcile settlement from a vault transaction.

## Trust Boundaries

- Contracts custody funds during each cycle.
- The relayer does not custody user funds.
- Supabase stores metadata and discovery data, not canonical balances.
- Custom merchant wallets are user-verified, not SplitVault-verified.
- Verified merchants require operational verification before exposure to users.

## Known Limitations

- `DIRECT` route only.
- Fixed cycle amount per vault.
- No explicit vault cancellation/archive function yet.
- No merchant-side service cancellation.
- Billing-day calculation is intentionally simple and contract-defined.
- Mainnet settlement should begin with tiny cUSD smoke tests only.
