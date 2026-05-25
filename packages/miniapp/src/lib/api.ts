import type { Address, CreateVaultParams, Merchant } from '../types'

const RELAYER_BASE_URL = import.meta.env.VITE_RELAYER_BASE_URL || 'http://localhost:3000'

export interface VaultMetadata {
  contract_addr: Address
  creator_addr: Address
  service_name: string
  merchant_addr: Address
  token_addr: Address
  monthly_amount: string
  billing_day: number
  route: 'DIRECT'
  chain_id: number
  tx_hash?: string
  created_at?: string
  members: Array<{
    wallet_addr: Address
    display_name?: string
    share_percent: number
    share_amount: string
  }>
}

export async function fetchVaultMetadata(member: Address): Promise<VaultMetadata[]> {
  const response = await fetch(`${RELAYER_BASE_URL}/api/vaults?member=${member}`)
  if (!response.ok) {
    throw new Error(`Failed to load vault metadata: ${await response.text()}`)
  }
  const data = (await response.json()) as { vaults: VaultMetadata[] }
  return data.vaults
}

export async function saveVaultMetadata(params: {
  vaultAddress: Address
  txHash?: string
  creator: Address
  tokenAddress: Address
  createParams: CreateVaultParams
}) {
  const response = await fetch(`${RELAYER_BASE_URL}/api/vaults`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Failed to save vault metadata: ${await response.text()}`)
  }
}

export async function fetchMerchants(chainId: number, tokenAddress: Address): Promise<Merchant[]> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    tokenAddress,
  })
  const response = await fetch(`${RELAYER_BASE_URL}/api/merchants?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to load merchants: ${await response.text()}`)
  }
  const data = (await response.json()) as { merchants: Merchant[] }
  return data.merchants
}
