import { useEffect, useState } from 'react'
import { useStore } from '../store'
import type { Address } from '../types'

export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'unknown'

interface KYCResponse {
  status: KYCStatus
  kycLink?: string
  lastCheckedAt?: number
}

const RELAYER_BASE_URL = import.meta.env.VITE_RELAYER_BASE_URL || 'http://localhost:3000'
const KYC_ENABLED = import.meta.env.VITE_ENABLE_BRIDGE_CARD === 'true'

export function useKYC() {
  const { address } = useStore()
  const [kycStatus, setKycStatus] = useState<KYCStatus>('unknown')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kycLink, setKycLink] = useState<string | null>(null)

  const checkKYC = async (wallet: Address) => {
    if (!wallet) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${RELAYER_BASE_URL}/api/bridge/kyc-status?wallet=${wallet}`)
      const data = (await response.json()) as KYCResponse
      setKycStatus(data.status)
      setKycLink(data.kycLink || null)
    } catch (err) {
      console.error('Failed to check KYC status:', err)
      setError('Failed to check KYC status')
      setKycStatus('unknown')
    } finally {
      setLoading(false)
    }
  }

  const startKYC = () => {
    if (kycLink) {
      window.open(kycLink, '_blank')
    }
  }

  useEffect(() => {
    if (address && KYC_ENABLED) {
      checkKYC(address)
    }
  }, [address])

  return {
    kycStatus,
    loading,
    error,
    kycLink,
    checkKYC,
    startKYC,
    isApproved: kycStatus === 'approved',
    isPending: kycStatus === 'pending',
    isNotStarted: kycStatus === 'not_started',
    isRejected: kycStatus === 'rejected',
  }
}
