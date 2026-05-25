import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { VaultDetail } from './pages/VaultDetail'
import { NewVault } from './pages/NewVault'
import { useWallet } from './hooks/useWallet'
import { CUSD_LABEL } from './lib/contracts'
import { getMiniPayBrowseUrl, isMiniPayProvider } from './lib/minipay'
import './styles.css'

function LandingPage({ isConnecting }: { isConnecting: boolean }) {
    const miniPayUrl = getMiniPayBrowseUrl()
    const isMiniPay = isMiniPayProvider()
    const steps = [
        ['Create a vault', `Set the shared ${CUSD_LABEL} amount, billing day, and merchant wallet.`],
        ['Invite members', 'Each member funds only their own share from their wallet.'],
        ['Settle on due date', `When fully funded and due, the vault pays ${CUSD_LABEL} directly to the merchant.`],
    ]

    return (
        <div className="space-y-12">
            <section className="grid min-h-[520px] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                    <div className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                        Celo Mainnet • Direct cUSD route
                    </div>
                    <div className="space-y-4">
                        <h2 className="max-w-3xl text-5xl font-heading leading-[0.92] text-[#192837] sm:text-6xl">
                            Shared recurring payments, without shared custody.
                        </h2>
                        <p className="max-w-2xl text-lg leading-7 text-[#192837]/68">
                            SplitVault lets groups fund recurring {CUSD_LABEL} payments together, then settles directly to a verified or custom merchant wallet when the cycle is due.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        {isMiniPay ? (
                            <p className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--color-card)] px-5 py-2.5 text-sm font-semibold text-[color:var(--color-muted)]">
                                {isConnecting ? 'Connecting to MiniPay...' : 'MiniPay detected. Wallet connection should open automatically.'}
                            </p>
                        ) : (
                            <a
                                href={miniPayUrl}
                                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--color-accent)] px-5 py-2.5 font-semibold text-white shadow-[0_10px_30px_rgba(135,25,252,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_38px_rgba(135,25,252,0.34)] active:translate-y-0 active:scale-[0.98]"
                            >
                                Open in MiniPay
                            </a>
                        )}
                        <a
                            href="#how-it-works"
                            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-2.5 font-semibold text-[color:var(--color-text)] shadow-[0_8px_24px_rgba(25,40,55,0.06)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(25,40,55,0.1)]"
                        >
                            How it works
                        </a>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-6 rounded-[2rem] bg-[color:var(--color-accent)]/12 blur-3xl" />
                    <div className="animate-soft-in relative space-y-4 rounded-[1.5rem] border border-[color:var(--color-border)] bg-white/80 p-5 shadow-[0_24px_80px_rgba(25,40,55,0.12)]">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-[#192837]/55">Merchant</p>
                                <h3 className="mt-1 text-2xl font-heading text-[#192837]">Custom wallet</h3>
                            </div>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Funded</span>
                        </div>
                        <div className="rounded-2xl bg-[color:var(--color-soft)] p-4">
                            <p className="text-sm text-[#192837]/55">Cycle amount</p>
                            <p className="mt-1 text-5xl font-heading text-[#192837]">0.01</p>
                            <p className="text-xs uppercase tracking-[0.18em] text-[#192837]/45">{CUSD_LABEL}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
                                <p className="text-xs text-[#192837]/50">Members</p>
                                <p className="mt-1 text-xl font-heading text-[#192837]">2</p>
                            </div>
                            <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4">
                                <p className="text-xs text-[#192837]/50">Remaining</p>
                                <p className="mt-1 text-xl font-heading text-[#192837]">0.00</p>
                            </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[color:var(--color-soft)]">
                            <div className="h-full w-full rounded-full bg-[color:var(--color-accent)]" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.25rem] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
                    <h3 className="font-heading text-xl text-[#192837]">Why it exists</h3>
                    <p className="mt-2 text-sm leading-6 text-[#192837]/65">
                        Shared tools, communities, and creator payments often depend on one person fronting the bill. SplitVault makes each member fund their own share.
                    </p>
                </div>
                <div className="rounded-[1.25rem] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
                    <h3 className="font-heading text-xl text-[#192837]">No pooled custody</h3>
                    <p className="mt-2 text-sm leading-6 text-[#192837]/65">
                        Funds sit in the vault for the current cycle only. Fully funded cycles pay the merchant; underfunded cycles refund funded members.
                    </p>
                </div>
                <div className="rounded-[1.25rem] border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-5">
                    <h3 className="font-heading text-xl text-[#192837]">Direct route first</h3>
                    <p className="mt-2 text-sm leading-6 text-[#192837]/65">
                        The mainnet MVP pays Celo merchant wallets directly. Verified merchant discovery can be added after the custom-wallet route is proven.
                    </p>
                </div>
            </section>

            <section id="how-it-works" className="space-y-4">
                <div>
                    <p className="text-sm font-semibold text-[color:var(--color-accent)]">How it works</p>
                    <h2 className="mt-1 text-3xl font-heading text-[#192837]">One setup, one shared payment cycle.</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {steps.map(([title, body], index) => (
                        <div key={title} className="rounded-[1.25rem] border border-[color:var(--color-border)] bg-white/70 p-5 shadow-[0_18px_60px_rgba(25,40,55,0.08)]">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--color-accent)] text-sm font-bold text-white">{index + 1}</div>
                            <h3 className="mt-4 font-heading text-xl text-[#192837]">{title}</h3>
                            <p className="mt-2 text-sm leading-6 text-[#192837]/65">{body}</p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}

function App() {
    const { address, isConnecting } = useWallet()

    return (
        <Router>
            <Layout>
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
