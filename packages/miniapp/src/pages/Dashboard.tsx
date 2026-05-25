import { useState } from 'react'
import { Card, ProgressBar, Button, Badge, SkeletonCard } from '../components/UI'
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
    const activeVaults = vaults.filter((vault) => vault.cycleActive)
    const userActiveRequired = activeVaults.reduce((sum, vault) => {
        const member = vault.members.find((item) => item.wallet.toLowerCase() === address?.toLowerCase())
        return sum + (member?.shareAmount || 0n)
    }, 0n)
    const userActiveFunded = activeVaults.reduce((sum, vault) => {
        const member = vault.members.find((item) => item.wallet.toLowerCase() === address?.toLowerCase())
        return sum + (member?.funded ? member.shareAmount : 0n)
    }, 0n)
    const userActiveRemaining = userActiveRequired > userActiveFunded ? userActiveRequired - userActiveFunded : 0n

    return (
        <div className="space-y-10">
            <Card className="relative overflow-hidden bg-white/70 text-[#192837] border-[#192837]/10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(135,25,252,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(242,242,238,0.35))]" />
                <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    <div>
                        <p className="text-[#192837]/70 text-sm font-medium">Total {CUSD_LABEL} Balance</p>
                        <h2 className="text-5xl sm:text-6xl font-heading mt-2 text-[#192837] tracking-[-0.04em] wrap-anywhere">{formatCusd(balance)}</h2>
                        <p className="text-xs text-[#192837]/45 mt-3 uppercase tracking-[0.22em]">{ACTIVE_NETWORK_NAME}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {IS_TESTNET && (
                            <Button variant="secondary" onClick={handleMint}>
                                Mint Test cUSD
                            </Button>
                        )}
                    </div>
                </div>
                {mintStatus && <p className="relative text-sm text-[#192837]/65 mt-4">{mintStatus}</p>}
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <p className="text-[#192837]/55 text-sm">Your Active Shares</p>
                    <h3 className="text-2xl font-heading text-[#192837] mt-2">{formatCusd(userActiveRequired)}</h3>
                    <p className="text-xs text-[#192837]/45 mt-1">{CUSD_LABEL} across active vaults</p>
                </Card>
                <Card>
                    <p className="text-[#192837]/55 text-sm">Funded This Cycle</p>
                    <h3 className="text-2xl font-heading text-[#192837] mt-2">{formatCusd(userActiveFunded)}</h3>
                    <p className="text-xs text-[#192837]/45 mt-1">{CUSD_LABEL} already deposited</p>
                </Card>
                <Card>
                    <p className="text-[#192837]/55 text-sm">Remaining To Fund</p>
                    <h3 className="text-2xl font-heading text-[#192837] mt-2">{formatCusd(userActiveRemaining)}</h3>
                    <p className="text-xs text-[#192837]/45 mt-1">{CUSD_LABEL} still needed</p>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-heading text-[#192837]">My Vaults</h2>
                        <p className="text-sm text-[#192837]/60 mt-1">
                            {isLoadingVaults ? 'Loading vaults...' : `${vaults.length} vault${vaults.length === 1 ? '' : 's'} tracked`}
                        </p>
                    </div>
                    <Link to="/vault/new">
                        <Button className="w-full sm:w-auto">New Vault</Button>
                    </Link>
                </div>

                <div className="inline-flex w-full space-x-2 sm:w-auto rounded-full border border-white/10 bg-transparent p-1.5">
                    {(['all', 'active', 'pending'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 sm:flex-none px-3 py-2 text-sm font-medium transition-colors rounded-full ${filter === f
                                ? 'bg-[#8719fc] text-white rounded-full'
                                : 'text-white/58 hover:bg-white/[0.06] hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Pending'}
                        </button>
                    ))}
                </div>

                {filteredVaults.length === 0 ? (
                    isLoadingVaults ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ) : (
                        <Card className="text-center py-12">
                            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#192837] text-white font-heading">S</div>
                            <h3 className="font-heading text-[#192837] mt-4">
                                {vaults.length === 0 ? 'No vaults yet' : 'No vaults match this filter'}
                            </h3>
                            <p className="text-[#192837]/60 mt-2 mb-5">
                                {vaults.length === 0 ? `Create a direct ${CUSD_LABEL} vault for a custom merchant wallet or invoice recipient.` : 'Try another status filter.'}
                            </p>
                            <Link to="/vault/new">
                                <Button>Create Vault</Button>
                            </Link>
                        </Card>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredVaults.map((vault) => (
                            <Link key={vault.id} to={`/vault/${vault.id}`}>
                                <Card hoverable className="space-y-4">
                                    {(() => {
                                        const userMember = vault.members.find((member) => member.wallet.toLowerCase() === address?.toLowerCase())
                                        const userShare = userMember?.shareAmount || 0n
                                        const userFunded = userMember?.funded ? userShare : 0n
                                        const userRemaining = userShare > userFunded ? userShare - userFunded : 0n
                                        return (
                                            <>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm text-[#192837]/55">{vault.serviceName || 'Untitled Vault'}</p>
                                            <h3 className="text-lg font-heading text-[#192837]">
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
                                            <span className="text-[#192837]/50">Members</span>
                                            <span className="font-medium text-[#192837]/85">{vault.members.length}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#192837]/50">Billing Day</span>
                                            <span className="font-medium text-[#192837]/85">Day {vault.billingDay}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#192837]/50">Your Share</span>
                                            <span className="font-medium text-[#192837]/85">{formatCusd(userShare)} {CUSD_LABEL}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[#192837]/50">You Funded</span>
                                            <span className="font-medium text-[#192837]/85">{formatCusd(userFunded)} {CUSD_LABEL}</span>
                                        </div>
                                    </div>

                                    <ProgressBar
                                        current={Number(vault.fundingStatus.totalFunded)}
                                        total={Number(vault.fundingStatus.totalRequired)}
                                        label="Funded"
                                    />

                                    {userRemaining > 0n && (
                                        <Button variant="secondary" className="w-full" size="sm">
                                            Fund {formatCusd(userRemaining)} {CUSD_LABEL}
                                        </Button>
                                    )}
                                            </>
                                        )
                                    })()}
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
