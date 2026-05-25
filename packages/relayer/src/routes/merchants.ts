import { Router } from 'express'

export const merchantsRouter = Router()

type Address = `0x${string}`
type PaymentMode = 'static_wallet' | 'api_invoice' | 'payment_link'

interface MerchantRow {
  id: string
  name: string
  description: string
  category?: string
  icon?: string
  suggested_cost: number
  route: 'DIRECT'
  status: 'draft' | 'verified' | 'disabled'
  website_url?: string | null
}

interface MerchantPaymentMethodRow {
  id: string
  merchant_id: string
  chain_id: number
  token_symbol: string
  token_address: Address
  mode: PaymentMode
  payout_address?: Address
  adapter_key?: string
  enabled: boolean
}

type MerchantPaymentMethodInsertRow = Omit<MerchantPaymentMethodRow, 'id'> & {
  id?: string
  min_amount?: string
  max_amount?: string
}

type MerchantAdminPaymentMethodInput = Partial<{
  id: string
  chainId: number
  tokenSymbol: string
  tokenAddress: Address
  mode: PaymentMode
  payoutAddress: Address
  adapterKey: string
  minAmount: string
  maxAmount: string
  enabled: boolean
}>

type MerchantAdminInput = Partial<{
  id: string
  name: string
  description: string
  category: string
  icon: string
  suggestedCost: number
  route: 'DIRECT'
  status: 'draft' | 'verified' | 'disabled'
  websiteUrl: string
  paymentMethods: MerchantAdminPaymentMethodInput[]
}>

interface MerchantAdminRows {
  merchant: MerchantRow
  paymentMethods: MerchantPaymentMethodInsertRow[]
}

function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function requireMerchantAdmin(req: { headers: { authorization?: string } }) {
  const token = process.env.MERCHANT_ADMIN_TOKEN
  if (!token) {
    return { ok: false as const, status: 503, error: 'MERCHANT_ADMIN_TOKEN is not configured' }
  }

  const expected = `Bearer ${token}`
  if (req.headers.authorization !== expected) {
    return { ok: false as const, status: 401, error: 'Unauthorized' }
  }

  return { ok: true as const }
}

export function buildMerchantAdminRows(input: MerchantAdminInput): MerchantAdminRows {
  if (!isNonEmptyString(input.id)) throw new Error('Merchant id is required')
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(input.id)) {
    throw new Error('Merchant id must be lowercase kebab-case')
  }
  if (!isNonEmptyString(input.name)) throw new Error('Merchant name is required')
  if (!isNonEmptyString(input.description)) throw new Error('Merchant description is required')
  if (input.route && input.route !== 'DIRECT') throw new Error('Only DIRECT merchants are supported')
  if (input.status && !['draft', 'verified', 'disabled'].includes(input.status)) {
    throw new Error('Invalid merchant status')
  }
  if (input.suggestedCost !== undefined && (!Number.isFinite(input.suggestedCost) || input.suggestedCost <= 0)) {
    throw new Error('suggestedCost must be greater than 0')
  }

  const paymentMethods = input.paymentMethods ?? []
  const merchant: MerchantRow = {
    id: input.id,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category?.trim() || undefined,
    icon: input.icon?.trim() || undefined,
    suggested_cost: input.suggestedCost ?? 10,
    route: 'DIRECT',
    status: input.status ?? 'draft',
    website_url: input.websiteUrl?.trim() || null,
  }

  return {
    merchant,
    paymentMethods: paymentMethods.map((method) => {
      if (!Number.isInteger(method.chainId) || Number(method.chainId) <= 0) {
        throw new Error('paymentMethods[].chainId must be a positive integer')
      }
      if (!isNonEmptyString(method.tokenSymbol)) {
        throw new Error('paymentMethods[].tokenSymbol is required')
      }
      if (!isAddress(method.tokenAddress)) {
        throw new Error('paymentMethods[].tokenAddress must be a valid address')
      }
      if (!method.mode || !['static_wallet', 'api_invoice', 'payment_link'].includes(method.mode)) {
        throw new Error('paymentMethods[].mode is invalid')
      }
      if (method.mode === 'static_wallet' && !isAddress(method.payoutAddress)) {
        throw new Error('static_wallet payment methods require payoutAddress')
      }
      if (method.mode !== 'static_wallet' && !isNonEmptyString(method.adapterKey)) {
        throw new Error('api_invoice/payment_link methods require adapterKey')
      }

      const chainId = method.chainId as number
      const tokenSymbol = method.tokenSymbol as string
      const mode = method.mode as PaymentMode

      return {
        id: method.id,
        merchant_id: merchant.id,
        chain_id: chainId,
        token_symbol: tokenSymbol.trim(),
        token_address: method.tokenAddress,
        mode,
        payout_address: method.payoutAddress,
        adapter_key: method.adapterKey?.trim() || undefined,
        min_amount: method.minAmount,
        max_amount: method.maxAmount,
        enabled: method.enabled ?? true,
      }
    }),
  }
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
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response
}

merchantsRouter.get('/', async (req, res) => {
  try {
    const chainId = Number(req.query.chainId)
    const tokenAddress = req.query.tokenAddress

    if (!Number.isInteger(chainId) || chainId <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid chainId' })
    }
    if (!isAddress(tokenAddress)) {
      return res.status(400).json({ ok: false, error: 'Invalid tokenAddress' })
    }

    const methodResponse = await supabaseFetch(
      `merchant_payment_methods?chain_id=eq.${chainId}&token_address=ilike.${tokenAddress}&enabled=eq.true&select=*`,
    )
    const methods = (await methodResponse.json()) as MerchantPaymentMethodRow[]
    const merchantIds = [...new Set(methods.map((method) => method.merchant_id))]

    if (merchantIds.length === 0) {
      return res.json({ merchants: [] })
    }

    const encodedIds = merchantIds.map((id) => `"${id}"`).join(',')
    const merchantResponse = await supabaseFetch(
      `merchants?id=in.(${encodedIds})&status=eq.verified&select=*`,
    )
    const merchants = (await merchantResponse.json()) as MerchantRow[]

    return res.json({
      merchants: merchants.map((merchant) => ({
        id: merchant.id,
        name: merchant.name,
        description: merchant.description,
        category: merchant.category,
        icon: merchant.icon,
        suggestedCost: merchant.suggested_cost,
        route: merchant.route,
        status: merchant.status,
        paymentMethods: methods
          .filter((method) => method.merchant_id === merchant.id)
          .map((method) => ({
            id: method.id,
            merchantId: method.merchant_id,
            chainId: method.chain_id,
            tokenSymbol: method.token_symbol,
            tokenAddress: method.token_address,
            mode: method.mode,
            payoutAddress: method.payout_address,
            adapterKey: method.adapter_key,
            enabled: method.enabled,
          })),
      })),
    })
  } catch (err) {
    console.error('[relayer] GET /api/merchants failed', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

merchantsRouter.post('/', async (req, res) => {
  try {
    const auth = requireMerchantAdmin(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }

    const { merchant, paymentMethods } = buildMerchantAdminRows(req.body as MerchantAdminInput)

    await supabaseFetch('merchants?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(merchant),
    })

    if (paymentMethods.length > 0) {
      await supabaseFetch('merchant_payment_methods?on_conflict=merchant_id,chain_id,token_address,mode', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(paymentMethods),
      })
    }

    return res.status(201).json({ ok: true, merchantId: merchant.id, paymentMethods: paymentMethods.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[relayer] POST /api/merchants failed', err)
    return res.status(400).json({ ok: false, error: message })
  }
})
