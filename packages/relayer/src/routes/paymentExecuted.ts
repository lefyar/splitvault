import { Router } from 'express'
import { handlePaymentExecutedDirect } from '../handlers/paymentExecutedDirect'

export const paymentExecutedRouter = Router()

// Manual trigger for local dev/testing.
// In production this is called by chain event listener.
paymentExecutedRouter.post('/paymentExecuted', async (req, res) => {
  try {
    const { vaultAddress, amount, timestamp } = req.body as {
      vaultAddress: string
      amount: string
      timestamp: number
    }

    await handlePaymentExecutedDirect({ vaultAddress, amount, timestamp })

    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) })
  }
})

