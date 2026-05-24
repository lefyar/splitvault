// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SubscriptionVault.sol";
import "../src/VaultFactory.sol";

/**
 * @title VaultFuzzTest
 * @dev Fuzz tests for SubscriptionVault
 */
contract VaultFuzzTest is Test {
    VaultFactory factory;

    address cUSD = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1;
    address keeper = address(0x1111);
    address relayer = address(0x2222);
    address merchant = address(0x3333);

    function setUp() public {
        factory = new VaultFactory(cUSD, relayer);
    }

    /**
     * @dev Fuzz: Random number of members with split shares should always sum to 100%
     */
    function testFuzz_MemberSharesAlwaysSumTo100Percent(
        uint8 numMembers,
        uint256 monthlyAmount
    ) public {
        // Bound inputs
        numMembers = uint8(bound(numMembers, 1, 10));
        monthlyAmount = bound(monthlyAmount, 1e16, 1e20); // 0.01 to 1B cUSD

        // Create members array
        address[] memory members = new address[](numMembers);
        for (uint8 i = 0; i < numMembers; i++) {
            members[i] = address(uint160(0x4444 + i));
        }

        // Create share array that sums to 1,000,000 (100%)
        uint256[] memory shares = new uint256[](numMembers);
        uint256 sharesPerMember = 1000000 / numMembers;
        uint256 remainder = 1000000 % numMembers;

        for (uint8 i = 0; i < numMembers; i++) {
            shares[i] = sharesPerMember;
            if (i == 0) {
                shares[i] += remainder; // Add rounding to first member
            }
        }

        // Create vault
        address vaultAddr = factory.createVault(
            monthlyAmount,
            15,
            merchant,
            members,
            shares,
            "Fuzz Test"
        );

        SubscriptionVault vault = SubscriptionVault(vaultAddr);

        // Verify all members exist
        for (uint8 i = 0; i < numMembers; i++) {
            assertTrue(vault.isMember(members[i]));
        }

        // Get funding status
        (, uint256 totalRequired, uint256 membersCount, ) = vault
            .getFundingStatus();
        assertEq(totalRequired, monthlyAmount);
        assertEq(membersCount, numMembers);
    }

    /**
     * @dev Fuzz: Monthly amount should never overflow or underflow during share calculations
     */
    function testFuzz_ShareCalculationNoOverflow(uint256 monthlyAmount) public {
        monthlyAmount = bound(monthlyAmount, 1e16, 1e20); // Safe bounds

        address[] memory members = new address[](3);
        members[0] = address(0x4444);
        members[1] = address(0x5555);
        members[2] = address(0x6666);

        uint256[] memory shares = new uint256[](3);
        shares[0] = 333333;
        shares[1] = 333333;
        shares[2] = 333334;

        // This should never revert due to overflow
        address vaultAddr = factory.createVault(
            monthlyAmount,
            15,
            merchant,
            members,
            shares,
            "Overflow Test"
        );

        SubscriptionVault vault = SubscriptionVault(vaultAddr);
        (, uint256 totalRequired, , ) = vault.getFundingStatus();

        // Total required should match
        assertEq(totalRequired, monthlyAmount);
    }

    /**
     * @dev Fuzz: Billing day must be valid (1-28)
     */
    function testFuzz_BillingDayValidation(uint256 billingDay) public {
        billingDay = bound(billingDay, 0, 100);

        address[] memory members = new address[](1);
        members[0] = address(0x4444);

        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000000;

        if (billingDay < 1 || billingDay > 28) {
            vm.expectRevert("Invalid billing day");
        }

        factory.createVault(
            100e18,
            billingDay,
            merchant,
            members,
            shares,
            "Day Test"
        );
    }
}
