# Merchant Registry

SplitVault uses Supabase as the source of truth for merchant discovery. Contracts still hold the real payout address, but the registry lets users pick verified merchants instead of pasting addresses manually.

## Tables

- `merchants`: display metadata and verification status.
- `merchant_payment_methods`: chain/token/mode-specific payout configuration.
- `payment_tokens`: supported token references.

The miniapp only shows merchants that are:

- `status = verified`
- attached to an enabled payment method
- matching the active `chainId` and `tokenAddress`

## Public Read

```text
GET /api/merchants?chainId=11142220&tokenAddress=0xBFa30e9f862776349b881875027990223bf122bD
```

This is what the miniapp calls.

## Admin List

```bash
cd packages/relayer
npm run admin:list-merchants
```

Requires:

```bash
RELAYER_BASE_URL=
MERCHANT_ADMIN_TOKEN=
```

## Seed Or Update

```bash
cd packages/relayer
npm run admin:seed-merchant
```

Required env:

```bash
RELAYER_BASE_URL=
MERCHANT_ADMIN_TOKEN=
MERCHANT_SEED_TOKEN_ADDRESS=
MERCHANT_SEED_PAYOUT_ADDRESS=
```

Optional env:

```bash
MERCHANT_SEED_ID=custom-direct-wallet
MERCHANT_SEED_CHAIN_ID=11142220
MERCHANT_SEED_TOKEN_SYMBOL=MockcUSD
MERCHANT_SEED_NAME=Custom direct merchant
MERCHANT_SEED_DESCRIPTION=Use any merchant wallet that you have independently verified.
MERCHANT_SEED_CATEGORY=custom
MERCHANT_SEED_ICON=0x
MERCHANT_SEED_SUGGESTED_COST=10
MERCHANT_SEED_STATUS=verified
```

## Direct API

```bash
curl -X POST "$RELAYER_BASE_URL/api/merchants" \
  -H "Authorization: Bearer $MERCHANT_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "custom-direct-wallet",
    "name": "Custom direct merchant",
    "description": "Use any merchant wallet that you have independently verified.",
    "category": "custom",
    "icon": "0x",
    "suggestedCost": 10,
    "status": "verified",
    "paymentMethods": [
      {
        "chainId": 11142220,
        "tokenSymbol": "MockcUSD",
        "tokenAddress": "0xBFa30e9f862776349b881875027990223bf122bD",
        "mode": "static_wallet",
        "payoutAddress": "0x...",
        "enabled": true
      }
    ]
  }'
```

## Disable

Disable a merchant:

```json
{
  "id": "custom-direct-wallet",
  "name": "Custom direct merchant",
  "description": "Use any merchant wallet that you have independently verified.",
  "status": "disabled"
}
```

Disable only one payment method by posting the method again with:

```json
{
  "enabled": false
}
```

## Verification Checklist

- Confirm merchant controls the payout wallet.
- Confirm chain, token, and decimals.
- Send a tiny test transfer before marking `verified`.
- Keep `api_invoice` and `payment_link` methods disabled until an adapter exists.
- Never expose `MERCHANT_ADMIN_TOKEN` to frontend or `VITE_` variables.

## Custom Merchants

The miniapp keeps a manual custom merchant option available even when verified merchants are configured. Custom merchants are useful for early community, creator, agency, or invoice-recipient use cases, but they are not registry-verified.

Users should only use custom merchants when they have independently confirmed:

- the merchant controls the wallet
- the wallet is on the active Celo network
- the merchant accepts the selected token
- the monthly amount matches the expected invoice

For production, prefer verified registry merchants whenever possible.
