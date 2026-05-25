import { Router } from 'express'
import { createPublicClient, defineChain, formatUnits, http } from 'viem'
import { requireMerchantAdmin } from './merchants.js'

export const vaultsRouter = Router()

type Address = `0x${string}`

const CELO_CHAIN_ID = 42220
const CELO_SEPOLIA_CHAIN_ID = 11142220
const DEFAULT_CELO_RPC_URL = 'https://forno.celo.org'
const DEFAULT_CELO_SEPOLIA_RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org'
const DEFAULT_CELO_CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a'
const DEFAULT_SEPOLIA_MOCK_CUSD_ADDRESS = '0xBFa30e9f862776349b881875027990223bf122bD'

const VAULT_REPAIR_ABI = [
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
    type: 'function',
    name: 'getMembers',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
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
] as const

interface VaultRow {
  contract_addr: Address
  creator_addr: Address
  service_name: string
  merchant_addr: Address
  merchant_id?: string
  payment_method_id?: string
  token_addr: Address
  monthly_amount: string
  billing_day: number
  route: 'DIRECT'
  chain_id: number
  tx_hash?: string
  created_at?: string
}

interface VaultMemberRow {
  vault_addr: Address
  wallet_addr: Address
  display_name?: string
  share_percent: number
  share_amount: string
}

function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

function getRpcUrl(chainId: number) {
  if (chainId === CELO_CHAIN_ID) return process.env.CELO_RPC_URL || DEFAULT_CELO_RPC_URL
  if (chainId === CELO_SEPOLIA_CHAIN_ID) return process.env.CELO_SEPOLIA_RPC_URL || DEFAULT_CELO_SEPOLIA_RPC_URL
  throw new Error('Unsupported chainId')
}

function getTokenAddress(chainId: number): Address {
  if (chainId === CELO_CHAIN_ID) return (process.env.CUSD_ADDRESS || DEFAULT_CELO_CUSD_ADDRESS) as Address
  if (chainId === CELO_SEPOLIA_CHAIN_ID) {
    return (process.env.CUSD_ADDRESS_CELO_SEPOLIA || DEFAULT_SEPOLIA_MOCK_CUSD_ADDRESS) as Address
  }
  throw new Error('Unsupported chainId')
}

function createChainClient(chainId: number) {
  const rpcUrl = getRpcUrl(chainId)
  const chain = defineChain({
    id: chainId,
    name: chainId === CELO_CHAIN_ID ? 'Celo' : 'Celo Sepolia',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  })

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

function requireSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  }
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  requireSupabase()

  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response
}

