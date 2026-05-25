import { decodeEventLog, formatUnits, isAddress, parseUnits, parseAbiItem } from 'viem'
import type { Address, Member, PaymentRoute, VaultWithMeta } from '../types'
import { ACTIVE_CHAIN_ID, CUSD_ADDRESS, ERC20_ABI, FACTORY_ABI, VAULT_ABI, VAULT_FACTORY_ADDRESS } from './contracts'
import { ensureCorrectChain, getPublicClient, getWalletClient } from './minipay'
import { fetchVaultMetadata, saveVaultMetadata, type VaultMetadata } from './api'

const DIRECT_ROUTE = 0
const ZERO_BYTES = '0x'

export interface VaultHistoryItem {
  id: string
  label: string
  amount?: bigint
  actor?: Address
  timestamp?: bigint
  transactionHash: string
}

function routeFromContract(route: number): PaymentRoute {
  return route === DIRECT_ROUTE ? 'DIRECT' as PaymentRoute : 'DIRECT' as PaymentRoute
}

export function calculateEqualShares(count: number): number[] {
  const base = Math.floor(1_000_000 / count)
  const remainder = 1_000_000 - base * count
  const shares = Array(count)
    .fill(base)
    .map((share, index) => share + (index < remainder ? 1 : 0))
  return shares
}

function getVaultAddressFromReceipt(logs: readonly unknown[]): Address | null {
  for (const log of logs as any[]) {
    try {
      const decoded = decodeEventLog({
        abi: FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      })

      if (decoded.eventName === 'VaultCreated') {
        return decoded.args.vault as Address
      }
    } catch {
      // Ignore logs from other contracts.
    }
  }

  return null
}

export function assertValidAddress(value: string, label: string): Address {
  if (!isAddress(value)) {
    throw new Error(`${label} must be a valid 0x address`)
  }
  return value as Address
}

export async function loadVaultsForMember(member: Address): Promise<VaultWithMeta[]> {
  const client = getPublicClient()
  const metadata = await fetchVaultMetadata(member)
  const metadataByAddress = new Map(metadata.map((item) => [item.contract_addr.toLowerCase(), item]))
  const creatorVaults = await client.readContract({
    address: VAULT_FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getCreatorVaults',
    args: [member],
  }).catch(() => []) as Address[]

  const fallbackMetadata = creatorVaults
    .filter((address) => !metadataByAddress.has(address.toLowerCase()))
    .map((address): VaultMetadata => ({
      contract_addr: address,
      creator_addr: member,
      service_name: 'Direct Vault',
      merchant_addr: '0x0000000000000000000000000000000000000000',
      token_addr: CUSD_ADDRESS,
      monthly_amount: '0',
      billing_day: 1,
      route: 'DIRECT',
      chain_id: ACTIVE_CHAIN_ID,
      members: [],
    }))

  const allMetadata = [...metadata, ...fallbackMetadata]

  const vaults = await Promise.all(
    allMetadata.map((meta) => hydrateVault(meta, member, client).catch((err) => {
      console.error(`Failed to hydrate vault ${meta.contract_addr}`, err)
      return null
    })),
  )

  return vaults.filter((vault): vault is VaultWithMeta => vault !== null)
}

async function hydrateVault(meta: VaultMetadata, viewer: Address, client: ReturnType<typeof getPublicClient>): Promise<VaultWithMeta> {
  const [
    monthlyAmount,
    billingDay,
    route,
    merchantAddress,
    creator,
    cycleDeadline,
    cycleActive,
    totalFunded,
    fundingTuple,
    memberAddresses,
  ] = await Promise.all([
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'monthlyAmount' }) as Promise<bigint>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'billingDay' }) as Promise<bigint>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'route' }) as Promise<number>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'merchantAddress' }) as Promise<Address>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'creator' }) as Promise<Address>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'cycleDeadline' }) as Promise<bigint>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'cycleActive' }) as Promise<boolean>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'totalFunded' }) as Promise<bigint>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'getFundingStatus' }) as Promise<readonly [bigint, bigint, bigint, bigint]>,
    client.readContract({ address: meta.contract_addr, abi: VAULT_ABI, functionName: 'getMembers' }) as Promise<Address[]>,
  ])

  const members: Member[] = await Promise.all(memberAddresses.map(async (wallet) => {
    const memberTuple = await client.readContract({
      address: meta.contract_addr,
      abi: VAULT_ABI,
      functionName: 'members',
      args: [wallet],
    }) as readonly [Address, bigint, bigint, boolean]

    const saved = meta.members.find((item) => item.wallet_addr.toLowerCase() === wallet.toLowerCase())

    return {
      wallet,
      sharePercent: Number(memberTuple[1]),
      shareAmount: memberTuple[2],
      funded: memberTuple[3],
      name: saved?.display_name,
    }
  }))

  const userMember = members.find((item) => item.wallet.toLowerCase() === viewer.toLowerCase())

  return {
    id: meta.contract_addr,
    monthlyAmount,
    billingDay: Number(billingDay),
    route: routeFromContract(route),
    merchantAddress,
    members,
    cycleDeadline,
    cycleActive,
    totalFunded,
    creator,
    serviceName: meta.service_name,
    networkId: meta.chain_id,
    createdAt: Date.parse(meta.created_at || '') || undefined,
    fundingStatus: {
      totalFunded: fundingTuple[0],
      totalRequired: fundingTuple[1],
      membersCount: Number(fundingTuple[2]),
      membersFunded: Number(fundingTuple[3]),
      funded: fundingTuple[0] >= fundingTuple[1],
    },
    userShare: userMember?.sharePercent,
    userFunded: userMember?.funded,
  }
}

