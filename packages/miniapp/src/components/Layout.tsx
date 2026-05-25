import React, { useEffect, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { Button, Card } from './UI'
import { isMiniPayProvider } from '../lib/minipay'

export function Header() {
    const { address, connect, disconnect, isConnecting, walletError } = useWallet()
    const isMiniPay = isMiniPayProvider()
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 24)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header className="sticky top-0 z-[100] isolate w-full px-0 py-0 sm:transition-all sm:duration-300">
            <div
                className={`mx-auto flex items-center justify-between gap-3 px-4 transition-all duration-300 ease-out ${isScrolled
                    ? 'max-w-4xl rounded-xl bg-[#07070a]/78 py-2 shadow-[0_14px_48px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.06] backdrop-blur-2xl sm:mt-4'
                    : 'max-w-6xl bg-transparent py-3 ring-0'
                    }`}
            >
                <div className="flex min-w-0 items-center">
                    <h1 className="text-xl sm:text-2xl text-[color:var(--color-text)] leading-none">SplitVault</h1>
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
                            <Button variant="primary" size="sm" isLoading={isConnecting} onClick={connect}>
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
    const projectLinks = [
        { label: 'GitHub', value: 'lefyar/splitvault', href: 'https://github.com/lefyar/splitvault' },
        { label: 'Talent', value: 'Proof of Ship page', href: 'https://talent.app/~/projects/567f0895-9902-470f-ad10-a40ec2fbac11' },
    ]
    const legalLinks = [
        { label: 'MiniPay Terms', href: 'https://minipay.to/terms-of-service' },
        { label: 'MiniPay Privacy', href: 'https://minipay.to/privacy-statement' },
        { label: 'Celo Terms', href: 'https://celo.org/user-agreement' },
        { label: 'Celo Privacy', href: 'https://celo.org/privacy-policy' },
        { label: 'Celo Mainnet Disclaimer', href: 'https://docs.celo.org/network/mainnet/disclaimer' },
    ]

    return (
        <footer className="border-t border-[color:var(--color-border)] mt-16 bg-black/10">
            <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
                <div className="grid gap-8 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1.2fr_1fr_1fr]">
                    <div className="space-y-3">
                        <p className="text-xl font-semibold text-[color:var(--color-text)]">SplitVault</p>
                        <p className="max-w-sm text-sm leading-6 text-[color:var(--color-muted)]">
                            Shared recurring cUSD vaults for direct merchant payments on Celo.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Project</h2>
                        <nav aria-label="Project links" className="mt-4 grid gap-3 text-sm">
                            {projectLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group inline-flex flex-col gap-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]"
                                >
                                    <span className="text-xs uppercase tracking-[0.14em] opacity-70">{link.label}</span>
                                    <span className="underline-offset-4 group-hover:underline">{link.value}</span>
                                </a>
                            ))}
                        </nav>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Terms & Policy</h2>
                        <nav aria-label="Platform legal links" className="mt-4 grid gap-2 text-sm">
                            {legalLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] underline-offset-4 hover:underline"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className="mt-8 border-t border-[color:var(--color-border)] pt-5 text-xs text-[color:var(--color-muted)]">
                    © {new Date().getFullYear()} SplitVault. All rights reserved.
                </div>
            </div>
        </footer>
    )
}

interface LayoutProps {
    children: React.ReactNode
    showFooter?: boolean
}

export function Layout({ children, showFooter = false }: LayoutProps) {
    return (
        <div className="min-h-screen bg-[color:var(--color-bg)] flex flex-col text-[color:var(--color-text)]">
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
                {children}
            </main>
            {showFooter && <Footer />}
        </div>
    )
}
