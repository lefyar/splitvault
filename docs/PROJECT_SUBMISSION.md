# SplitVault Project Submission

## Short Description

SplitVault is a Celo MiniPay-ready app for shared recurring cUSD payments. Users create a shared vault, add members, fund their own share, and the vault pays a verified or custom merchant wallet directly when the cycle is due.

## Full Description

SplitVault turns a recurring crypto payment into a shared on-chain commitment. A vault creator chooses a direct merchant recipient, sets the cycle amount and billing day, then invites members by wallet address. Each member funds only their own share. When the cycle is due, the upkeep flow checks whether the vault is fully funded. Fully funded vaults settle directly to the merchant wallet; underfunded vaults refund funded members and reset for the next cycle.

The current production path focuses on direct cUSD settlement on Celo. Today, users can pay a custom merchant wallet they have independently verified. In the future, SplitVault will add verified merchant entries for services that accept direct crypto payments on Celo mainnet, so groups can set up a shared recurring payment once and then fund each cycle without copy-pasting addresses.

SplitVault does not cancel the external service for users. If members stop using a service, they can stop funding future cycles. When a cycle is not fully funded by its deadline, the contract does not pay the merchant; any funded shares are refunded and the vault resets for the next cycle. The group should still cancel or pause the actual service directly with the merchant when needed.

SplitVault is non-custodial: funds move through smart contracts and direct token transfers, not through a hosted balance managed by the app. The relayer stores readable vault metadata, supports merchant registry administration, and can run upkeep checks, but it does not custody user funds.

## Current Status

- Testnet direct route is implemented on Celo Sepolia with MockcUSD.
- Merchant registry and verified payment-method filtering are implemented.
- Custom merchant wallet flow is implemented for manually verified recipients.
- Dashboard and vault detail show connected-wallet funding status.
- Relayer upkeep endpoints can check and execute due vaults.
- Celo mainnet `VaultFactory` is deployed at `0x82A9D7C665133377f307b2214B0195E55556898b`.
- Mainnet settlement remains limited to tiny-value smoke testing until merchant wallets and operational keys are confirmed.

## Platform And Legal References

SplitVault is built for Celo and MiniPay-compatible wallet environments. Users should also review the applicable third-party platform terms and policies:

- MiniPay Terms of Service: https://minipay.to/terms-of-service
- MiniPay Privacy Statement: https://minipay.to/privacy-statement
- Celo Terms and Conditions: https://celo.org/user-agreement
- Celo Privacy Policy: https://celo.org/privacy-policy
- Celo Mainnet Disclaimer: https://docs.celo.org/network/mainnet/disclaimer

SplitVault should publish its own Terms of Service and Privacy Policy before handling real users and real mainnet recurring payments.

## Mainnet Readiness Notes

Before mainnet launch:

- Rotate all keys that were ever pasted into chats, logs, screenshots, or shared documents.
- Deploy the factory on Celo mainnet with the real cUSD address.
- Configure frontend and relayer production env vars for chain ID `42220`.
- Add at least one verified mainnet merchant payment method.
- Run a tiny mainnet smoke settlement to a wallet controlled by the team.
- Enable mainnet upkeep only after the tiny settlement path is confirmed.
