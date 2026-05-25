import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { VaultDetail } from './pages/VaultDetail'
import { NewVault } from './pages/NewVault'
import { useWallet } from './hooks/useWallet'
import { CUSD_LABEL } from './lib/contracts'
import './styles.css'

function App() {
    const { address } = useWallet()

    return (
        <Router>
            <Layout>
                {!address ? (
                    <div className="min-h-[560px] grid place-items-center">
                        <div className="max-w-xl text-center space-y-5">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-black text-2xl font-bold">S</div>
                            <div>
                                <h2 className="text-4xl sm:text-5xl font-bold leading-[0.95] text-primary">Connect your MiniPay wallet</h2>
                                <p className="text-primary/60 mt-4 leading-tight">
                                    Create shared {CUSD_LABEL} vaults for crypto-native SaaS invoices, invite members, and pay verified merchant wallets directly.
                                </p>
                            </div>
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
