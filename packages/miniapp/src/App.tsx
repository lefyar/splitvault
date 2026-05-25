import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { VaultDetail } from './pages/VaultDetail'
import { NewVault } from './pages/NewVault'
import { useWallet } from './hooks/useWallet'
import { CUSD_LABEL } from './lib/contracts'
import { getMiniPayBrowseUrl, isMiniPayProvider } from './lib/minipay'
import './styles.css'

function App() {
    const { address, isConnecting } = useWallet()
    const miniPayUrl = getMiniPayBrowseUrl()
    const isMiniPay = isMiniPayProvider()

    return (
        <Router>
            <Layout>
                {!address ? (
                    <div className="min-h-[560px] grid place-items-center">
                        <div className="max-w-xl text-center space-y-5">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#192837] text-white text-2xl font-heading">S</div>
                            <div>
                                <h2 className="text-4xl sm:text-5xl font-heading leading-[0.95] text-[#192837]">Connect your MiniPay wallet</h2>
                                <p className="text-[#192837]/70 mt-4 leading-tight">
                                    Create shared {CUSD_LABEL} vaults, invite members, and pay verified or custom merchant wallets directly on Celo.
                                </p>
                            </div>
                            {isMiniPay ? (
                                <p className="text-sm font-medium text-[#192837]/60">
                                    {isConnecting ? 'Connecting to MiniPay...' : 'MiniPay detected. Wallet connection should open automatically.'}
                                </p>
                            ) : (
                                <a
                                    href={miniPayUrl}
                                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 py-2.5 font-semibold text-white shadow-[0_10px_30px_rgba(135,25,252,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_14px_38px_rgba(135,25,252,0.34)] active:translate-y-0 active:scale-[0.98]"
                                >
                                    Open in MiniPay
                                </a>
                            )}
                        </div>
                    </div>
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
