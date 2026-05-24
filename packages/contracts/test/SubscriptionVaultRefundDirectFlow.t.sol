// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../src/SubscriptionVault.sol";
import "../src/VaultFactory.sol";
import "../src/MockcUSD.sol";

contract SubscriptionVaultRefundDirectFlowTest is Test {
    MockcUSD cUSD;
    VaultFactory factory;

    address relayer = address(0xBEEF);
    address merchant = address(0xCAFE);
    address alice = address(0xA1);
    address bob = address(0xB2);

    uint256 monthlyAmount = 100e18;
    uint256 billingDay = 15;

    function setUp() public {
        cUSD = new MockcUSD();
        factory = new VaultFactory(address(cUSD), relayer);

        address[] memory members = new address[](2);
        members[0] = alice;
        members[1] = bob;

        uint256[] memory shares = new uint256[](2);
        shares[0] = 500_000;
        shares[1] = 500_000;

        factory.createVault(
            monthlyAmount,
            billingDay,
            merchant,
            members,
            shares,
            "Direct"
        );

        SubscriptionVault vault = SubscriptionVault(factory.getVaultAt(0));

        // Fund only alice (50%)
        uint256 aliceShareAmount = monthlyAmount / 2;

        cUSD.mint(alice, aliceShareAmount);
        vm.startPrank(alice);
        cUSD.approve(address(vault), type(uint256).max);
        vault.fundShare();
        vm.stopPrank();

        assertEq(vault.totalFunded(), aliceShareAmount);
    }

    function testRefundCycle_DirectHappyPath_RefundsAndResets() public {
        SubscriptionVault vault = SubscriptionVault(factory.getVaultAt(0));

        uint256 aliceShareAmount = monthlyAmount / 2;

        uint256 aliceBalBefore = cUSD.balanceOf(alice);
        uint256 bobBalBefore = cUSD.balanceOf(bob);
        uint256 merchantBalBefore = cUSD.balanceOf(merchant);

        // move to due
        vm.warp(vault.cycleDeadline());

        vm.prank(address(factory));
        vault.refundCycle();

        // alice refunded
        assertEq(cUSD.balanceOf(alice), aliceBalBefore + aliceShareAmount);
        // bob unchanged
        assertEq(cUSD.balanceOf(bob), bobBalBefore);
        // merchant should not receive
        assertEq(cUSD.balanceOf(merchant), merchantBalBefore);

        // vault reset
        assertEq(vault.cycleActive(), true);
        assertEq(vault.totalFunded(), 0);
    }
}
