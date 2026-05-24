// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/KeeperCompatibleInterface.sol";
import "./SubscriptionVault.sol";

/**
 * @title IVaultFactory
 * @dev Interface for VaultFactory contract
 */
interface IVaultFactory {
    event VaultCreated(
        address indexed vault,
        address indexed creator,
        string serviceName
    );

    function createVault(
        uint256 monthlyAmount,
        uint256 billingDay,
        address merchantAddress,
        address[] calldata members,
        uint256[] calldata memberShares,
        string calldata serviceName
    ) external returns (address);

    function getVaultsCount() external view returns (uint256);
    function getVaultAt(uint256 index) external view returns (address);
    function isVault(address addr) external view returns (bool);
}

/**
 * @title VaultFactory
 * @dev Factory for deploying SubscriptionVault contracts.
 * Tracks all vaults and is KeeperCompatible for Chainlink Automation.
 */
contract VaultFactory is IVaultFactory, Ownable, KeeperCompatibleInterface {
    address public cUSD;
    address public relayer;

    address[] public vaults;
    mapping(address => bool) public isVaultAddress;
    mapping(address => address[]) public creatorVaults;

    // ── Events ─────────────────────────────────────────────────────────────────

    event RelayerUpdated(address indexed newRelayer);
    event CUSDUpdated(address indexed newCUSD);

    // ── Constructor ────────────────────────────────────────────────────────────

    constructor(address _cUSD, address _relayer) Ownable(msg.sender) {
        require(_cUSD != address(0), "Invalid cUSD");
        require(_relayer != address(0), "Invalid relayer");

        cUSD = _cUSD;
        relayer = _relayer;
    }

    // ── Admin Functions ────────────────────────────────────────────────────────

    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "Invalid relayer");
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setCUSD(address _cUSD) external onlyOwner {
        require(_cUSD != address(0), "Invalid cUSD");
        cUSD = _cUSD;
        emit CUSDUpdated(_cUSD);
    }

    // ── Core Functions ────────────────────────────────────────────────────────

    /**
     * @dev Create a new SubscriptionVault
     */
    function createVault(
        uint256 monthlyAmount,
        uint256 billingDay,
        address merchantAddress,
        address[] calldata members,
        uint256[] calldata memberShares,
        string calldata serviceName
    ) external returns (address) {
        require(monthlyAmount > 0, "Amount must be > 0");
        require(billingDay >= 1 && billingDay <= 28, "Invalid billing day");
        require(merchantAddress != address(0), "Invalid merchant");
        require(members.length > 0, "At least 1 member");
        require(members.length == memberShares.length, "Length mismatch");

        // Deploy new vault
        SubscriptionVault vault = new SubscriptionVault();

        // Initialize vault
        vault.initialize(
            cUSD,
            monthlyAmount,
            billingDay,
            merchantAddress,
            members,
            memberShares,
            relayer,
            msg.sender
        );

        // Track vault
        vaults.push(address(vault));
        isVaultAddress[address(vault)] = true;
        creatorVaults[msg.sender].push(address(vault));

        emit VaultCreated(address(vault), msg.sender, serviceName);

        return address(vault);
    }

    // ── Keeper Functions ──────────────────────────────────────────────────────

    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        upkeepNeeded = false;
        uint256 vaultsLength = vaults.length;
        for (uint256 i = 0; i < vaultsLength; ++i) {
            SubscriptionVault vault = SubscriptionVault(vaults[i]);
            if (vault.cycleActive()) {
                bool isFunded = vault.totalFunded() >= vault.monthlyAmount();
                bool isPastDeadline = block.timestamp >= vault.cycleDeadline();

                if (isFunded && block.timestamp >= vault.nextBillingDate()) {
                    upkeepNeeded = true;
                    break;
                }
                if (!isFunded && isPastDeadline) {
                    upkeepNeeded = true;
                    break;
                }
            }
        }
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        uint256 vaultsLength = vaults.length;
        for (uint256 i = 0; i < vaultsLength; ++i) {
            SubscriptionVault vault = SubscriptionVault(vaults[i]);
            if (vault.cycleActive()) {
                bool isFunded = vault.totalFunded() >= vault.monthlyAmount();
                bool isPastDeadline = block.timestamp >= vault.cycleDeadline();

                if (isFunded && block.timestamp >= vault.nextBillingDate()) {
                    vault.executePayment();
                }
                if (!isFunded && isPastDeadline) {
                    vault.refundCycle();
                }
            }
        }
    }

    // ── View Functions ────────────────────────────────────────────────────────

    function getVaultsCount() external view returns (uint256) {
        return vaults.length;
    }

    function getVaultAt(uint256 index) external view returns (address) {
        require(index < vaults.length, "Index out of bounds");
        return vaults[index];
    }

    function getCreatorVaults(
        address creator
    ) external view returns (address[] memory) {
        return creatorVaults[creator];
    }

    function getCreatorVaultsCount(
        address creator
    ) external view returns (uint256) {
        return creatorVaults[creator].length;
    }

    function isVault(address addr) external view override returns (bool) {
        return isVaultAddress[addr];
    }
}
