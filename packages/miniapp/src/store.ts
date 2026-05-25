import { create } from 'zustand'
import { Address, VaultWithMeta } from './types'

interface AppStore {
  // Wallet state
  address: Address | null
  balance: bigint // cUSD balance
  isConnecting: boolean
  isConnected: boolean
  walletError: string | null

  // Vault state
  vaults: VaultWithMeta[]
  activeVaultId: Address | null
  isLoadingVaults: boolean

  // Actions
  setAddress: (address: Address | null) => void
  setBalance: (balance: bigint) => void
  setConnecting: (connecting: boolean) => void
  setConnected: (connected: boolean) => void
  setWalletError: (error: string | null) => void
  setVaults: (vaults: VaultWithMeta[]) => void
  addVault: (vault: VaultWithMeta) => void
  setActiveVault: (id: Address | null) => void
  setLoadingVaults: (loading: boolean) => void
  updateVaultFunding: (vaultId: Address, fundingStatus: any) => void
}

export const useStore = create<AppStore>((set) => ({
  // Initial state
  address: null,
  balance: 0n,
  isConnecting: false,
  isConnected: false,
  walletError: null,
  vaults: [],
  activeVaultId: null,
  isLoadingVaults: false,

  // Actions
  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnected: (connected) => set({ isConnected: connected }),
  setWalletError: (error) => set({ walletError: error }),
  setVaults: (vaults) => set({ vaults }),
  addVault: (vault) => set((state) => ({ vaults: [...state.vaults, vault] })),
  setActiveVault: (id) => set({ activeVaultId: id }),
  setLoadingVaults: (loading) => set({ isLoadingVaults: loading }),
  updateVaultFunding: (vaultId, fundingStatus) =>
    set((state) => ({
      vaults: state.vaults.map((v) =>
        v.id === vaultId ? { ...v, fundingStatus } : v
      ),
    })),
}))
