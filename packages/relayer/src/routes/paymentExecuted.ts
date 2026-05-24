import { Router } from 'express'
import { handlePaymentExecutedDirect } from '../handlers/paymentExecutedDirect.js'
import { handlePaymentExecutedBridge } from '../handlers/paymentExecutedBridge.js'
import { handlePaymentExecutedCard } from '../handlers/paymentExecutedCard.js'

export const paymentExecutedRouter = Router()

// Manual trigger for local dev/testing.
// In production this is called by chain event listener.
type PaymentRoute = 'DIRECT' | 'BRIDGE' | 'CARD'
type PaymentExecutedBody = Partial<{
  vaultAddress: string
  amount: string
  timestamp: number
  route: PaymentRoute
}>

type PaymentExecutedResult = {
  status: number
  body: { ok: boolean; error?: string }
}

function isValidAddress(addr: unknown): addr is string {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr)
}

export async function handlePaymentExecutedRequest(
  body: PaymentExecutedBody,
): Promise<PaymentExecutedResult> {
  try {
    const { vaultAddress, amount, timestamp, route } = body

    if (!isValidAddress(vaultAddress)) {
      return {
        status: 400,
        body: {
          ok: false,
          error: 'Invalid or missing vaultAddress (expected 0x-prefixed 40-hex address)',
        },
      }
    }

    if (typeof amount !== 'string' || amount.length === 0) {
      return {
        status: 400,
        body: { ok: false, error: 'Invalid or missing amount (expected string)' },
      }
    }

    if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
      return {
        status: 400,
        body: { ok: false, error: 'Invalid or missing timestamp (expected number)' },
      }
    }

    const effectiveRoute: PaymentRoute = route ?? 'DIRECT'

    if (effectiveRoute === 'DIRECT') {
      await handlePaymentExecutedDirect({ vaultAddress, amount, timestamp })
    } else if (effectiveRoute === 'BRIDGE') {
      await handlePaymentExecutedBridge({ vaultAddress, amount, timestamp })
    } else if (effectiveRoute === 'CARD') {
      await handlePaymentExecutedCard({ vaultAddress, amount, timestamp })
    } else {
      return {
        status: 400,
        body: {
          ok: false,
          error: `Invalid route: ${String(route)} (expected DIRECT|BRIDGE|CARD)`,
        },
      }
    }

    return { status: 200, body: { ok: true } }
  } catch (err) {
    return { status: 500, body: { ok: false, error: String(err) } }
  }
}

paymentExecutedRouter.post('/paymentExecuted', async (req, res) => {
  const result = await handlePaymentExecutedRequest(req.body as PaymentExecutedBody)
  res.status(result.status).json(result.body)
})
