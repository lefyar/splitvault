// CARD handler stub (to be implemented in v0.4 once virtual Visa card top-up loop is ready)
export async function handlePaymentExecutedCard(_input: {
  vaultAddress: string
  amount: string
  timestamp: number
}) {
  // eslint-disable-next-line no-console
  console.log('[relayer] CARD PaymentExecuted stub')
}

