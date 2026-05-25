import { createWalletClient, createPublicClient, custom, defineChain, http } from 'viem'
import { celo } from 'viem/chains'
import type { Address } from '../types'
import { ACTIVE_CHAIN_ID, ACTIVE_RPC_URL, CELO_CHAIN_ID, CELO_SEPOLIA_CHAIN_ID, DEFAULT_CELO_SEPOLIA_RPC_URL } from './contracts'

// MiniPay injects window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

let walletClient: any = null
let publicClient: any = null

export function isMiniPayProvider() {
  return Boolean(window.ethereum?.isMiniPay)
}

export function getMiniPayBrowseUrl(url = window.location.href) {
  return `https://link.minipay.xyz/browse?url=${encodeURIComponent(url)}`
}

const celoSepolia = defineChain({
  id: CELO_SEPOLIA_CHAIN_ID,
  name: 'Celo Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'CELO',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: {
      http: [DEFAULT_CELO_SEPOLIA_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Celo Sepolia Blockscout',
      url: 'https://celo-sepolia.blockscout.com',
    },
  },
})

const activeChain = ACTIVE_CHAIN_ID === CELO_CHAIN_ID ? celo : celoSepolia

function createCeloPublicClient() {
  return createPublicClient({
    chain: activeChain,
    transport: http(ACTIVE_RPC_URL),
  })
}

function createMiniPayWalletClient() {
  if (!window.ethereum) {
    throw new Error('MiniPay wallet not found. Make sure you are using the MiniPay app.')
  }

  return createWalletClient({
    chain: activeChain,
    transport: custom(window.ethereum),
  })
}

export async function initializeMiniPay() {
  if (!window.ethereum) {
    throw new Error('MiniPay wallet not found. Make sure you are using the MiniPay app.')
  }

  try {
    walletClient = createMiniPayWalletClient()
    publicClient = createCeloPublicClient()

    // Request account access
    const addresses = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })

    return addresses[0] as Address
  } catch (err) {
    console.error('Failed to initialize MiniPay:', err)
    throw err
  }
}

export function getWalletClient(): any {
  if (!walletClient) {
    walletClient = createMiniPayWalletClient()
  }
  return walletClient
}

export function getPublicClient(): any {
  if (!publicClient) {
    publicClient = createCeloPublicClient()
  }
  return publicClient
}

export async function getConnectedAddress(): Promise<Address | undefined> {
  if (!window.ethereum) return undefined

  const addresses = await window.ethereum?.request({
    method: 'eth_accounts',
  })
  return addresses?.[0] as Address | undefined
}

export async function switchToCelo() {
  if (!window.ethereum) {
    throw new Error('Wallet not found. Open SplitVault inside MiniPay or a mobile wallet browser.')
  }

  const chainId = `0x${ACTIVE_CHAIN_ID.toString(16)}`
  const isMainnet = ACTIVE_CHAIN_ID === CELO_CHAIN_ID

  try {
    await window.ethereum?.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    })
  } catch (err: any) {
    if (err.code === 4902) {
      await window.ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: isMainnet ? 'Celo' : 'Celo Sepolia',
            rpcUrls: [ACTIVE_RPC_URL],
            nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
            blockExplorerUrls: [isMainnet ? 'https://celoscan.io' : 'https://celo-sepolia.blockscout.com'],
          },
        ],
      })
      return
    }
    throw err
  }
}

export async function ensureCorrectChain() {
  if (!window.ethereum) {
    throw new Error('MiniPay wallet not found. Make sure you are using the MiniPay app.')
  }

  const chainId = await window.ethereum.request({ method: 'eth_chainId' })
  const expected = `0x${ACTIVE_CHAIN_ID.toString(16)}`

  if (String(chainId).toLowerCase() !== expected.toLowerCase()) {
    await switchToCelo()
  }
}
