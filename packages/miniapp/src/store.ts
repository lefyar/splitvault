import { create } from 'zustand'
import { Address, VaultWithMeta } from './types'

interface AppStore {
  // Wallet state
  address: Address | null
  balance: bigint // cUSD balance
  isConnecting: boolean
  isConnected: boolean
  walletError: string | null
  theme: 'light' | 'dark'

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
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
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
  theme: (typeof localStorage !== 'undefined' && localStorage.getItem('splitvault-theme') === 'dark') ? 'dark' : 'light',
  vaults: [],
  activeVaultId: null,
  isLoadingVaults: false,

  // Actions
  setAddress: (address) => set({ address }),
  setBalance: (balance) => set({ balance }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setConnected: (connected) => set({ isConnected: connected }),
  setWalletError: (error) => set({ walletError: error }),
  setTheme: (theme) => {
    localStorage.setItem('splitvault-theme', theme)
    document.documentElement.dataset.theme = theme
    set({ theme })
  },
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('splitvault-theme', theme)
    document.documentElement.dataset.theme = theme
    return { theme }
  }),
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
