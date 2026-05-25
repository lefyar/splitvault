import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { VaultDetail } from './pages/VaultDetail'
import { NewVault } from './pages/NewVault'
import { useWallet } from './hooks/useWallet'
import { CUSD_LABEL } from './lib/contracts'
import { getMiniPayBrowseUrl, isMiniPayProvider } from './lib/minipay'
import { Accordion } from './components/UI'
import './styles.css'

function LandingPage({ isConnecting }: { isConnecting: boolean }) {
    const miniPayUrl = getMiniPayBrowseUrl()
    const isMiniPay = isMiniPayProvider()
    const vaultSignals = ['MiniPay', 'Celo', 'cUSD', 'Shared funding', 'Direct payout', 'Custom merchant', 'Due-cycle settlement']
    const flow = [
        ['01', 'Vault', 'Creator sets amount, day, and merchant wallet.'],
        ['02', 'Members', 'Each wallet funds its own share.'],
        ['03', 'Payout', `${CUSD_LABEL} moves directly to the merchant when due.`],
    ]
    const steps = [
        ['01', 'Create a vault', `Set the shared ${CUSD_LABEL} amount, billing day, and merchant wallet.`, '0x', 'Creator'],
        ['02', 'Invite members', 'Each member funds only their own share from their wallet.', '%', 'Shares'],
        ['03', 'Settle on due date', `When fully funded and due, the vault pays ${CUSD_LABEL} directly to the merchant.`, '->', 'Payout'],
    ]
    const faqItems = [
        {
            title: 'How SplitVault works',
            content: `Create a vault for a shared SaaS bill, add members, and set each cycle's ${CUSD_LABEL} amount. Members fund their own shares, then the contract pays the merchant wallet directly when the cycle is ready.`,
        },
        {
            title: 'Direct merchant route',
            content: `The current production path is direct ${CUSD_LABEL} payout. For launch, use custom merchant wallets you control or recipients that can receive ${CUSD_LABEL} on Celo Mainnet.`,
        },
        {
            title: 'Off-chain integrations',
            content: 'The relayer stores vault metadata in Supabase and keeps the app readable beyond raw contract state. The next integration layer can attach merchant invoices, payment links, and verified recipient metadata before the vault executes payout.',
        },
        {
            title: 'Bridge and card payments',
            content: 'Bridge and card rails are intentionally hidden for now. They add KYC, provider setup, webhook handling, and compliance risk, so they should come after the mainnet direct route is proven.',
        },
    ]

    return (
        <div className="landing-shell -my-6 overflow-hidden bg-[#07070a] text-white sm:-my-8">
            <section className="hero-section relative min-h-[calc(100svh-4rem)] overflow-hidden px-5 py-14 sm:px-8 sm:py-20 lg:px-16 lg:py-24">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(135,25,252,0.36),transparent_28rem),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.12),transparent_24rem),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_38%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#07070a] via-[#07070a]/65 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1fr]">
                    <div className="reveal min-w-0 space-y-7">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-accent)] shadow-[0_0_18px_rgba(135,25,252,0.95)]" />
                            Celo Mainnet · Direct {CUSD_LABEL}
                        </div>
                        <div className="space-y-5">
                            <h2 className="hero-title max-w-4xl text-5xl font-heading leading-[0.9] text-white sm:text-7xl lg:text-[7rem]">
                                Shared payments should run themselves.
                            </h2>
                            <p className="max-w-2xl text-lg leading-8 text-white/62 sm:text-xl">
                                SplitVault gives teams, friends, and communities a one-time setup for recurring {CUSD_LABEL} payments. Members fund their share, then the vault pays a merchant wallet directly when the cycle is due.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            {isMiniPay ? (
                                <p className="inline-flex min-h-12 items-center rounded-full border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white/72">
                                    {isConnecting ? 'Connecting to MiniPay...' : 'MiniPay detected. Wallet connection should open automatically.'}
                                </p>
                            ) : (
                                <a
                                    href={miniPayUrl}
                                    className="haptic inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--color-accent)] px-6 py-3 font-semibold text-white shadow-[0_18px_55px_rgba(135,25,252,0.45)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_70px_rgba(135,25,252,0.55)] active:translate-y-0 active:scale-[0.98]"
                                >
                                    Open in MiniPay
                                </a>
                            )}
                            <a
                                href="#how-it-works"
                                className="haptic inline-flex min-h-12 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] px-6 py-3 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/[0.1]"
                            >
                                How it works
                            </a>
                        </div>
                    </div>

                    <div className="reveal reveal-delay-1 relative min-w-0">
                        <div className="absolute -inset-8 rounded-3xl bg-[color:var(--color-accent)]/25 blur-3xl" />
                        <div className="hero-panel animate-float relative overflow-hidden rounded-3xl border border-white/12 bg-[#101015]/90 p-3 shadow-[0_30px_110px_rgba(0,0,0,0.55)] sm:p-4">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-white/45">Vault status</p>
                                        <h3 className="mt-1 text-2xl font-heading text-white">Custom merchant</h3>
                                    </div>
                                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/12 px-3 py-1 text-xs font-semibold text-emerald-200">Funded</span>
                                </div>
                                <div className="mt-5 rounded-2xl border border-white/10 bg-[#f7f7f2] p-5 text-[#151820]">
                                    <p className="text-sm text-[#151820]/55">Cycle amount</p>
                                    <p className="mt-1 text-6xl font-heading tracking-[-0.05em]">0.01</p>
                                    <p className="text-xs uppercase tracking-[0.18em] text-[#151820]/45">{CUSD_LABEL}</p>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                                        <p className="text-xs text-white/45">Members</p>
                                        <p className="mt-1 text-2xl font-heading text-white">2</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                                        <p className="text-xs text-white/45">Remaining</p>
                                        <p className="mt-1 text-2xl font-heading text-white">0.00</p>
                                    </div>
                                </div>
                                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full w-full rounded-full bg-[color:var(--color-accent)] shadow-[0_0_26px_rgba(135,25,252,0.75)]" />
                                </div>
                            </div>

                            <div className="mt-4 overflow-hidden rounded-full border border-white/10 bg-black/30 py-2">
                                <div className="vault-signal-track flex w-max gap-2">
                                    {[...vaultSignals, ...vaultSignals].map((signal, index) => (
                                        <span key={`${signal}-${index}`} className="shrink-0 rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/58">
                                            {signal}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="reveal relative mt-8 grid gap-px border-y border-white/10 bg-white/10 md:grid-cols-3 lg:mt-12">
                {[
                    ['%', 'Why it exists', 'Shared tools, communities, and creator payments often depend on one person fronting the bill. SplitVault makes each member fund their own share.'],
                    ['[]', 'No pooled custody', 'Funds sit in the vault for the current cycle only. Fully funded cycles pay the merchant; underfunded cycles refund funded members.'],
                    ['->', 'Direct route first', 'The mainnet MVP pays Celo merchant wallets directly. Verified merchant discovery can be added after the custom-wallet route is proven.'],
                ].map(([symbol, title, body]) => (
                    <div key={title} className="bg-[#0b0b0f] p-6 sm:p-8">
                        <div className="mb-8 inline-grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-white/[0.06] font-mono text-sm text-white/72">{symbol}</div>
                        <h3 className="font-heading text-2xl text-white">{title}</h3>
                        <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
                    </div>
                ))}
            </section>

            <section className="relative px-5 py-16 sm:px-8 lg:px-16 lg:py-24">
                <div className="reveal mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent)]">Vault flow</p>
                        <h2 className="mt-2 text-4xl font-heading leading-none text-white sm:text-5xl">A tiny payment system for shared bills.</h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {flow.map(([index, title, body]) => (
                            <div key={title} className="process-card reveal rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs text-white/40">{index}</span>
                                    <span className="h-2 w-2 rounded-full bg-[color:var(--color-accent)] shadow-[0_0_18px_rgba(135,25,252,0.85)]" />
                                </div>
                                <h3 className="mt-8 font-heading text-2xl text-white">{title}</h3>
                                <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="relative px-5 pb-16 sm:px-8 lg:px-16 lg:pb-24">
                <div className="reveal mx-auto mb-8 grid max-w-7xl gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent)]">How it works</p>
                        <h2 className="mt-2 text-4xl font-heading leading-none text-white sm:text-5xl">One setup, one shared payment cycle.</h2>
                    </div>
                    <p className="max-w-2xl text-base leading-7 text-white/56 lg:justify-self-end">
                        Every step maps to one on-chain action: define the shared obligation, collect member shares, and settle directly when the vault is ready.
                    </p>
                </div>
                <div className="mx-auto max-w-7xl space-y-4">
                    {steps.map(([number, title, body, symbol, meta], index) => (
                        <div key={title} className={`reveal reveal-delay-${index + 1} process-row grid gap-4 rounded-2xl border border-white/12 bg-white/[0.075] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.24)] lg:grid-cols-[0.72fr_1.28fr] lg:items-center`}>
                            <div className="flex items-center gap-4">
                                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-[color:var(--color-accent)]/90 font-mono text-sm font-bold text-white shadow-[0_14px_36px_rgba(135,25,252,0.34)]">{number}</div>
                                <div>
                                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-white/52">{meta}</p>
                                    <h3 className="mt-1 font-heading text-2xl text-white sm:text-3xl">{title}</h3>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                                <p className="text-sm leading-6 text-white/68 sm:text-base sm:leading-7">{body}</p>
                                <div className="process-symbol grid h-20 w-full place-items-center rounded-xl border border-white/12 bg-black/24 font-mono text-2xl text-white/70 sm:w-28">
                                    {symbol}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="relative px-5 pb-16 sm:px-8 lg:px-16 lg:pb-24">
                <div className="reveal mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.6fr_1fr]">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent)]">FAQ</p>
                        <h2 className="mt-2 text-4xl font-heading leading-none text-white sm:text-5xl">The direct route, without the fog.</h2>
                    </div>
                    <Accordion items={faqItems} className="gap-3" />
                </div>
            </section>
        </div>
    )
}

function App() {
    const { address, isConnecting } = useWallet()

    return (
        <Router>
            <Layout showFooter={!address}>
                {!address ? (
                    <LandingPage isConnecting={isConnecting} />
                ) : (
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/vault/new" element={<NewVault />} />
                        <Route path="/vault/:id" element={<VaultDetail />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                )}
            </Layout>
        </Router>
    )
}

export default App
