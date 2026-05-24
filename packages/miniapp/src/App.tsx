import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { VaultDetail } from './pages/VaultDetail'
import { NewVault } from './pages/NewVault'
import { useWallet } from './hooks/useWallet'
import './styles.css'

function App() {
    const { address } = useWallet()

    return (
        <Router>
            <Layout>
                {!address ? (
                    <div className="min-h-[520px] grid place-items-center">
                        <div className="max-w-xl text-center space-y-5">
                            <div className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-teal-700 text-white text-2xl font-bold">S</div>
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">Connect your MiniPay wallet</h2>
                                <p className="text-gray-600 mt-3">
                                    Create shared cUSD vaults, invite members, and track subscription funding from one place.
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
