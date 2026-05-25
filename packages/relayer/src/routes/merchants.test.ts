import { afterEach, describe, expect, it } from 'vitest'
import { buildMerchantAdminRows, requireMerchantAdmin } from './merchants.js'

describe('merchant admin helpers', () => {
  it('builds Supabase rows for a static wallet merchant', () => {
    const rows = buildMerchantAdminRows({
      id: 'launch-test-wallet',
      name: 'Launch test wallet',
      description: 'Internal smoke-test merchant.',
      category: 'internal',
      icon: 'TEST',
      suggestedCost: 1,
      status: 'verified',
      paymentMethods: [
        {
          chainId: 11142220,
          tokenSymbol: 'MockcUSD',
          tokenAddress: '0xBFa30e9f862776349b881875027990223bf122bD',
          mode: 'static_wallet',
          payoutAddress: '0x8D9A2a8f2EA0Fc3Cf3BfF0F90cfeA2D7e9797f15',
        },
      ],
    })

    expect(rows.merchant).toMatchObject({
      id: 'launch-test-wallet',
      suggested_cost: 1,
      route: 'DIRECT',
      status: 'verified',
    })
    expect(rows.paymentMethods[0]).toMatchObject({
      merchant_id: 'launch-test-wallet',
      chain_id: 11142220,
      mode: 'static_wallet',
      enabled: true,
    })
  })

  it('rejects static wallet methods without a payout address', () => {
    expect(() => buildMerchantAdminRows({
      id: 'bad-merchant',
      name: 'Bad Merchant',
      description: 'Missing payout address.',
      paymentMethods: [
        {
          chainId: 11142220,
          tokenSymbol: 'MockcUSD',
          tokenAddress: '0xBFa30e9f862776349b881875027990223bf122bD',
          mode: 'static_wallet',
        },
      ],
    })).toThrow('static_wallet payment methods require payoutAddress')
  })

  it('rejects non-kebab merchant ids', () => {
    expect(() => buildMerchantAdminRows({
      id: 'Bad Merchant',
      name: 'Bad Merchant',
      description: 'Invalid id.',
    })).toThrow('Merchant id must be lowercase kebab-case')
  })
})

describe('merchant admin auth', () => {
  afterEach(() => {
    delete process.env.MERCHANT_ADMIN_TOKEN
  })

  it('returns 503 when admin token is not configured', () => {
    const res = requireMerchantAdmin({ headers: {} })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(503)
      expect(res.error).toBe('MERCHANT_ADMIN_TOKEN is not configured')
    }
  })

  it('returns 401 when bearer token is missing', () => {
    process.env.MERCHANT_ADMIN_TOKEN = 'secret'

    const res = requireMerchantAdmin({ headers: {} })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(401)
      expect(res.error).toBe('Unauthorized')
    }
  })

  it('accepts the configured bearer token', () => {
    process.env.MERCHANT_ADMIN_TOKEN = 'secret'

    const res = requireMerchantAdmin({ headers: { authorization: 'Bearer secret' } })

    expect(res.ok).toBe(true)
  })
})
