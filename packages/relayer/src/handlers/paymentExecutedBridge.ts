// BRIDGE handler stub (to be implemented in v0.3 once Stripe Bridge API + webhook loop is ready)
export async function handlePaymentExecutedBridge(_input: {
  vaultAddress: string
  amount: string
  timestamp: number
}) {
  // eslint-disable-next-line no-console
  console.log('[relayer] BRIDGE PaymentExecuted stub')
}

