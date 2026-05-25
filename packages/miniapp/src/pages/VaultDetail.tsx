import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Badge, ProgressBar, Tabs } from '../components/UI'
import { Card } from '../components/UI'
import { useStore } from '../store'
import { assertValidAddress, formatCusd, fundUserShare, getVaultHistory, loadVaultByAddress, mintTestCusd, runFactoryUpkeep, saveImportedVaultMetadata, type VaultHistoryItem } from '../lib/vaults'
import { useWallet } from '../hooks/useWallet'
import { ACTIVE_EXPLORER_URL, ACTIVE_NETWORK_NAME, CUSD_LABEL, IS_TESTNET } from '../lib/contracts'
import type { VaultWithMeta } from '../types'

export function VaultDetail() {
    const [activeTab, setActiveTab] = useState('members')
    const [txStatus, setTxStatus] = useState<string | null>(null)
    const [history, setHistory] = useState<VaultHistoryItem[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = useState(false)
    const [directVault, setDirectVault] = useState<VaultWithMeta | null>(null)
    const [isLoadingDirectVault, setIsLoadingDirectVault] = useState(false)
    const { id } = useParams()
    const { address, vaults, addVault } = useStore()
    const { loadVaults, updateBalance } = useWallet()
    const listedVault = vaults.find((candidate) => candidate.id.toLowerCase() === id?.toLowerCase())
    const vault = listedVault || directVault

    useEffect(() => {
        if (!id || !address || listedVault || directVault?.id.toLowerCase() === id.toLowerCase()) return

        const loadDirectVault = async () => {
            setIsLoadingDirectVault(true)
            setTxStatus(null)
            try {
                const vaultAddress = assertValidAddress(id, 'Vault address')
                const loadedVault = await loadVaultByAddress(vaultAddress, address)
                setDirectVault(loadedVault)
                addVault(loadedVault)
                saveImportedVaultMetadata(loadedVault).catch((err) => {
                    console.warn('Failed to save imported vault metadata:', err)
                })
            } catch (err) {
                setTxStatus(err instanceof Error ? err.message : String(err))
                setDirectVault(null)
            } finally {
                setIsLoadingDirectVault(false)
            }
        }

        loadDirectVault()
    }, [id, address, listedVault?.id, directVault?.id])

    useEffect(() => {
        if (activeTab !== 'history' || !vault) return

        const loadHistory = async () => {
            setIsLoadingHistory(true)
            try {
                setHistory(await getVaultHistory(vault.id))
            } catch (err) {
                setTxStatus(err instanceof Error ? err.message : String(err))
            } finally {
                setIsLoadingHistory(false)
            }
        }

        loadHistory()
    }, [activeTab, vault?.id])

    if (!vault) {
        return (
            <Card className="text-center py-12">
                <h1 className="text-2xl font-bold text-gray-900">{isLoadingDirectVault ? 'Loading vault...' : 'Vault not found'}</h1>
                <p className="text-gray-600 mt-2 mb-5">
                    {isLoadingDirectVault ? 'Reading this vault directly from Celo.' : txStatus || 'This vault is not loaded in the miniapp yet.'}
                </p>
                <Link to="/">
                    <Button>Back to Dashboard</Button>
                </Link>
            </Card>
        )
    }

    const funded = Number(vault.fundingStatus.totalFunded)
    const required = Number(vault.fundingStatus.totalRequired)
    const deadlineMs = Number(vault.cycleDeadline) * 1000
    const isPastDeadline = Date.now() >= deadlineMs
    const userMember = vault.members.find((member) => member.wallet.toLowerCase() === address?.toLowerCase())
    const userRequired = userMember?.shareAmount || 0n
    const userFunded = userMember?.funded ? userRequired : 0n
    const userRemaining = userRequired > userFunded ? userRequired - userFunded : 0n

    const handleFund = async () => {
        if (!address) return
        setTxStatus('Funding your share...')
        try {
            await fundUserShare(vault, address)
            await Promise.all([loadVaults(), updateBalance()])
            setTxStatus('Share funded')
        } catch (err) {
            setTxStatus(err instanceof Error ? err.message : String(err))
        }
    }

    const handleMint = async () => {
        if (!address) return
        setTxStatus('Minting test cUSD...')
        try {
            await mintTestCusd(address)
            await updateBalance()
            setTxStatus('Minted 1,000 test cUSD')
        } catch (err) {
            setTxStatus(err instanceof Error ? err.message : String(err))
        }
    }

    const handleRunUpkeep = async () => {
        if (!address) return
        setTxStatus('Running upkeep...')
        try {
            await runFactoryUpkeep(address)
            await Promise.all([loadVaults(), updateBalance()])
            setHistory(await getVaultHistory(vault.id))
            setTxStatus('Upkeep completed')
        } catch (err) {
            setTxStatus(err instanceof Error ? err.message : String(err))
        }
    }

    return (
        <div className="space-y-8">
            <Link to="/" className="inline-flex">
                <Button variant="secondary" size="sm" className='border-black'>Back to Dashboard</Button>
            </Link>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-3xl font-bold text-gray-900">{vault.serviceName || 'Subscription Vault'}</h1>
                        <p className="text-gray-600 mt-2 break-all">Vault {vault.id}</p>
                    </div>
                    <Badge variant={vault.cycleActive ? 'success' : 'warning'}>{vault.cycleActive ? 'Active' : 'Inactive'}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <p className="text-gray-600 text-sm">Monthly Cost</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">{formatCusd(vault.monthlyAmount)}</h3>
                        <p className="text-xs text-gray-500 mt-1">{CUSD_LABEL}</p>
                    </Card>
                    <Card>
                        <p className="text-gray-600 text-sm">Members</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">{vault.members.length}</h3>
                    </Card>
                    <Card>
                        <p className="text-gray-600 text-sm">Billing Day</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-2">Day {vault.billingDay}</h3>
                    </Card>
                    <Card>
                        <p className="text-gray-600 text-sm">Route</p>
                        <h3 className="text-lg font-bold text-gray-900 mt-2">{vault.route}</h3>
                        <p className="text-xs text-gray-500 mt-1">{ACTIVE_NETWORK_NAME}</p>
                    </Card>
                </div>

                <Card className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="text-gray-600 text-sm">Funding Progress</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {formatCusd(vault.fundingStatus.totalFunded)} / {formatCusd(vault.fundingStatus.totalRequired)} {CUSD_LABEL}
                            </h3>
                        </div>
                    </div>
                    <ProgressBar current={funded} total={required} />
                    {userMember && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-md border border-[#192837]/10 bg-white/60 p-3">
                                <p className="text-xs text-gray-500">Your Share</p>
                                <p className="font-semibold text-gray-900 mt-1">{formatCusd(userRequired)} {CUSD_LABEL}</p>
                            </div>
                            <div className="rounded-md border border-[#192837]/10 bg-white/60 p-3">
                                <p className="text-xs text-gray-500">You Funded</p>
                                <p className="font-semibold text-gray-900 mt-1">{formatCusd(userFunded)} {CUSD_LABEL}</p>
                            </div>
                            <div className="rounded-md border border-[#192837]/10 bg-white/60 p-3">
                                <p className="text-xs text-gray-500">Remaining</p>
                                <p className="font-semibold text-gray-900 mt-1">{formatCusd(userRemaining)} {CUSD_LABEL}</p>
                            </div>
                        </div>
                    )}
                    <p className="text-sm text-gray-600">
                        Deadline: {new Date(deadlineMs).toLocaleString()} {isPastDeadline ? '(due)' : ''}
                    </p>
                    {userRemaining > 0n && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {IS_TESTNET && <Button className="w-full" variant="secondary" onClick={handleMint}>Mint Test cUSD</Button>}
                            <Button className="w-full" onClick={handleFund}>Fund Your Share</Button>
                        </div>
                    )}
                    {vault.fundingStatus.funded && vault.cycleActive && (
                        <Button className="w-full" onClick={handleRunUpkeep} disabled={!isPastDeadline}>
                            Run Upkeep
                        </Button>
                    )}
                    {txStatus && <p className="text-sm text-gray-600">{txStatus}</p>}
                </Card>
            </div>

            <Card className="space-y-6">
                <Tabs
                    tabs={[
                        { label: 'Members', value: 'members' },
                        { label: 'Route', value: 'route' },
                        { label: 'History', value: 'history' },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                />

                <div>
                    {activeTab === 'members' && (
                        <div className="space-y-4">
                            {vault.members.map((member) => (
                                <div key={member.wallet} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-md">
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">{member.name || 'Member'}</p>
                                        <p className="text-sm text-gray-600 break-all">{member.wallet}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">{(member.sharePercent / 10000).toFixed(2)}%</p>
                                        <p className="text-sm text-gray-600">{formatCusd(member.shareAmount)} {CUSD_LABEL}</p>
                                        <Badge variant={member.funded ? 'success' : 'warning'} className="mt-2">
                                            {member.funded ? 'Funded' : 'Pending'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'route' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-teal-50 border border-teal-200 rounded-md">
                                <p className="font-medium text-teal-950">{vault.route} Route</p>
                                <p className="text-sm text-teal-800 mt-2">
                                    The vault pays the funded total directly to the merchant wallet in {CUSD_LABEL}.
                                </p>
                                <p className="text-sm text-teal-800 mt-3 break-all">Merchant wallet: {vault.merchantAddress}</p>
                                <a
                                    className="text-xs text-teal-700 break-all mt-2 block"
                                    href={`${ACTIVE_EXPLORER_URL}/address/${vault.merchantAddress}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View merchant wallet
                                </a>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            {isLoadingHistory && (
                                <div className="p-4 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-600">Loading history...</p>
                                </div>
                            )}
                            {!isLoadingHistory && history.length === 0 && (
                                <div className="p-4 bg-gray-50 rounded-md">
                                    <p className="font-medium text-gray-900">No payment history yet</p>
                                    <p className="text-sm text-gray-600 mt-1">Funding and payment events will appear here.</p>
                                </div>
                            )}
                            {!isLoadingHistory && history.map((item) => (
                                <div key={item.id} className="p-4 bg-gray-50 rounded-md">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.label}</p>
                                            {item.timestamp !== undefined && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {new Date(Number(item.timestamp) * 1000).toLocaleString()}
                                                </p>
                                            )}
                                            {item.actor && <p className="text-xs text-gray-500 break-all mt-1">{item.actor}</p>}
                                        </div>
                                        {item.amount !== undefined && <p className="text-sm font-semibold text-teal-800">{formatCusd(item.amount)} {CUSD_LABEL}</p>}
                                    </div>
                                    <a
                                        className="text-xs text-teal-700 break-all mt-2 block"
                                        href={`${ACTIVE_EXPLORER_URL}/tx/${item.transactionHash}`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {item.transactionHash}
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
