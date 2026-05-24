import { useState, useEffect } from 'react'
import { Button, Input, ProgressBar, Card, Badge } from '../components/UI'
import { isFactoryConfigured, MERCHANTS } from '../lib/contracts'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { assertValidAddress, createDirectVault, getProtocolBillingDay } from '../lib/vaults'
import { useWallet } from '../hooks/useWallet'
import type { Address } from '../types'

export function NewVault() {
    const navigate = useNavigate()
    const { address } = useStore()
    const { loadVaults } = useWallet()
    const [step, setStep] = useState(1)
    const [deployError, setDeployError] = useState<string | null>(null)
    const [isDeploying, setIsDeploying] = useState(false)

    // Step 1: Service selection
    const [selectedService, setSelectedService] = useState<string | null>(null)
    const selectedMerchant = selectedService ? MERCHANTS.find((m) => m.id === selectedService) : null
    const route = selectedMerchant?.route || null

    // Pre-fill from merchant
    const [monthlyAmount, setMonthlyAmount] = useState('')
    const [billingDay, setBillingDay] = useState('')
    const [merchantAddress, setMerchantAddress] = useState('')

    // Members - auto-include creator
    const [members, setMembers] = useState<{ name: string; wallet: string }[]>([])
    const [memberName, setMemberName] = useState('')
    const [memberWallet, setMemberWallet] = useState('')

    // Update monthly amount and billing day when service is selected
    useEffect(() => {
        if (selectedMerchant) {
            setMonthlyAmount(String(selectedMerchant.suggestedCost))
            setBillingDay(String(getProtocolBillingDay()))
        }
    }, [selectedMerchant])

    const addMember = () => {
        if (memberName && memberWallet) {
            try {
                assertValidAddress(memberWallet, 'Member wallet')
            } catch (err) {
                setDeployError(err instanceof Error ? err.message : String(err))
                return
            }
            if (members.some((m) => m.wallet.toLowerCase() === memberWallet.toLowerCase())) {
                setDeployError('This wallet is already added')
                return
            }
            if (memberWallet.toLowerCase() === address?.toLowerCase()) {
                setDeployError('You are already the vault creator')
                return
            }
            const newMembers = [...members, { name: memberName, wallet: memberWallet }]
            setMembers(newMembers)
            setMemberName('')
            setMemberWallet('')
        }
    }

    const removeMember = (idx: number) => {
        const newMembers = members.filter((_, i) => i !== idx)
        setMembers(newMembers)
    }

    const handleDeploy = async () => {
        setDeployError(null)

        if (route !== 'DIRECT') {
            setDeployError('Bridge and Card vault deployment is not enabled in this contract version.')
            return
        }

        if (!isFactoryConfigured) {
            setDeployError('Set VITE_VAULT_FACTORY_ADDRESS before deploying vaults from the miniapp.')
            return
        }

        if (!address || !selectedMerchant) {
            setDeployError('Connect your wallet and choose a service first.')
            return
        }

        try {
            setIsDeploying(true)
            const vaultAddress = await createDirectVault({
                creator: address,
                serviceName: selectedMerchant.name,
                monthlyAmount,
                billingDay: Number(billingDay),
                merchantAddress: assertValidAddress(merchantAddress, 'Merchant wallet'),
                memberInputs: members.map((member) => ({
                    name: member.name,
                    wallet: assertValidAddress(member.wallet, 'Member wallet') as Address,
                })),
                onStatus: setDeployError,
            })
            await loadVaults()
            navigate(`/vault/${vaultAddress}`)
        } catch (err) {
            setDeployError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsDeploying(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-0">
            {/* Progress */}
            <div className="mb-8">
                <ProgressBar current={step > 4 ? 4 : step} total={4} />
                <div className="flex gap-2 mt-4">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`flex-1 h-1 rounded-full ${s <= (step > 4 ? 4 : step) ? 'bg-gray-900' : 'bg-gray-200'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Step 1: Service Selection */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Choose a Service</h2>
                        <p className="text-gray-600 mt-2">Select the subscription you want to split</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MERCHANTS.map((merchant) => {
                            const unavailable = merchant.route !== 'DIRECT'
                            return (
                                <Card
                                    key={merchant.id}
                                    hoverable={!unavailable}
                                    onClick={() => !unavailable && setSelectedService(merchant.id)}
                                    className={`cursor-pointer border-2 transition-all relative ${selectedService === merchant.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200'
                                        } ${unavailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {unavailable && (
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="warning">Soon</Badge>
                                        </div>
                                    )}
                                    <div className="text-4xl mb-3">{merchant.icon}</div>
                                    <h3 className="font-semibold text-gray-900">{merchant.name}</h3>
                                    <p className="text-sm text-gray-600 mt-2">${merchant.suggestedCost}/mo</p>
                                    {merchant.route !== 'DIRECT' && <p className="text-xs text-gray-500 mt-1">{merchant.route}</p>}
                                </Card>
                            )
                        })}
                    </div>

                    <Card className="bg-teal-50 border-teal-200">
                        <p className="text-sm text-teal-950">
                            DIRECT vaults are active on Celo Sepolia with MockcUSD. Bridge and Card are hidden until this flow is settled.
                        </p>
                    </Card>

                    {!isFactoryConfigured && (
                        <Card className="bg-amber-50 border-amber-200">
                            <p className="text-sm text-amber-900">
                                Configure VITE_VAULT_FACTORY_ADDRESS to enable real vault deployment from the miniapp.
                            </p>
                        </Card>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="secondary" onClick={() => navigate('/')} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={() => setStep(2)} disabled={!selectedService} className="flex-1">
                            Continue
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Route Info */}
            {step === 2 && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Payment Route</h2>
                        <p className="text-gray-600 mt-2">
                            {selectedMerchant?.name} • {route}
                        </p>
                    </div>

                    <Card className="border-l-4 border-teal-600 bg-teal-50">
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-teal-950">Direct Transfer</p>
                            <p className="text-xs text-teal-800">
                                Members fund the vault with MockcUSD on Celo Sepolia. On billing day, the vault transfers the total directly to the merchant wallet.
                            </p>
                            <Input
                                label="Merchant wallet"
                                value={merchantAddress}
                                onChange={(event) => setMerchantAddress(event.target.value)}
                                placeholder="0x..."
                            />
                        </div>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                            Back
                        </Button>
                        <Button onClick={() => setStep(3)} disabled={!merchantAddress} className="flex-1">
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Members */}
            {step === 3 && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Add Members</h2>
                        <p className="text-gray-600 mt-2">Shares are balanced equally across the creator and members.</p>
                    </div>

                    <Card className="bg-blue-50 border-blue-200">
                        <p className="text-sm text-blue-900">
                            <strong>You (Creator):</strong> {address?.slice(0, 6)}...{address?.slice(-4)}
                        </p>
                        <p className="text-xs text-blue-800 mt-1">As the vault creator, you'll have an equal share. Add other members below.</p>
                    </Card>

                    <Card className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Monthly Amount (cUSD)</label>
                                <Input value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} className="mt-2" />
                                <p className="text-xs text-gray-500 mt-1">Set low values for Sepolia tests.</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Billing Day</label>
                                <Input type="number" min="1" max="28" value={billingDay} onChange={(event) => setBillingDay(event.target.value)} className="mt-2" />
                                <p className="text-xs text-gray-500 mt-1">Use day {getProtocolBillingDay()} to test payout immediately.</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Members Total: {members.length + 1}</h3>

                        {/* Creator */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">You (Creator)</p>
                                <p className="text-xs text-gray-600">{address}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {((100 / (members.length + 1)).toFixed(2))}% • ${((parseFloat(monthlyAmount) / (members.length + 1)).toFixed(2))}
                                </p>
                            </div>
                            <Badge variant="success">Creator</Badge>
                        </div>

                        {/* Members */}
                        {members.length > 0 && (
                            <div className="space-y-2">
                                {members.map((m, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{m.name}</p>
                                            <p className="text-xs text-gray-600">{m.wallet}</p>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {((100 / (members.length + 1)).toFixed(2))}% • ${((parseFloat(monthlyAmount) / (members.length + 1)).toFixed(2))}
                                            </p>
                                        </div>
                                        <button onClick={() => removeMember(idx)} className="text-red-600 hover:text-red-800 ml-2">
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-4 space-y-2">
                            <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Member name" />
                            <Input value={memberWallet} onChange={(e) => setMemberWallet(e.target.value)} placeholder="Wallet address (0x...)" />
                            <Button variant="secondary" onClick={addMember} className="w-full">
                                Add Member
                            </Button>
                        </div>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                            Back
                        </Button>
                        <Button onClick={() => setStep(4)} disabled={members.length < 1} className="flex-1">
                            Review
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Review Vault</h2>
                        <p className="text-gray-600 mt-2">Check details before deploying</p>
                    </div>

                    <Card className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Service</p>
                                <p className="font-semibold text-gray-900 mt-1">{selectedMerchant?.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Monthly Cost</p>
                                <p className="font-semibold text-gray-900 mt-1">${monthlyAmount}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Payment Route</p>
                                <p className="font-semibold text-gray-900 mt-1">{route}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Billing Day</p>
                                <p className="font-semibold text-gray-900 mt-1">Day {billingDay}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="space-y-4">
                        <h3 className="font-semibold text-gray-900">Members & Splits ({members.length + 1} total)</h3>
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">You (Creator)</p>
                                <p className="text-xs text-gray-600">{address}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-900">{((100 / (members.length + 1)).toFixed(2))}%</p>
                                <p className="text-xs text-gray-600">${((parseFloat(monthlyAmount) / (members.length + 1)).toFixed(2))}</p>
                            </div>
                        </div>

                        {members.map((m, idx) => (
                            <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-medium text-gray-900">{m.name}</p>
                                    <p className="text-xs text-gray-600">{m.wallet}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-900">{((100 / (members.length + 1)).toFixed(2))}%</p>
                                    <p className="text-xs text-gray-600">${((parseFloat(monthlyAmount) / (members.length + 1)).toFixed(2))}</p>
                                </div>
                            </div>
                        ))}
                    </Card>

                    <Card className="bg-gray-50 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Network</span>
                            <span className="font-medium">Celo L2</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Est. Gas Fee</span>
                            <span className="font-medium">~$0.10</span>
                        </div>
                    </Card>

                    {!isFactoryConfigured && (
                        <Card className="bg-amber-50 border-amber-200">
                            <p className="text-sm text-amber-900">
                                Deployment is disabled because the factory address is not configured.
                            </p>
                        </Card>
                    )}

                    {deployError && (
                        <Card className="bg-red-50 border-red-200">
                            <p className="text-sm text-red-900">{deployError}</p>
                        </Card>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
                            Back
                        </Button>
                        <Button onClick={handleDeploy} disabled={!isFactoryConfigured || route !== 'DIRECT'} isLoading={isDeploying} className="flex-1">
                            Deploy Vault
                        </Button>
                    </div>
                </div>
            )}

        </div>
    )
}
