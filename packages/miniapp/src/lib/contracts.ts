import { Address, Merchant, PaymentRoute } from '../types'

// Celo mainnet and Celo Sepolia.
export const CELO_CHAIN_ID = 42220
export const CELO_SEPOLIA_CHAIN_ID = 11142220

export const DEFAULT_CELO_RPC_URL = 'https://forno.celo.org'
export const DEFAULT_CELO_SEPOLIA_RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org'

export const ACTIVE_CHAIN_ID = Number(import.meta.env.VITE_CELO_CHAIN_ID || CELO_SEPOLIA_CHAIN_ID)
export const ACTIVE_RPC_URL =
  import.meta.env.VITE_CELO_RPC_URL ||
  (ACTIVE_CHAIN_ID === CELO_CHAIN_ID ? DEFAULT_CELO_RPC_URL : DEFAULT_CELO_SEPOLIA_RPC_URL)
export const IS_TESTNET = ACTIVE_CHAIN_ID !== CELO_CHAIN_ID
export const ACTIVE_NETWORK_NAME = ACTIVE_CHAIN_ID === CELO_CHAIN_ID ? 'Celo Mainnet' : 'Celo Sepolia'
export const ACTIVE_EXPLORER_URL = ACTIVE_CHAIN_ID === CELO_CHAIN_ID
  ? 'https://celoscan.io'
  : 'https://celo-sepolia.blockscout.com'
export const CUSD_LABEL = IS_TESTNET ? 'MockcUSD' : 'cUSD'

// USDm is the current Mento USD stable token name. The mainnet address is the
// historical cUSD address used by existing Celo apps.
export const CUSD_ADDRESS: Address =
  (import.meta.env.VITE_CUSD_ADDRESS as Address | undefined) ||
  (ACTIVE_CHAIN_ID === CELO_CHAIN_ID
    ? '0x765de816845861e75a25fca122bb6898b8b1282a'
    : '0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b')

// VaultFactory (will be deployed, update after deployment)
export const VAULT_FACTORY_ADDRESS: Address =
  (import.meta.env.VITE_VAULT_FACTORY_ADDRESS as Address | undefined) ||
  (import.meta.env.VITE_FACTORY_ADDRESS as Address | undefined) ||
  '0x0000000000000000000000000000000000000000'

export const isFactoryConfigured = VAULT_FACTORY_ADDRESS !== '0x0000000000000000000000000000000000000000'

// ERC-20 ABI (standard)
export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'mintForTesting',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
] as const

// SubscriptionVault ABI
export const VAULT_ABI = [
  {
    type: 'function',
    name: 'fundShare',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getFundingStatus',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'totalFunded', type: 'uint256' },
      { name: 'totalRequired', type: 'uint256' },
      { name: 'membersCount', type: 'uint256' },
      { name: 'membersFunded', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getCycleDeadline',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isMember',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'members',
    stateMutability: 'view',
    inputs: [{ name: 'addr', type: 'address' }],
    outputs: [
      { name: 'wallet', type: 'address' },
      { name: 'sharePercent', type: 'uint256' },
      { name: 'shareAmount', type: 'uint256' },
      { name: 'funded', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'monthlyAmount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'billingDay',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'route',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'memberList',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'getMembers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'cycleDeadline',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'cycleActive',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'totalFunded',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'merchantAddress',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'creator',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'event',
    name: 'MemberFunded',
    inputs: [
      { name: 'member', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'PaymentExecuted',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'route', type: 'uint8' },
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'CycleRefunded',
    inputs: [
      { name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'CycleReset',
    inputs: [
      { name: 'nextDeadline', type: 'uint256' },
    ],
  },
] as const

// VaultFactory ABI
export const FACTORY_ABI = [
  {
    type: 'function',
    name: 'createVault',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_monthlyAmount', type: 'uint256' },
      { name: '_billingDay', type: 'uint256' },
      { name: '_merchantAddress', type: 'address' },
      { name: '_memberAddresses', type: 'address[]' },
      { name: '_memberShares', type: 'uint256[]' },
      { name: 'serviceName', type: 'string' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'getCreatorVaults',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'performUpkeep',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'performData', type: 'bytes' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getVaultsCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'VaultCreated',
    inputs: [
      { name: 'vault', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'serviceName', type: 'string' },
    ],
  },
] as const

// Manual fallback. Verified merchants should come from the registry; this keeps
// the app usable when the registry is unavailable or intentionally empty.
export const MERCHANTS: Merchant[] = [
  {
    id: 'custom',
    name: 'Custom merchant',
    description: 'Use any merchant wallet that you have independently verified.',
    icon: '0x',
    suggestedCost: 10,
    route: PaymentRoute.DIRECT,
  },
]
