import { describe, expect, it } from 'vitest'
import { handlePaymentExecutedRequest } from './paymentExecuted.js'

describe('POST /events/paymentExecuted', () => {
  it('returns 200 for DIRECT', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        timestamp: 1710000000,
        route: 'DIRECT',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 200 for BRIDGE', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        timestamp: 1710000000,
        route: 'BRIDGE',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 200 for CARD', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        timestamp: 1710000000,
        route: 'CARD',
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 400 for invalid route', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        timestamp: 1710000000,
        route: 'INVALID' as never,
      })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('Invalid route: INVALID (expected DIRECT|BRIDGE|CARD)')
  })

  it('returns 400 when vaultAddress is missing', async () => {
    const res = await handlePaymentExecutedRequest({
        amount: '100',
        timestamp: 1710000000,
        route: 'DIRECT',
      })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('Invalid or missing vaultAddress (expected 0x-prefixed 40-hex address)')
  })

  it('returns 400 when amount is missing', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        timestamp: 1710000000,
        route: 'DIRECT',
      })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('Invalid or missing amount (expected string)')
  })

  it('returns 400 when timestamp is missing', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        route: 'DIRECT',
      })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('Invalid or missing timestamp (expected number)')
  })

  it('returns 400 when timestamp is not a number', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        timestamp: 'abc' as never,
        route: 'DIRECT',
      })

    expect(res.status).toBe(400)
    expect(res.body.ok).toBe(false)
    expect(res.body.error).toBe('Invalid or missing timestamp (expected number)')
  })

  it('defaults route to DIRECT when omitted', async () => {
    const res = await handlePaymentExecutedRequest({
        vaultAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        timestamp: 1710000000,
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
