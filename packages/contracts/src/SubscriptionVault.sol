// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ISubscriptionVault
 * @dev Interface for SubscriptionVault contract
 */
interface ISubscriptionVault {
    enum PaymentRoute {
        DIRECT,
        BRIDGE,
        CARD
    }

    event MemberFunded(
        address indexed member,
        uint256 amount,
        uint256 timestamp
    );
    event PaymentExecuted(
        uint256 amount,
        PaymentRoute route,
        uint256 timestamp
    );
    event CycleRefunded(uint256 timestamp);
    event CycleReset(uint256 nextDeadline);

    function fundShare() external;
    function executePayment() external;
    function refundCycle() external;
    function confirmPaymentAndReset() external;
    function getFundingStatus()
        external
        view
        returns (
            uint256 totalFunded,
            uint256 totalRequired,
            uint256 membersCount,
            uint256 membersFunded
        );
    function isMember(address addr) external view returns (bool);
}

/**
 * @title SubscriptionVault
 * @dev Trustless subscription splitting vault. DIRECT route only (v0.2).
 *
 * Members deposit their share of a recurring subscription.
 * On the billing date, keeper calls executePayment() which transfers to merchant.
 * If not fully funded 24h before deadline, keeper refunds all members.
 */
contract SubscriptionVault is ISubscriptionVault, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ── State ──────────────────────────────────────────────────────────────────

    address public factory;
    IERC20 public cUSD;
    uint256 public monthlyAmount; // Total subscription cost in cUSD (18 decimals)
    uint256 public billingDay; // Day of month (1–28) to execute payment
    address public relayer; // Relayer address for confirmPaymentAndReset
    PaymentRoute public route; // DIRECT for v0.2 (future: BRIDGE/CARD)

    struct Member {
        address wallet;
        uint256 sharePercent; // Basis points * 100 (e.g. 3333 = 33.33%)
        uint256 shareAmount; // Pre-calculated cUSD amount (18 decimals)
        bool funded;
    }

    mapping(address => Member) public members;
    address[] public memberList;
    address public merchantAddress; // Celo wallet address for direct payment
    address public creator; // Vault creator

    uint256 public cycleDeadline; // Unix timestamp — must fund before this
    bool public cycleActive;
    uint256 public totalFunded;

    // ── Events (declared in ISubscriptionVault) ────────────────────────────────

    // ── Modifiers ──────────────────────────────────────────────────────────────

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer");
        _;
    }

    modifier onlyCreator() {
        require(msg.sender == creator, "Only creator");
        _;
    }

    modifier onlyMember() {
        require(members[msg.sender].wallet != address(0), "Not a member");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────────

    /**
     * @dev Initialize vault. Called by VaultFactory.
     * @param _cUSD cUSD token address
     * @param _monthlyAmount Total subscription cost
     * @param _billingDay Day of month (1-28)
     * @param _merchantAddress Direct payment recipient
     * @param _memberAddresses Array of member wallet addresses
     * @param _memberShares Array of member shares (basis points * 100, sum to 1000000)
     * @param _relayer Relayer address for Bridge/Card (can be zero for DIRECT)
     * @param _creator Vault creator
     */
    function initialize(
        address _cUSD,
        uint256 _monthlyAmount,
        uint256 _billingDay,
        address _merchantAddress,
        address[] calldata _memberAddresses,
        uint256[] calldata _memberShares,
        address _relayer,
        address _creator
    ) external {
        require(factory == address(0), "Already initialized");
        require(
            _memberAddresses.length == _memberShares.length,
            "Length mismatch"
        );
        require(_billingDay >= 1 && _billingDay <= 28, "Invalid billing day");
        require(_monthlyAmount > 0, "Amount must be > 0");

        factory = msg.sender;
        cUSD = IERC20(_cUSD);
        monthlyAmount = _monthlyAmount;
        billingDay = _billingDay;
        merchantAddress = _merchantAddress;
        relayer = _relayer;
        creator = _creator;

        // v0.2: DIRECT only
        route = PaymentRoute.DIRECT;

        cycleActive = true;

        // Initialize members and pre-calculate shares
        uint256 totalShares = 0;
        for (uint256 i = 0; i < _memberAddresses.length; i++) {
            require(_memberAddresses[i] != address(0), "Invalid member");

            uint256 shareAmount = (_monthlyAmount * _memberShares[i]) / 1000000;

            members[_memberAddresses[i]] = Member({
                wallet: _memberAddresses[i],
                sharePercent: _memberShares[i],
                shareAmount: shareAmount,
                funded: false
            });

            memberList.push(_memberAddresses[i]);
            totalShares += _memberShares[i];
        }

        require(totalShares == 1000000, "Shares must sum to 100%");

        // Set initial cycle deadline (next billing day)
        _resetCycleDeadline();
    }

    // ── Member Actions ────────────────────────────────────────────────────────

    /**
     * @dev Fund vault with member's share. Member must approve cUSD first.
     */
    function fundShare() external nonReentrant onlyMember {
        require(cycleActive, "Cycle not active");
        require(!members[msg.sender].funded, "Already funded");

        Member storage member = members[msg.sender];
        require(member.shareAmount > 0, "Invalid share");

        // Transfer from member to vault (Checks-Effects-Interactions)
        cUSD.safeTransferFrom(msg.sender, address(this), member.shareAmount);

        // Update state
        member.funded = true;
        totalFunded += member.shareAmount;

        emit MemberFunded(msg.sender, member.shareAmount, block.timestamp);
    }

    // ── Keeper Actions (Chainlink) ─────────────────────────────────────────────

    /**
     * @dev Execute payment. Called by VaultFactory on billing date.
     * Only succeeds if vault is fully funded.
     */
    function executePayment() external nonReentrant onlyFactory {
        require(cycleActive, "Cycle not active");
        // Deadline gating: SC is source of truth
        require(block.timestamp >= cycleDeadline, "Too early");
        require(totalFunded >= monthlyAmount, "Not fully funded");

        cycleActive = false;

        // DIRECT route: transfer to merchant
        cUSD.safeTransfer(merchantAddress, monthlyAmount);

        emit PaymentExecuted(monthlyAmount, route, block.timestamp);
    }

    /**
     * @dev Refund cycle. Called by VaultFactory if vault is NOT fully funded after deadline.
     */
    function refundCycle() external nonReentrant onlyFactory {
        require(cycleActive, "Cycle not active");
        // Deadline gating: SC is source of truth
        require(block.timestamp >= cycleDeadline, "Too early");
        require(totalFunded < monthlyAmount, "Vault is fully funded");

        cycleActive = false;

        // Refund each funded member
        for (uint256 i = 0; i < memberList.length; i++) {
            address memberAddr = memberList[i];
            Member storage member = members[memberAddr];

            if (member.funded) {
                member.funded = false;
                cUSD.safeTransfer(memberAddr, member.shareAmount);
            }
        }

        totalFunded = 0;
        emit CycleRefunded(block.timestamp);

        // Reset for next cycle
        _resetCycle();
    }

    /**
     * @dev Confirm payment and reset cycle. Called by relayer (for Bridge/Card in future).
     * For v0.2 DIRECT route, this is called after executePayment for cleanliness.
     */
    function confirmPaymentAndReset() external onlyRelayer {
        require(!cycleActive, "Cycle still active");
        _resetCycle();
    }

    // ── View Functions ────────────────────────────────────────────────────────

    /**
     * @dev Get funding status for this cycle
     */
    function getFundingStatus()
        external
        view
        returns (
            uint256 totalFundedAmount,
            uint256 totalRequired,
            uint256 membersCount,
            uint256 membersFunded
        )
    {
        totalFundedAmount = totalFunded;
        totalRequired = monthlyAmount;
        membersCount = memberList.length;

        for (uint256 i = 0; i < memberList.length; i++) {
            if (members[memberList[i]].funded) {
                membersFunded++;
            }
        }
    }

    /**
     * @dev Check if address is a member
     */
    function isMember(address addr) external view returns (bool) {
        return members[addr].wallet != address(0);
    }

    /**
     * @dev Get member info
     */
    function getMember(
        address addr
    )
        external
        view
        returns (
            address wallet,
            uint256 sharePercent,
            uint256 shareAmount,
            bool funded
        )
    {
        Member storage member = members[addr];
        return (
            member.wallet,
            member.sharePercent,
            member.shareAmount,
            member.funded
        );
    }

    /**
     * @dev Get all members
     */
    function getMembers() external view returns (address[] memory) {
        return memberList;
    }

    /**
     * @dev Get cycle deadline
     */
    function getCycleDeadline() external view returns (uint256) {
        return cycleDeadline;
    }

    function nextBillingDate() public view returns (uint256) {
        uint256 currentDay = _getDay(block.timestamp);
        uint256 daysToAdd;

        if (currentDay <= billingDay) {
            daysToAdd = billingDay - currentDay;
        } else {
            // Approximate days in month
            daysToAdd = (30 - currentDay) + billingDay;
        }
        return block.timestamp + (daysToAdd * 1 days);
    }

    // ── Internal Functions ────────────────────────────────────────────────────

    /**
     * @dev Get day of month from timestamp (1-31)
     */
    function _getDay(uint256 timestamp) internal pure returns (uint256) {
        // Simple approximation, not perfectly accurate but sufficient for this use case
        uint256 daysSinceEpoch = timestamp / 86400;
        return (daysSinceEpoch % 30) + 1;
    }

    /**
     * @dev Reset cycle: reset funding state and set new deadline
     */
    function _resetCycle() internal {
        cycleActive = true;
        totalFunded = 0;

        // Reset funded flags
        for (uint256 i = 0; i < memberList.length; i++) {
            members[memberList[i]].funded = false;
        }

        _resetCycleDeadline();
        emit CycleReset(cycleDeadline);
    }

    /**
     * @dev Set cycle deadline to next month's billing day
     */
    function _resetCycleDeadline() internal {
        cycleDeadline = nextBillingDate();
    }
}
