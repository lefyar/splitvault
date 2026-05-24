// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../src/SubscriptionVault.sol";
import "../src/VaultFactory.sol";
import "../src/MockcUSD.sol";

contract SubscriptionVaultDirectFlowTest is Test {
    MockcUSD cUSD;
    VaultFactory factory;

    address relayer = address(0xBEEF);
    address merchant = address(0xCAFE);
    address alice = address(0xA1);
    address bob = address(0xB2);

    uint256 monthlyAmount = 100e18;
    uint256 billingDay = 15;

    address[] members;
    uint256[] shares;

    function setUp() public {
        cUSD = new MockcUSD();
        factory = new VaultFactory(address(cUSD), relayer);

        members = new address[](2);
        members[0] = alice;
        members[1] = bob;

        // 50/50
        shares = new uint256[](2);
        shares[0] = 500_000;
        shares[1] = 500_000;

        address vaultAddr = factory.createVault(
            monthlyAmount,
            billingDay,
            merchant,
            members,
            shares,
            "Direct"
        );

        // fund members
        cUSD.mint(alice, monthlyAmount);
        cUSD.mint(bob, monthlyAmount);

        // approve max
        vm.startPrank(alice);
        cUSD.approve(vaultAddr, type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        cUSD.approve(vaultAddr, type(uint256).max);
        vm.stopPrank();
    }

    function testExecutePayment_DirectHappyPath_TransfersAndEmits() public {
        SubscriptionVault vault = SubscriptionVault(factory.getVaultAt(0));

        // fund both shares
        vm.prank(alice);
        vault.fundShare();
        vm.prank(bob);
        vault.fundShare();

        assertEq(vault.totalFunded(), monthlyAmount);

        // move time to cycleDeadline (slightly after to avoid edge cases)
        uint256 deadline = vault.cycleDeadline();
        vm.warp(deadline + 1);

        uint256 merchantBalBefore = cUSD.balanceOf(merchant);

        vm.expectEmit(true, true, true, true);
        // PaymentExecuted(amount, route, timestamp)
        emit ISubscriptionVault.PaymentExecuted(
            monthlyAmount,
            ISubscriptionVault.PaymentRoute.DIRECT,
            block.timestamp
        );

        vm.prank(address(factory));
        vault.executePayment();

        assertEq(cUSD.balanceOf(merchant), merchantBalBefore + monthlyAmount);
        assertEq(vault.cycleActive(), false);
        // totalFunded is not decreased on executePayment() in current contract
        assertEq(vault.totalFunded(), monthlyAmount);

        // Ensure vault actually transferred funds
        assertEq(cUSD.balanceOf(address(vault)), 0);
    }

    function testExecutePayment_RequiresFullFunding() public {
        SubscriptionVault vault = SubscriptionVault(factory.getVaultAt(0));

        vm.prank(alice);
        vault.fundShare();

        vm.warp(vault.cycleDeadline() + 1);

        vm.prank(address(factory));
        vm.expectRevert("Not fully funded");
        vault.executePayment();
    }

    function testExecutePayment_CannotRunTwice() public {
        SubscriptionVault vault = SubscriptionVault(factory.getVaultAt(0));

        vm.prank(alice);
        vault.fundShare();
        vm.prank(bob);
        vault.fundShare();

        vm.warp(vault.cycleDeadline() + 1);

        vm.prank(address(factory));
        vault.executePayment();

        vm.prank(address(factory));
        vm.expectRevert("Cycle not active");
        vault.executePayment();
    }
}
