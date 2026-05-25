import { useState } from 'react'
import { Card, ProgressBar, Button, Badge } from '../components/UI'
import { useStore } from '../store'
import { Link } from 'react-router-dom'
import { formatCusd, mintTestCusd } from '../lib/vaults'
import { useWallet } from '../hooks/useWallet'
import { ACTIVE_NETWORK_NAME, CUSD_LABEL, IS_TESTNET } from '../lib/contracts'

export function Dashboard() {
    const { address, vaults, balance, isLoadingVaults } = useStore()
    const { updateBalance } = useWallet()
    const [filter, setFilter] = useState<'all' | 'active' | 'pending'>('all')
    const [mintStatus, setMintStatus] = useState<string | null>(null)

    const handleMint = async () => {
        if (!address) return
        setMintStatus('Minting test cUSD...')
        try {
            await mintTestCusd(address)
            await updateBalance()
            setMintStatus('Minted 1,000 test cUSD')
        } catch (err) {
            setMintStatus(err instanceof Error ? err.message : String(err))
        }
    }

    const filteredVaults = vaults.filter((vault) => {
        if (filter === 'active') return vault.cycleActive
        if (filter === 'pending') return !vault.fundingStatus.funded
        return true
    })

    return (
        <div className="space-y-7">
            <Card className="bg-gray-950 text-white border-0">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-white text-sm font-medium">Total {CUSD_LABEL} Balance</p>
                        <h2 className="text-4xl font-bold mt-2 text-emerald-200">{formatCusd(balance)}</h2>
                        <p className="text-xs text-gray-300 mt-2">{ACTIVE_NETWORK_NAME}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {IS_TESTNET && (
                            <Button variant="secondary" onClick={handleMint}>
                                Mint Test cUSD
                            </Button>
                        )}
                        <Link to="/vault/new" className="w-full sm:w-auto">
                            <Button variant="secondary" className="w-full sm:w-auto">
                                New Vault
                            </Button>
                        </Link>
                    </div>
                </div>
                {mintStatus && <p className="text-sm text-gray-300 mt-4">{mintStatus}</p>}
            </Card>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">My Vaults</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {isLoadingVaults ? 'Loading vaults...' : `${vaults.length} vault${vaults.length === 1 ? '' : 's'} tracked`}
                        </p>
                    </div>
                    <Link to="/vault/new">
                        <Button className="w-full sm:w-auto">New Vault</Button>
                    </Link>
                </div>

                <div className="inline-flex w-full sm:w-auto rounded-md border border-gray-200 bg-white p-1">
                    {(['all', 'active', 'pending'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 sm:flex-none px-3 py-2 rounded text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-teal-700 text-white'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Pending Funding'}
                        </button>
                    ))}
                </div>

                {filteredVaults.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-teal-50 text-teal-800 font-bold">S</div>
                        <h3 className="font-semibold text-gray-900 mt-4">
                            {vaults.length === 0 ? 'No vaults yet' : 'No vaults match this filter'}
                        </h3>
                        <p className="text-gray-600 mt-2 mb-5">
                            {vaults.length === 0 ? `Create a direct ${CUSD_LABEL} vault to start splitting a subscription.` : 'Try another status filter.'}
                        </p>
                        <Link to="/vault/new">
                            <Button>Create Vault</Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredVaults.map((vault) => (
                            <Link key={vault.id} to={`/vault/${vault.id}`}>
                                <Card hoverable className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">{vault.serviceName || 'Untitled Vault'}</p>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {formatCusd(vault.monthlyAmount)} {CUSD_LABEL}/mo
                                            </h3>
                                        </div>
                                        <Badge
                                            variant={vault.cycleActive ? 'success' : 'warning'}
                                        >
                                            {vault.cycleActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Members</span>
                                            <span className="font-medium">{vault.members.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Billing Day</span>
                                            <span className="font-medium">Day {vault.billingDay}</span>
                                        </div>
                                    </div>

                                    <ProgressBar
                                        current={Number(vault.fundingStatus.totalFunded)}
                                        total={Number(vault.fundingStatus.totalRequired)}
                                        label="Funded"
                                    />

                                    {!vault.fundingStatus.funded && vault.userShare && (
                                        <Button variant="secondary" className="w-full" size="sm">
                                            Fund Your Share
                                        </Button>
                                    )}
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
