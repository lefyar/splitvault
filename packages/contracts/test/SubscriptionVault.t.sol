// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SubscriptionVault.sol";
import "../src/VaultFactory.sol";

/**
 * @title VaultTest
 * @dev Unit tests for SubscriptionVault
 */
contract VaultTest is Test {
    VaultFactory factory;
    SubscriptionVault vault;

    address cUSD = 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1; // Alfajores cUSD
    address keeper = address(0x1111);
    address relayer = address(0x2222);
    address merchant = address(0x3333);
    address alice = address(0x4444);
    address bob = address(0x5555);
    address charlie = address(0x6666);

    uint256 monthlyAmount = 100e18; // 100 cUSD
    uint256 billingDay = 15;

    function setUp() public {
        // Deploy factory
        factory = new VaultFactory(cUSD, relayer);

        // Create array of members
        address[] memory members = new address[](3);
        members[0] = alice;
        members[1] = bob;
        members[2] = charlie;

        // Each member pays 1/3 (333333 basis points * 100)
        uint256[] memory shares = new uint256[](3);
        shares[0] = 333333;
        shares[1] = 333333;
        shares[2] = 333334; // Last one gets rounding

        // Create vault
        address vaultAddr = factory.createVault(
            monthlyAmount,
            billingDay,
            merchant,
            members,
            shares,
            "Test Service"
        );

        vault = SubscriptionVault(vaultAddr);
    }

    // ── Basic Tests ────────────────────────────────────────────────────────────

    function testVaultDeployed() public {
        assertTrue(factory.isVault(address(vault)));
    }

    function testMembersInitialized() public {
        assertTrue(vault.isMember(alice));
        assertTrue(vault.isMember(bob));
        assertTrue(vault.isMember(charlie));
        assertFalse(vault.isMember(address(0x9999)));
    }

    function testGetMembers() public {
        address[] memory members = vault.getMembers();
        assertEq(members.length, 3);
        assertEq(members[0], alice);
        assertEq(members[1], bob);
        assertEq(members[2], charlie);
    }

    function testFundingStatus() public {
        (
            uint256 totalFunded,
            uint256 totalRequired,
            uint256 membersCount,
            uint256 membersFunded
        ) = vault.getFundingStatus();
        assertEq(totalFunded, 0);
        assertEq(totalRequired, monthlyAmount);
        assertEq(membersCount, 3);
        assertEq(membersFunded, 0);
    }

    // ── Funding Tests ──────────────────────────────────────────────────────────

    function testFundShare_MockApprovalForTest() public {
        // Note: In real scenario, we'd need to mock cUSD. For now, this just tests revert scenarios.

        // Member not approved, should revert
        vm.prank(alice);
        vm.expectRevert();
        vault.fundShare();
    }

    function testRefundCycle_PartialFunding() public {
        // If not fully funded, after deadline the keeper should be able to refund.
        // Note: SubscriptionVault is currently DIRECT-only, and refundCycle is callable
        // only by VaultFactory, so we call it from the factory address.
        vm.warp(block.timestamp + 25 days); // Move forward 25 days

        vm.prank(address(factory));
        vm.expectRevert("Not fully funded"); // from executePayment() path if it were called
        vault.executePayment(); // Should fail: not fully funded
    }

    // ── Payment Execution Tests ────────────────────────────────────────────────

    function testExecutePayment_TooEarlyReverts() public {
        // executePayment should not work before cycleDeadline (SC gating).
        vm.prank(address(factory));
        vm.expectRevert("Too early");
        vault.executePayment();
    }

    function testCycleDeadline() public {
        uint256 deadline = vault.getCycleDeadline();
        assertTrue(deadline > block.timestamp);
    }

    // ── Factory Tests ──────────────────────────────────────────────────────────

    function testFactoryTracksVaults() public {
        assertEq(factory.getVaultsCount(), 1);
        assertEq(factory.getVaultAt(0), address(vault));
    }

    function testFactoryTracksCreatorVaults() public {
        address[] memory creatorVaults = factory.getCreatorVaults(
            address(this)
        );
        assertEq(creatorVaults.length, 1);
        assertEq(creatorVaults[0], address(vault));
    }

    function testFactoryRejectsBadParams() public {
        address[] memory members = new address[](1);
        members[0] = alice;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 1000000;

        // Invalid billing day
        vm.expectRevert("Invalid billing day");
        factory.createVault(
            monthlyAmount,
            0, // Bad: 0
            merchant,
            members,
            shares,
            "Bad Service"
        );

        // Invalid amount
        vm.expectRevert("Amount must be > 0");
        factory.createVault(
            0, // Bad: 0
            billingDay,
            merchant,
            members,
            shares,
            "Bad Service"
        );
    }

    // ── Admin Tests ────────────────────────────────────────────────────────────

    function testSetRelayer() public {
        address newRelayer = address(0x8888);
        factory.setRelayer(newRelayer);
        assertEq(factory.relayer(), newRelayer);
    }

    // VaultFactory currently does not support a separate keeper address in this repo version.
}
