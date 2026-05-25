import { Router } from 'express'
import { createPublicClient, createWalletClient, defineChain, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { requireMerchantAdmin } from './merchants.js'

export const upkeepRouter = Router()

type Address = `0x${string}`

const ZERO_BYTES = '0x'
const CELO_CHAIN_ID = 42220
const CELO_SEPOLIA_CHAIN_ID = 11142220
const DEFAULT_CELO_RPC_URL = 'https://forno.celo.org'
const DEFAULT_CELO_SEPOLIA_RPC_URL = 'https://forno.celo-sepolia.celo-testnet.org'

const FACTORY_UPKEEP_ABI = [
  {
    type: 'function',
    name: 'checkUpkeep',
    stateMutability: 'view',
    inputs: [{ name: 'checkData', type: 'bytes' }],
    outputs: [
      { name: 'upkeepNeeded', type: 'bool' },
      { name: 'performData', type: 'bytes' },
    ],
  },
  {
    type: 'function',
    name: 'performUpkeep',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'performData', type: 'bytes' }],
    outputs: [],
  },
] as const

function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

function isPrivateKey(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value)
}

function getChainId() {
  return Number(process.env.CELO_CHAIN_ID || process.env.VITE_CELO_CHAIN_ID || CELO_CHAIN_ID)
}

function assertMainnetAllowed(chainId: number) {
  if (chainId === CELO_CHAIN_ID && process.env.ALLOW_MAINNET_UPKEEP !== 'true') {
    throw new Error('Mainnet upkeep is disabled. Set ALLOW_MAINNET_UPKEEP=true to enable it explicitly.')
  }
}

function getRpcUrl(chainId: number) {
  if (chainId === CELO_CHAIN_ID) return process.env.CELO_RPC_URL || DEFAULT_CELO_RPC_URL
  if (chainId === CELO_SEPOLIA_CHAIN_ID) return process.env.CELO_SEPOLIA_RPC_URL || DEFAULT_CELO_SEPOLIA_RPC_URL
  throw new Error('Unsupported chainId')
}

function getFactoryAddress(): Address {
  const factory = process.env.FACTORY_ADDRESS || process.env.VAULT_FACTORY_ADDRESS || process.env.VITE_VAULT_FACTORY_ADDRESS
  if (!isAddress(factory)) throw new Error('FACTORY_ADDRESS is required')
  return factory
}

function getRelayerPrivateKey(): Address {
  const rawKey = process.env.RELAYER_PRIVATE_KEY
  if (!rawKey) throw new Error('RELAYER_PRIVATE_KEY is required')

  const key = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`
  if (!isPrivateKey(key)) throw new Error('RELAYER_PRIVATE_KEY must be a 32-byte hex private key')
  return key
}

function createClients() {
  const chainId = getChainId()
  const rpcUrl = getRpcUrl(chainId)
  const chain = defineChain({
    id: chainId,
    name: chainId === CELO_CHAIN_ID ? 'Celo' : 'Celo Sepolia',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  })
  const transport = http(rpcUrl)

  return {
    chainId,
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({
      account: privateKeyToAccount(getRelayerPrivateKey()),
      chain,
      transport,
    }),
  }
}

export async function checkFactoryUpkeep() {
  const { chainId, publicClient } = createClients()
  const factory = getFactoryAddress()
  const [upkeepNeeded, performData] = await publicClient.readContract({
    address: factory,
    abi: FACTORY_UPKEEP_ABI,
    functionName: 'checkUpkeep',
    args: [ZERO_BYTES],
  }) as readonly [boolean, `0x${string}`]

  return { chainId, factory, upkeepNeeded, performData }
}

export async function runFactoryUpkeep() {
  const status = await checkFactoryUpkeep()
  if (!status.upkeepNeeded) {
    return { ...status, performed: false as const }
  }
  assertMainnetAllowed(status.chainId)

  const { publicClient, walletClient } = createClients()
  const hash = await walletClient.writeContract({
    address: status.factory,
    abi: FACTORY_UPKEEP_ABI,
    functionName: 'performUpkeep',
    args: [status.performData || ZERO_BYTES],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })

  return {
    ...status,
    performed: true as const,
    hash,
    blockNumber: receipt.blockNumber.toString(),
  }
}

export function startUpkeepScheduler() {
  if (process.env.ENABLE_UPKEEP_CRON !== 'true') {
    return
  }

  const intervalMs = Number(process.env.UPKEEP_INTERVAL_MS || 300_000)
  if (!Number.isFinite(intervalMs) || intervalMs < 60_000) {
    throw new Error('UPKEEP_INTERVAL_MS must be at least 60000')
  }

  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await runFactoryUpkeep()
      // eslint-disable-next-line no-console
      console.log('[relayer] upkeep cron tick', result)
    } catch (err) {
      console.error('[relayer] upkeep cron failed', err)
    } finally {
      running = false
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[relayer] upkeep cron enabled every ${intervalMs}ms`)
  setInterval(tick, intervalMs)
  void tick()
}

upkeepRouter.get('/status', async (req, res) => {
  try {
    const auth = requireMerchantAdmin(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }

    return res.json({ ok: true, ...(await checkFactoryUpkeep()) })
  } catch (err) {
    console.error('[relayer] GET /api/upkeep/status failed', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

upkeepRouter.post('/run', async (req, res) => {
  try {
    const auth = requireMerchantAdmin(req)
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.error })
    }

    return res.json({ ok: true, ...(await runFactoryUpkeep()) })
  } catch (err) {
    console.error('[relayer] POST /api/upkeep/run failed', err)
    return res.status(500).json({ ok: false, error: String(err) })
  }
})
