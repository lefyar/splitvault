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
            <Card className="relative overflow-hidden bg-[#101010] text-primary border-primary/10">
                <div className="noise-overlay pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-black/60" />
                <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-primary/70 text-sm font-medium">Total {CUSD_LABEL} Balance</p>
                        <h2 className="text-5xl sm:text-6xl font-bold mt-2 text-primary tracking-[-0.05em]">{formatCusd(balance)}</h2>
                        <p className="text-xs text-primary/45 mt-3 uppercase tracking-[0.22em]">{ACTIVE_NETWORK_NAME}</p>
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
                {mintStatus && <p className="relative text-sm text-primary/60 mt-4">{mintStatus}</p>}
            </Card>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">My Vaults</h2>
                        <p className="text-sm text-primary/55 mt-1">
                            {isLoadingVaults ? 'Loading vaults...' : `${vaults.length} vault${vaults.length === 1 ? '' : 's'} tracked`}
                        </p>
                    </div>
                    <Link to="/vault/new">
                        <Button className="w-full sm:w-auto">New Vault</Button>
                    </Link>
                </div>

                <div className="inline-flex w-full sm:w-auto rounded-full border border-primary/10 bg-[#101010] p-1">
                    {(['all', 'active', 'pending'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 sm:flex-none px-3 py-2 rounded text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-primary text-black'
                                    : 'text-primary/60 hover:bg-primary/10 hover:text-primary'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Pending Funding'}
                        </button>
                    ))}
                </div>

                {filteredVaults.length === 0 ? (
                    <Card className="text-center py-12">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-black font-bold">S</div>
                        <h3 className="font-semibold text-primary mt-4">
                            {vaults.length === 0 ? 'No vaults yet' : 'No vaults match this filter'}
                        </h3>
                        <p className="text-primary/55 mt-2 mb-5">
                            {vaults.length === 0 ? `Create a direct ${CUSD_LABEL} vault for a crypto-native SaaS merchant or invoice recipient.` : 'Try another status filter.'}
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
                                            <p className="text-sm text-primary/55">{vault.serviceName || 'Untitled Vault'}</p>
                                            <h3 className="text-lg font-semibold text-primary">
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
                                            <span className="text-primary/50">Members</span>
                                            <span className="font-medium text-primary/85">{vault.members.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-primary/50">Billing Day</span>
                                            <span className="font-medium text-primary/85">Day {vault.billingDay}</span>
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
