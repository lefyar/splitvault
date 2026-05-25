import React from 'react'
import { useWallet } from '../hooks/useWallet'
import { Button, Card } from './UI'
import { ACTIVE_NETWORK_NAME } from '../lib/contracts'

export function Header() {
    const { address, connect, disconnect, isConnecting, walletError } = useWallet()

    return (
        <header className="sticky top-0 z-50 border-b border-[#192837]/10 bg-[#F2F2EE]/85 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#192837] text-white font-heading text-lg">S</span>
                    <div>
                        <h1 className="text-lg sm:text-xl font-heading text-[#192837] leading-none">SplitVault</h1>
                        <p className="hidden sm:block text-[10px] uppercase tracking-[0.24em] text-[#192837]/45 mt-1">{ACTIVE_NETWORK_NAME}</p>
                    </div>
                </div>

                {address ? (
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="text-right min-w-0">
                            <div className="text-xs sm:text-sm text-[#192837]/55 truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={disconnect}>
                            Disconnect
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" isLoading={isConnecting} onClick={connect}>
                        Connect Wallet
                    </Button>
                )}
            </div>
            {walletError && !address && (
                <div className="max-w-6xl mx-auto px-4 pb-3">
                    <Card className="bg-amber-50 border-amber-200 px-4 py-3">
                        <p className="text-sm text-amber-950">{walletError}</p>
                        <p className="text-xs text-amber-900 mt-1">
                            Open SplitVault inside MiniPay or a mobile wallet browser with Celo support, then try again.
                        </p>
                    </Card>
                </div>
            )}
        </header>
    )
}

export function Footer() {
    return (
        <footer className="border-t border-[#192837]/10 mt-12 py-6">
            <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[#192837]/50">
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
        <div className="min-h-screen bg-[#F2F2EE] flex flex-col text-[#192837]">
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
                {children}
            </main>
            <Footer />
        </div>
    )
}
