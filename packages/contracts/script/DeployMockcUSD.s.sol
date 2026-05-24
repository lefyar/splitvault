// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockcUSD.sol";

/**
 * @title DeployMockcUSD
 * @dev Deploy mock cUSD for Alfajores testing
 */
contract DeployMockcUSD is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MockcUSD mockCUSD = new MockcUSD();

        vm.stopBroadcast();

        console.log("MockcUSD deployed at:", address(mockCUSD));
        console.log(
            "Initial balance (deployer):",
            mockCUSD.balanceOf(vm.envAddress("DEPLOYER_PRIVATE_KEY"))
        );
    }
}
