import { Router } from 'express'

export const vaultsRouter = Router()

type Address = `0x${string}`

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
