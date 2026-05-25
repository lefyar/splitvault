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
  const vaultAddress = requireEnv('REPAIR_VAULT_ADDRESS')
  const chainId = Number(process.env.REPAIR_CHAIN_ID || '42220')

  const response = await fetch(`${relayerBaseUrl.replace(/\/$/, '')}/api/vaults/repair`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      vaultAddress,
      chainId,
      serviceName: process.env.REPAIR_SERVICE_NAME,
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Repair failed (${response.status}): ${body}`)
  }

  // eslint-disable-next-line no-console
  console.log(body)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
