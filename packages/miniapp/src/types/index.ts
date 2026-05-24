export type Address = `0x${string}`

export enum PaymentRoute {
  DIRECT = 'DIRECT',
  BRIDGE = 'BRIDGE',
  CARD = 'CARD',
}

export interface Member {
  wallet: Address
  sharePercent: number // basis points * 100 (e.g. 3333 = 33.33%)
  shareAmount: bigint
  funded: boolean
  name?: string
}

export interface Vault {
  id: Address
  monthlyAmount: bigint
  billingDay: number
  route: PaymentRoute
  merchantAddress: Address
  members: Member[]
  cycleDeadline: bigint
  cycleActive: boolean
  totalFunded: bigint
  creator: Address

  // Off-chain metadata
  serviceName?: string
  description?: string
  networkId?: number
  createdAt?: number
}

export interface CreateVaultParams {
  serviceName: string
  monthlyAmount: string // in cUSD
  billingDay: number
  route: PaymentRoute
  merchantAddress: Address
  members: { name: string; wallet: Address; share: number; shareAmount?: string }[]
  networkId: number
}

export interface FundingStatus {
  totalFunded: bigint
  totalRequired: bigint
  membersCount: number
  membersFunded: number
  funded: boolean
}

export interface VaultWithMeta extends Vault {
  fundingStatus: FundingStatus
  userShare?: number // for current user
  userFunded?: boolean
}
