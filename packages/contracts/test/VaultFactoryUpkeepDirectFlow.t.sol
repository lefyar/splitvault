// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../src/SubscriptionVault.sol";
import "../src/VaultFactory.sol";
import "../src/MockcUSD.sol";

contract VaultFactoryUpkeepDirectFlowTest is Test {
    MockcUSD cUSD;
    VaultFactory factory;

    address relayer = address(0xBEEF);
    address keeperCaller = address(0x1234);

    address merchant = address(0xCAFE);
    address alice = address(0xA1);

    uint256 monthlyAmount = 10e18;

    function setUp() public {
        cUSD = new MockcUSD();
        factory = new VaultFactory(address(cUSD), relayer);

        address[] memory members = new address[](1);
        members[0] = alice;

        uint256[] memory shares = new uint256[](1);
        shares[0] = 1_000_000; // 100%

        factory.createVault(
            monthlyAmount,
            15,
            merchant,
            members,
            shares,
            "Direct"
        );

        address vaultAddr = factory.getVaultAt(0);
        cUSD.mint(alice, monthlyAmount);

        vm.prank(alice);
        cUSD.approve(vaultAddr, type(uint256).max);

        vm.prank(alice);
        SubscriptionVault(vaultAddr).fundShare();
    }

    function testPerformUpkeep_ExecuteBranchWhenFundedAndDue() public {
        SubscriptionVault vault = SubscriptionVault(factory.getVaultAt(0));

        uint256 deadline = vault.cycleDeadline();
        // Ensure we are due
        vm.warp(deadline + 1);

        // Ensure vault state matches checkUpkeep assumptions
        assertTrue(vault.cycleActive());
        assertTrue(vault.totalFunded() >= vault.monthlyAmount());

        (bool upkeepNeeded, ) = factory.checkUpkeep("");
        assertTrue(upkeepNeeded);

        // performUpkeep will call vault.executePayment() from THIS tx context.
        // Only the factory can executePayment(), so we must call performUpkeep
        // as the vault factory itself.
        factory.performUpkeep("");

        assertEq(vault.cycleActive(), false);
        assertEq(vault.totalFunded(), monthlyAmount);
        assertEq(cUSD.balanceOf(merchant), monthlyAmount);
    }
}
