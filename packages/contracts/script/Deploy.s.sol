// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VaultFactory.sol";

/**
 * @title Deploy
 * @dev Deploy VaultFactory to Celo or Alfajores
 *
 * Usage:
 *   Celo Sepolia testnet:
 *     forge script script/Deploy.s.sol --rpc-url celo_sepolia --broadcast -vvv
 *
 *   Mainnet (with real cUSD):
 *     forge script script/Deploy.s.sol --rpc-url celo --broadcast --verify -vvv
 */
contract Deploy is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        address cUSD;
        try vm.envAddress("CUSD_ADDRESS_CELO_SEPOLIA") returns (address addr) {
            cUSD = addr;
        } catch {
            try vm.envAddress("CUSD_ADDRESS_ALFAJORES") returns (address addr) {
                cUSD = addr;
            } catch {
                cUSD = vm.envAddress("CUSD_ADDRESS");
            }
        }
        address keeper = vm.envAddress("GELATO_KEEPER"); // Keeper (use deployer for MVP)
        address relayer = vm.envAddress("RELAYER_ADDRESS"); // Relayer EOA

        vm.startBroadcast(deployerPrivateKey);

        VaultFactory factory = new VaultFactory(cUSD, relayer);

        vm.stopBroadcast();

        console.log("VaultFactory deployed at:", address(factory));
        console.log("cUSD address:", cUSD);
        console.log("Keeper:", keeper);
        console.log("Relayer:", relayer);
    }
}
