import React from 'react'
import { useWallet } from '../hooks/useWallet'
import { Button } from './UI'
import { formatUnits } from 'viem'
import { ACTIVE_NETWORK_NAME, CUSD_LABEL } from '../lib/contracts'

function formatCusd(balance: bigint) {
    const value = Number(formatUnits(balance, 18))
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

export function Header() {
    const { address, balance, connect, disconnect, isConnecting } = useWallet()

    return (
        <header className="sticky top-0 z-50 border-b border-primary/10 bg-black/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-black font-bold">S</span>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-primary leading-none">SplitVault</h1>
                        <p className="hidden sm:block text-[10px] uppercase tracking-[0.24em] text-primary/45 mt-1">{ACTIVE_NETWORK_NAME}</p>
                    </div>
                </div>

                {address ? (
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="text-right min-w-0">
                            <div className="text-xs sm:text-sm text-primary/55 truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
                            <div className="text-xs sm:text-sm font-semibold text-primary">
                                {formatCusd(balance)} {CUSD_LABEL}
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={disconnect}>
                            Disconnect
                        </Button>
                    </div>
                ) : (
                    <Button isLoading={isConnecting} onClick={connect}>
                        Connect Wallet
                    </Button>
                )}
            </div>
        </header>
    )
}

export function Footer() {
    return (
        <footer className="border-t border-primary/10 mt-12 py-6">
            <div className="max-w-6xl mx-auto px-4 text-center text-sm text-primary/50">
                <p>Split crypto-native SaaS payments on Celo</p>
                <p className="mt-2 text-xs">Direct merchant route only</p>
            </div>
        </footer>
    )
}

interface LayoutProps {
    children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-black bg-noise flex flex-col text-primary">
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
                {children}
            </main>
            <Footer />
        </div>
    )
}
