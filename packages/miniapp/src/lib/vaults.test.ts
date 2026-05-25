import { describe, expect, it } from 'vitest'
import { calculateEqualShares, getProtocolBillingDay } from './vaults'

describe('vault helpers', () => {
  it('splits shares exactly to 100 percent precision', () => {
    for (let count = 1; count <= 12; count++) {
      const shares = calculateEqualShares(count)

      expect(shares).toHaveLength(count)
      expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1_000_000)
      expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1)
    }
  })

  it('matches the contract day-of-month approximation', () => {
    const epoch = new Date(0)
    const dayTwo = new Date(24 * 60 * 60 * 1000)
    const dayThirtyWrap = new Date(30 * 24 * 60 * 60 * 1000)

    expect(getProtocolBillingDay(epoch)).toBe(1)
    expect(getProtocolBillingDay(dayTwo)).toBe(2)
    expect(getProtocolBillingDay(dayThirtyWrap)).toBe(1)
  })
})

