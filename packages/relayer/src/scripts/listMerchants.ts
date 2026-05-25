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

  const response = await fetch(`${relayerBaseUrl.replace(/\/$/, '')}/api/merchants/admin`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`List failed (${response.status}): ${body}`)
  }

  // eslint-disable-next-line no-console
  console.log(body)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
