import { useEffect } from 'react'
import { useStore } from '../store'
import { ensureCorrectChain, getWalletClient, initializeMiniPay, getConnectedAddress, switchToCelo } from '../lib/minipay'
import { getPublicClient } from '../lib/minipay'
import { CUSD_ADDRESS, ERC20_ABI } from '../lib/contracts'
import { Address } from '../types'
import { loadVaultsForMember } from '../lib/vaults'

function getWalletErrorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  return String(err)
}

export function useWallet() {
  const { address, isConnecting, balance, walletError, setAddress, setConnecting, setBalance, setConnected, setWalletError, setVaults, setLoadingVaults } = useStore()

  const connect = async () => {
    try {
      setConnecting(true)
      const addr = await initializeMiniPay()
      await switchToCelo()
      setAddress(addr)
      setConnected(true)
      setWalletError(null)
      await updateBalance(addr)
      await loadVaults(addr)
    } catch (err) {
      console.error('Wallet connection failed:', err)
      setWalletError(getWalletErrorMessage(err))
    } finally {
      setConnecting(false)
    }
  }

  const updateBalance = async (addr: Address) => {
    try {
      const client = getPublicClient()
      const bal = await client.readContract({
        address: CUSD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [addr],
      })
      setBalance(bal as bigint)
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  const loadVaults = async (addr: Address) => {
    try {
      setLoadingVaults(true)
      const vaults = await loadVaultsForMember(addr)
      setVaults(vaults)
    } catch (err) {
      console.error('Failed to load vaults:', err)
      setVaults([])
    } finally {
      setLoadingVaults(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setBalance(0n)
      setConnected(false)
      setWalletError(null)
      setVaults([])
  }

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const addr = await getConnectedAddress()
        if (addr) {
          await ensureCorrectChain()
          getWalletClient()
          setAddress(addr as Address)
          setConnected(true)
          await updateBalance(addr as Address)
          await loadVaults(addr as Address)
        }
      } catch (err) {
        console.error('Failed to check connection:', err)
      }
    }

    checkConnection()
  }, [])

  return {
    address,
    balance,
    walletError,
    isConnecting,
    connect,
    disconnect,
    updateBalance: () => address && updateBalance(address),
    loadVaults: () => address && loadVaults(address),
  }
}
