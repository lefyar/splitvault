# SplitVault Project Submission

## Short Description

SplitVault is a Celo MiniPay-ready app for splitting recurring stablecoin payments with friends, teams, or communities. Users create a shared vault, add members, fund their own share in cUSD or testnet MockcUSD, and the vault pays a verified merchant wallet directly when the cycle is due.

## Full Description

SplitVault turns a recurring crypto payment into a shared on-chain commitment. A vault creator chooses a direct merchant recipient, sets the monthly amount and billing day, then invites members by wallet address. Each member funds only their own share. When the vault is due, the upkeep flow checks whether the cycle is fully funded. Fully funded vaults settle directly to the merchant wallet; underfunded vaults can be refunded through the contract flow.

The current production path focuses on direct stablecoin settlement on Celo. Merchant discovery is backed by a Supabase registry so users can select verified merchant wallets instead of copy-pasting addresses. A custom merchant option remains available for early testing and community/invoice use cases, but users are warned to verify the recipient wallet, chain, token, and invoice amount themselves.

SplitVault is non-custodial: funds move through smart contracts and direct token transfers, not through a hosted balance managed by the app. The relayer stores readable vault metadata, supports merchant registry administration, and can run upkeep checks, but it does not custody user funds.

## Current Status

- Testnet direct route is implemented on Celo Sepolia with MockcUSD.
- Merchant registry and verified payment-method filtering are implemented.
- Dashboard and vault detail show connected-wallet funding status.
- Relayer upkeep endpoints can check and execute due vaults.
- Mainnet settlement is intentionally gated until keys, merchant wallets, and tiny-value smoke tests are complete.

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
