// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Minimal interface compatible with Chainlink Automation (Keepers).
 * This repo previously referenced a path inside chainlink-brownie-contracts,
 * but the dependency is not present in this checkout.
 */
interface KeeperCompatibleInterface {
    function checkUpkeep(
        bytes calldata checkData
    ) external view returns (bool upkeepNeeded, bytes memory performData);

    function performUpkeep(bytes calldata performData) external;
}