vaultsRouter.get('/', async (req, res) => {
  try {
    const member = req.query.member
    console.log('[relayer] GET /api/vaults', { member })
    if (!isAddress(member)) {
      return res.status(400).json({ ok: false, error: 'Invalid member address' })
    }

    const memberResponse = await supabaseFetch(
      `vault_members?wallet_addr=ilike.${member}&select=vault_addr`,
    )
    const memberRows = (await memberResponse.json()) as Array<{ vault_addr: Address }>
    const vaultAddresses = [...new Set(memberRows.map((row) => row.vault_addr))]

    if (vaultAddresses.length === 0) {
      return res.json({ vaults: [] })
    }

    const encodedVaults = vaultAddresses.map((address) => `"${address}"`).join(',')
    const [vaultResponse, vaultMembersResponse] = await Promise.all([
      supabaseFetch(`vaults?contract_addr=in.(${encodedVaults})&select=*`),
      supabaseFetch(`vault_members?vault_addr=in.(${encodedVaults})&select=*`),
    ])

    const vaultRows = (await vaultResponse.json()) as VaultRow[]
    const vaultMemberRows = (await vaultMembersResponse.json()) as VaultMemberRow[]

    const vaults = vaultRows.map((vault) => ({
      ...vault,
      members: vaultMemberRows.filter((row) => row.vault_addr.toLowerCase() === vault.contract_addr.toLowerCase()),
    }))

    console.log('[relayer] GET /api/vaults result', { count: vaults.length })
    return res.json({ vaults })
  } catch (err) {
    console.error('[relayer] GET /api/vaults failed', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

vaultsRouter.post('/', async (req, res) => {
  try {
    const body = req.body as Partial<{
      vaultAddress: Address
      txHash: string
      creator: Address
      tokenAddress: Address
      createParams: {
        serviceName: string
        monthlyAmount: string
        billingDay: number
        merchantAddress: Address
        merchantId?: string
        paymentMethodId?: string
        networkId: number
        route: 'DIRECT'
        members: Array<{ name: string; wallet: Address; share: number; shareAmount?: string }>
      }
    }>

    console.log('[relayer] POST /api/vaults', {
      vaultAddress: body.vaultAddress,
      creator: body.creator,
      members: body.createParams?.members?.length ?? 0,
    })

    if (!isAddress(body.vaultAddress) || !isAddress(body.creator) || !isAddress(body.tokenAddress)) {
      return res.status(400).json({ ok: false, error: 'Invalid vault, creator, or token address' })
    }

    const params = body.createParams
    if (!params || params.route !== 'DIRECT' || !isAddress(params.merchantAddress)) {
      return res.status(400).json({ ok: false, error: 'Invalid DIRECT vault metadata' })
    }

    const vaultRow: VaultRow = {
      contract_addr: body.vaultAddress,
      creator_addr: body.creator,
      service_name: params.serviceName,
      merchant_addr: params.merchantAddress,
      merchant_id: params.merchantId,
      payment_method_id: params.paymentMethodId,
      token_addr: body.tokenAddress,
      monthly_amount: params.monthlyAmount,
      billing_day: params.billingDay,
      route: 'DIRECT',
      chain_id: params.networkId,
      tx_hash: body.txHash,
    }

    const memberRows: VaultMemberRow[] = params.members.map((member) => ({
      vault_addr: body.vaultAddress!,
      wallet_addr: member.wallet,
      display_name: member.name,
      share_percent: member.share,
      share_amount: member.shareAmount ?? '0',
    }))

    await supabaseFetch('vaults?on_conflict=contract_addr', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(vaultRow),
    })

    await supabaseFetch('vault_members?on_conflict=vault_addr,wallet_addr', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(memberRows),
    })

    console.log('[relayer] POST /api/vaults saved', { vaultAddress: body.vaultAddress })
    return res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[relayer] POST /api/vaults failed', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

vaultsRouter.post('/repair', async (req, res) => {
  try {
    const auth = requireMerchantAdmin(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }

    const body = req.body as Partial<{
      vaultAddress: Address
      chainId: number
      serviceName: string
    }>

    if (!isAddress(body.vaultAddress)) {
      return res.status(400).json({ ok: false, error: 'Invalid vaultAddress' })
    }

    const chainId = Number(body.chainId || CELO_SEPOLIA_CHAIN_ID)
    if (![CELO_CHAIN_ID, CELO_SEPOLIA_CHAIN_ID].includes(chainId)) {
      return res.status(400).json({ ok: false, error: 'Unsupported chainId' })
    }

    const client = createChainClient(chainId)
    const [monthlyAmount, billingDay, merchantAddress, creator, memberAddresses] = await Promise.all([
      client.readContract({ address: body.vaultAddress, abi: VAULT_REPAIR_ABI, functionName: 'monthlyAmount' }) as Promise<bigint>,
      client.readContract({ address: body.vaultAddress, abi: VAULT_REPAIR_ABI, functionName: 'billingDay' }) as Promise<bigint>,
      client.readContract({ address: body.vaultAddress, abi: VAULT_REPAIR_ABI, functionName: 'merchantAddress' }) as Promise<Address>,
      client.readContract({ address: body.vaultAddress, abi: VAULT_REPAIR_ABI, functionName: 'creator' }) as Promise<Address>,
      client.readContract({ address: body.vaultAddress, abi: VAULT_REPAIR_ABI, functionName: 'getMembers' }) as Promise<Address[]>,
    ])

    const memberRows: VaultMemberRow[] = await Promise.all(memberAddresses.map(async (wallet) => {
      const memberTuple = await client.readContract({
        address: body.vaultAddress!,
        abi: VAULT_REPAIR_ABI,
        functionName: 'members',
        args: [wallet],
      }) as readonly [Address, bigint, bigint, boolean]

      return {
        vault_addr: body.vaultAddress!,
        wallet_addr: wallet,
        display_name: wallet.toLowerCase() === creator.toLowerCase() ? 'Creator' : 'Member',
        share_percent: Number(memberTuple[1]),
        share_amount: memberTuple[2].toString(),
      }
    }))

    const vaultRow: VaultRow = {
      contract_addr: body.vaultAddress,
      creator_addr: creator,
      service_name: body.serviceName?.trim() || 'Imported Direct Vault',
      merchant_addr: merchantAddress,
      token_addr: getTokenAddress(chainId),
      monthly_amount: formatUnits(monthlyAmount, 18),
      billing_day: Number(billingDay),
      route: 'DIRECT',
      chain_id: chainId,
    }

    await supabaseFetch('vaults?on_conflict=contract_addr', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(vaultRow),
    })

    await supabaseFetch('vault_members?on_conflict=vault_addr,wallet_addr', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(memberRows),
    })

    return res.status(200).json({
      ok: true,
      vault: body.vaultAddress,
      creator,
      members: memberRows.length,
    })
  } catch (err) {
    console.error('[relayer] POST /api/vaults/repair failed', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})
