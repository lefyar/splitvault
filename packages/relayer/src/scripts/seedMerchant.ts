import dotenv from 'dotenv'

dotenv.config({ path: '../../.env.local' })

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main() {
  const relayerBaseUrl = requireEnv('RELAYER_BASE_URL')
  const adminToken = requireEnv('MERCHANT_ADMIN_TOKEN')

  const merchantId = process.env.MERCHANT_SEED_ID || 'launch-test-wallet'
  const tokenSymbol = process.env.MERCHANT_SEED_TOKEN_SYMBOL || 'MockcUSD'
  const chainId = Number(process.env.MERCHANT_SEED_CHAIN_ID || '11142220')
  const tokenAddress = requireEnv('MERCHANT_SEED_TOKEN_ADDRESS')
  const payoutAddress = requireEnv('MERCHANT_SEED_PAYOUT_ADDRESS')

  const response = await fetch(`${relayerBaseUrl.replace(/\/$/, '')}/api/merchants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: merchantId,
      name: process.env.MERCHANT_SEED_NAME || 'Launch test wallet',
      description: process.env.MERCHANT_SEED_DESCRIPTION || 'Internal direct-payout merchant for tiny production smoke tests.',
      category: process.env.MERCHANT_SEED_CATEGORY || 'internal',
      icon: process.env.MERCHANT_SEED_ICON || 'TEST',
      suggestedCost: Number(process.env.MERCHANT_SEED_SUGGESTED_COST || '1'),
      status: process.env.MERCHANT_SEED_STATUS || 'verified',
      paymentMethods: [
        {
          chainId,
          tokenSymbol,
          tokenAddress,
          mode: 'static_wallet',
          payoutAddress,
          enabled: true,
        },
      ],
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Seed failed (${response.status}): ${body}`)
  }

  // eslint-disable-next-line no-console
  console.log(body)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
