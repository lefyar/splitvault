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
