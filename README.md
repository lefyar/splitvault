# SplitVault

On-chain shared subscription splitting on Celo / MiniPay.

## Project Structure

```
splitvault/
├── packages/
│   ├── contracts/          # Solidity smart contracts (Foundry)
│   ├── relayer/            # Node.js backend — event listener + API bridge
│   ├── miniapp/            # React frontend — MiniPay Mini App
│   └── shared/             # Types, ABIs, constants shared across packages
├── docs/
│   └── ARCHITECTURE.md     # Full architecture guide
└── .env                    # Root environment variables
```

## Quick Start

### Setup

```bash
# Install dependencies
pnpm install

# Install foundry dependencies
cd packages/contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
cd ../..
```

### Phase 1: Smart Contracts

```bash
# Run tests
pnpm contracts:test

# Build
pnpm contracts:build

# Deploy (after setting .env)
cd packages/contracts
forge script script/Deploy.s.sol --rpc-url alfajores --broadcast --verify
```

## Documentation

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system design.

## Roadmap

- **v0.2**: Smart contracts + DIRECT route MVP
- **v0.3**: Bridge integration
- **v0.4**: Card integration
- **v1.0**: Mainnet + audit
