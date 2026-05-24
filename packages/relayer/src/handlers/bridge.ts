import express, { Request, Response } from 'express'

export const bridgeRouter = express.Router()

// Mock KYC status - in production, this would:
// 1. Look up wallet in bridge_customers table
// 2. Call Bridge API GET /v1/kyc_links/{customerId}
// 3. Return cached status + KYC link
const kycCache: Record<string, { status: 'approved' | 'pending' | 'not_started' | 'rejected'; kycLink?: string }> = {}

bridgeRouter.get('/kyc-status', async (req: Request, res: Response) => {
  const { wallet } = req.query

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  // Validate wallet format
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address format' })
  }

  // TODO: In production:
  // 1. Query bridge_customers table for this wallet
  // 2. If exists, get bridge_customer_id and kyc_status
  // 3. Call Bridge API to get current status
  // 4. Update DB if changed
  // 5. Return status + kycLink if not_started

  // For now, return mock approved status
  // In testing, use different wallets to test different statuses:
  // - 0x0000000000000000000000000000000000000001 → not_started (needs KYC)
  // - 0x0000000000000000000000000000000000000002 → pending
  // - 0x0000000000000000000000000000000000000003 → approved

  let status: 'approved' | 'pending' | 'not_started' | 'rejected' = 'approved'
  let kycLink: string | undefined

  if (wallet.toLowerCase().endsWith('0001')) {
    status = 'not_started'
    kycLink = 'https://kyc.bridge.xyz/verify?token=mock_token'
  } else if (wallet.toLowerCase().endsWith('0002')) {
    status = 'pending'
  } else if (wallet.toLowerCase().endsWith('0003')) {
    status = 'approved'
  }

  // Cache the result
  kycCache[wallet.toLowerCase()] = { status, kycLink }

  return res.json({
    status,
    kycLink,
    lastCheckedAt: Date.now(),
  })
})

// Webhook handler for Bridge KYC updates
// Called by Bridge when KYC status changes
bridgeRouter.post('/webhooks/kyc-updated', async (req: Request, res: Response) => {
  const { customerId, status } = req.body

  if (!customerId || !status) {
    return res.status(400).json({ error: 'Missing customerId or status' })
  }

  // TODO: In production:
  // 1. Verify webhook signature
  // 2. Update bridge_customers table: kyc_status = status
  // 3. Send push notification to user (if status === 'approved')
  // 4. Trigger re-render on Mini App via WebSocket or polling

  console.log(`[Bridge KYC] Updated ${customerId} → ${status}`)

  return res.json({ received: true })
})