export async function createDirectVault(params: {
  creator: Address
  serviceName: string
  monthlyAmount: string
  billingDay: number
  merchantAddress: Address
  memberInputs: Array<{ name: string; wallet: Address }>
  onStatus?: (status: string) => void
}): Promise<Address> {
  const walletClient = getWalletClient()
  const publicClient = getPublicClient()
  await ensureCorrectChain()
  const allMembers = [
    { name: 'Creator', wallet: params.creator },
    ...params.memberInputs,
  ]
  const shares = calculateEqualShares(allMembers.length)
  const monthlyAmount = parseUnits(params.monthlyAmount, 18)
  const shareAmounts = shares.map((share) => (monthlyAmount * BigInt(share)) / 1_000_000n)

  params.onStatus?.('Confirm deployment in your wallet...')
  const hash = await walletClient.writeContract({
    account: params.creator,
    address: VAULT_FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'createVault',
    args: [
      monthlyAmount,
      BigInt(params.billingDay),
      params.merchantAddress,
      allMembers.map((member) => member.wallet),
      shares.map(BigInt),
      params.serviceName,
    ],
  })

  params.onStatus?.('Waiting for deployment confirmation...')
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
  const vaultAddress = getVaultAddressFromReceipt(receipt.logs)

  if (!vaultAddress) {
    throw new Error('VaultCreated event not found in transaction receipt')
  }

  params.onStatus?.('Saving vault metadata...')
  try {
    await saveVaultMetadata({
      vaultAddress,
      txHash: hash,
      creator: params.creator,
      tokenAddress: CUSD_ADDRESS,
      createParams: {
        serviceName: params.serviceName,
        monthlyAmount: params.monthlyAmount,
        billingDay: params.billingDay,
        route: 'DIRECT' as PaymentRoute,
        merchantAddress: params.merchantAddress,
        networkId: ACTIVE_CHAIN_ID,
        members: allMembers.map((member, index) => ({
          name: member.name,
          wallet: member.wallet,
          share: shares[index],
          shareAmount: shareAmounts[index].toString(),
        })),
      },
    })
  } catch (err) {
    throw new Error(`Vault deployed at ${vaultAddress}, but metadata save failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  return vaultAddress
}

export async function fundUserShare(vault: VaultWithMeta, user: Address) {
  const walletClient = getWalletClient()
  const publicClient = getPublicClient()
  await ensureCorrectChain()
  const member = vault.members.find((item) => item.wallet.toLowerCase() === user.toLowerCase())

  if (!member) throw new Error('Connected wallet is not a member of this vault')
  if (member.funded) throw new Error('Your share is already funded')

  const allowance = await publicClient.readContract({
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [user, vault.id],
  }) as bigint

  if (allowance < member.shareAmount) {
    const approveHash = await walletClient.writeContract({
      account: user,
      address: CUSD_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [vault.id, member.shareAmount],
    })
    await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 120_000 })
  }

  const fundHash = await walletClient.writeContract({
    account: user,
    address: vault.id,
    abi: VAULT_ABI,
    functionName: 'fundShare',
  })
  await publicClient.waitForTransactionReceipt({ hash: fundHash, timeout: 120_000 })
}

export async function mintTestCusd(user: Address, amount = '1000') {
  const walletClient = getWalletClient()
  const publicClient = getPublicClient()
  await ensureCorrectChain()
  const hash = await walletClient.writeContract({
    account: user,
    address: CUSD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'mintForTesting',
    args: [parseUnits(amount, 18)],
  })
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
}

export async function runFactoryUpkeep(user: Address) {
  const walletClient = getWalletClient()
  const publicClient = getPublicClient()
  await ensureCorrectChain()

  const hash = await walletClient.writeContract({
    account: user,
    address: VAULT_FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'performUpkeep',
    args: [ZERO_BYTES],
  })
  await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 })
}

export async function getVaultHistory(vaultAddress: Address): Promise<VaultHistoryItem[]> {
  const client = getPublicClient()
  const fromBlock = 0n
  const [fundedLogs, paymentLogs, refundLogs] = await Promise.all([
    client.getLogs({
      address: vaultAddress,
      event: parseAbiItem('event MemberFunded(address indexed member, uint256 amount, uint256 timestamp)'),
      fromBlock,
    }),
    client.getLogs({
      address: vaultAddress,
      event: parseAbiItem('event PaymentExecuted(uint256 amount, uint8 route, uint256 timestamp)'),
      fromBlock,
    }),
    client.getLogs({
      address: vaultAddress,
      event: parseAbiItem('event CycleRefunded(uint256 timestamp)'),
      fromBlock,
    }),
  ])

  const history: VaultHistoryItem[] = [
    ...fundedLogs.map((log: any) => ({
      id: `${log.transactionHash}-${log.logIndex}`,
      label: 'Member funded',
      actor: log.args.member as Address,
      amount: log.args.amount,
      timestamp: log.args.timestamp,
      transactionHash: log.transactionHash,
    })),
    ...paymentLogs.map((log: any) => ({
      id: `${log.transactionHash}-${log.logIndex}`,
      label: 'Payment executed',
      amount: log.args.amount,
      timestamp: log.args.timestamp,
      transactionHash: log.transactionHash,
    })),
    ...refundLogs.map((log: any) => ({
      id: `${log.transactionHash}-${log.logIndex}`,
      label: 'Cycle refunded',
      timestamp: log.args.timestamp,
      transactionHash: log.transactionHash,
    })),
  ]

  return history.sort((a, b) => Number((b.timestamp ?? 0n) - (a.timestamp ?? 0n)))
}

export function formatCusd(amount: bigint) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(formatUnits(amount, 18)))
}

export function getProtocolBillingDay(date = new Date()) {
  return (Math.floor(date.getTime() / 1000 / 86400) % 30) + 1
}
