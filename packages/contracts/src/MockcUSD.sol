// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockcUSD
 * @dev Mock cUSD token for Alfajores testnet
 *
 * In production, use real cUSD:
 * - Alfajores: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
 * - Mainnet: 0x765DE816845861e75A25fCA122bb6898B8B1282a
 */
contract MockcUSD is ERC20, Ownable {
    constructor() ERC20("Mock Celo Dollar", "cUSD") Ownable(msg.sender) {
        // Mint 1 million tokens to deployer
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    /**
     * @dev Mint tokens for testing (only owner)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Allow anyone to mint tokens for testing
     */
    function mintForTesting(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
