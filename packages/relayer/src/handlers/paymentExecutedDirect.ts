export async function handlePaymentExecutedDirect(input: {
  vaultAddress: string
  amount: string
  timestamp: number
}) {
  // DIRECT route: for v0.2, the vault.executePayment() already performs the transfer.
  // The relayer can be a no-op for now.
  // Keeping this handler makes it easy to extend later (confirmPaymentAndReset,
  // logging, DB writes, notifications).

  // eslint-disable-next-line no-console
  console.log('[relayer] DIRECT PaymentExecuted', input)
}

