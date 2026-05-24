import React from 'react'
import { useWallet } from '../hooks/useWallet'
import { Button } from './UI'
import { formatUnits } from 'viem'

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
        <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 z-50">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-teal-700 text-white font-bold">S</span>
                    <h1 className="text-xl font-bold text-gray-900">SplitVault</h1>
                </div>

                {address ? (
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="text-right min-w-0">
                            <div className="text-xs sm:text-sm text-gray-600 truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
                            <div className="text-xs sm:text-sm font-semibold text-teal-800">
                                {formatCusd(balance)} cUSD
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
        <footer className="bg-white border-t border-gray-200 mt-12 py-6">
            <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-600">
                <p>Split SaaS subscriptions on Celo L2 with friends</p>
                <p className="mt-2 text-xs">Built on Celo</p>
            </div>
        </footer>
    )
}

interface LayoutProps {
    children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8">
                {children}
            </main>
            <Footer />
        </div>
    )
}
