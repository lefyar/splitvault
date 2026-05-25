export async function handlePaymentExecutedDirect(input: {
  vaultAddress: string
  amount: string
  timestamp: number
  txHash?: string
}) {
  // DIRECT route: for v0.2, the vault.executePayment() already performs the transfer.
  // The relayer records an off-chain reconciliation row when Supabase is configured.

  // eslint-disable-next-line no-console
  console.log('[relayer] DIRECT PaymentExecuted', input)

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payment_events`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      vault_addr: input.vaultAddress,
      event_type: 'payment_executed_direct',
      tx_hash: input.txHash,
      amount: input.amount,
      event_timestamp: new Date(input.timestamp * 1000).toISOString(),
    }),
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }
}
