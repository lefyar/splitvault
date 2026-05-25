import React from 'react'
import { useWallet } from '../hooks/useWallet'
import { Button, Card } from './UI'
import { ACTIVE_NETWORK_NAME } from '../lib/contracts'
import { isMiniPayProvider } from '../lib/minipay'

export function Header() {
    const { address, connect, disconnect, isConnecting, walletError } = useWallet()
    const isMiniPay = isMiniPayProvider()

    return (
        <header className="sticky top-0 z-50 border-b border-[color:var(--color-border)] bg-[color:var(--color-bg)]/85 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--color-text)] text-[color:var(--color-bg)] font-heading text-lg">S</span>
                    <div>
                        <h1 className="text-lg sm:text-xl font-heading text-[color:var(--color-text)] leading-none">SplitVault</h1>
                        <p className="hidden sm:block text-[10px] uppercase tracking-[0.24em] text-[color:var(--color-muted)] mt-1">{ACTIVE_NETWORK_NAME}</p>
                    </div>
                </div>

                {address ? (
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="text-right min-w-0">
                            <div className="text-xs sm:text-sm text-[color:var(--color-muted)] truncate">{address.slice(0, 6)}...{address.slice(-4)}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={disconnect}>
                            Disconnect
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        {isMiniPay ? (
                            <span className="text-sm font-medium text-[color:var(--color-muted)]">
                                {isConnecting ? 'Connecting...' : 'MiniPay'}
                            </span>
                        ) : (
                            <Button variant="primary" isLoading={isConnecting} onClick={connect}>
                                Connect Wallet
                            </Button>
                        )}
                    </div>
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
    const legalLinks = [
        { label: 'MiniPay Terms', href: 'https://minipay.to/terms-of-service' },
        { label: 'MiniPay Privacy', href: 'https://minipay.to/privacy-statement' },
        { label: 'Celo Terms', href: 'https://celo.org/user-agreement' },
        { label: 'Celo Privacy', href: 'https://celo.org/privacy-policy' },
        { label: 'Celo Mainnet Disclaimer', href: 'https://docs.celo.org/network/mainnet/disclaimer' },
    ]

    return (
        <footer className="border-t border-[color:var(--color-border)] mt-12 py-6">
            <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[color:var(--color-muted)] space-y-3">
                <p>Split crypto-native SaaS payments on Celo</p>
                <p className="text-xs">Direct merchant route only</p>
                <nav aria-label="Platform legal links" className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
                    {legalLinks.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-[color:var(--color-text)] underline-offset-4 hover:underline"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
            </div>
        </footer>
    )
}

interface LayoutProps {
    children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-[color:var(--color-bg)] flex flex-col text-[color:var(--color-text)]">
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
                {children}
            </main>
            <Footer />
        </div>
    )
}
