// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVaultManager {
    function payInterest(address to, uint256 amount) external;
    function feeReceiver() external view returns (address);
}

contract SavingCore is ERC721, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    event PlanCreated(
        uint256 indexed planId,
        uint256 tenorDays,
        uint256 aprBps
    );

    event PlanUpdated(uint256 indexed planId, uint256 newAprBps);

    event DepositOpened(
        uint256 indexed depositId,
        address indexed owner,
        uint256 planId,
        uint256 principal,
        uint256 maturityAt,
        uint256 aprBpsAtOpen
    );

    event Withdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interest,
        bool isEarly
    );

    event Renewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        uint256 newPrincipal,
        uint256 newPlanId
    );
    enum DepositStatus {
        Active,
        Withdrawn,
        ManualRenewed,
        AutoRenewed
    }
    struct SavingPlan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }
    struct Deposit {
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        uint256 tenorDays;
        uint256 aprBpsAtOpen;
        uint256 penaltyBpsAtOpen;
        bool autoRenew;
        DepositStatus status;
    }
    IERC20 public immutable token;

    IVaultManager public vault;

    uint256 public nextPlanId;

    uint256 public nextDepositId;

    mapping(uint256 => SavingPlan) public plans;

    mapping(uint256 => Deposit) public deposits;
    constructor(
        address tokenAddress,
        address vaultAddress,
        address initialOwner
    ) ERC721("Saving Certificate", "SCERT") Ownable(initialOwner) {
        require(tokenAddress != address(0), "Invalid token");
        require(vaultAddress != address(0), "Invalid vault");
        require(initialOwner != address(0), "Invalid owner");
        token = IERC20(tokenAddress);

        vault = IVaultManager(vaultAddress);
    }
    modifier validPlan(uint256 planId) {
        require(planId < nextPlanId, "Plan not found");
        _;
    }
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 penaltyBps
    ) external onlyOwner {
        require(tenorDays > 0, "Invalid tenor");
        require(aprBps > 0, "Invalid APR");
        require(aprBps <= 10000, "APR too high");
        require(penaltyBps <= 10000, "Penalty too high");

        if (maxDeposit != 0) {
            require(maxDeposit >= minDeposit, "Invalid deposit range");
        }

        plans[nextPlanId] = SavingPlan({
            tenorDays: tenorDays,
            aprBps: aprBps,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            earlyWithdrawPenaltyBps: penaltyBps,
            enabled: true
        });

        emit PlanCreated(nextPlanId, tenorDays, aprBps);

        nextPlanId++;
    }
    function updatePlan(
        uint256 planId,
        uint256 newAprBps
    ) external onlyOwner validPlan(planId) {
        require(newAprBps > 0, "Invalid APR");
        require(newAprBps <= 10000, "APR too high");

        plans[planId].aprBps = newAprBps;

        emit PlanUpdated(planId, newAprBps);
    }
    function enablePlan(uint256 planId) external onlyOwner validPlan(planId) {
        plans[planId].enabled = true;
    }
    function disablePlan(uint256 planId) external onlyOwner validPlan(planId) {
        plans[planId].enabled = false;
    }
    function calculateInterest(
        uint256 principal,
        uint256 aprBps,
        uint256 tenorDays
    ) public pure returns (uint256) {
        uint256 tenorSeconds = tenorDays * 1 days;

        return (principal * aprBps * tenorSeconds) / (365 days * 10000);
    }
    modifier validDeposit(uint256 depositId) {
        require(depositId < nextDepositId, "Deposit not found");
        _;
    }
    modifier onlyDepositOwner(uint256 depositId) {
        require(ownerOf(depositId) == msg.sender, "Not deposit owner");
        _;
    }
    uint256 public constant GRACE_PERIOD = 3 days;
    function openDeposit(
        uint256 planId,
        uint256 amount
    ) external whenNotPaused nonReentrant validPlan(planId) {
        SavingPlan memory plan = plans[planId];

        require(plan.enabled, "Plan disabled");
        require(amount > 0, "Invalid amount");

        if (plan.minDeposit > 0) {
            require(amount >= plan.minDeposit, "Below minimum deposit");
        }

        if (plan.maxDeposit > 0) {
            require(amount <= plan.maxDeposit, "Above maximum deposit");
        }

        token.safeTransferFrom(msg.sender, address(this), amount);

        uint256 depositId = nextDepositId;

        deposits[depositId] = Deposit({
            planId: planId,
            principal: amount,
            startAt: block.timestamp,
            maturityAt: block.timestamp + plan.tenorDays * 1 days,
            tenorDays: plan.tenorDays,
            aprBpsAtOpen: plan.aprBps,
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            autoRenew: false,
            status: DepositStatus.Active
        });

        _safeMint(msg.sender, depositId);

        emit DepositOpened(
            depositId,
            msg.sender,
            planId,
            amount,
            block.timestamp + plan.tenorDays * 1 days,
            plan.aprBps
        );

        nextDepositId++;
    }
    function withdrawAtMaturity(
        uint256 depositId
    )
        external
        nonReentrant
        whenNotPaused
        validDeposit(depositId)
        onlyDepositOwner(depositId)
    {
        Deposit storage dep = deposits[depositId];

        require(dep.status == DepositStatus.Active, "Deposit inactive");

        require(block.timestamp >= dep.maturityAt, "Not matured");

        uint256 interest = calculateInterest(
            dep.principal,
            dep.aprBpsAtOpen,
            dep.tenorDays
        );

        dep.status = DepositStatus.Withdrawn;
        _burn(depositId);

        vault.payInterest(msg.sender, interest);

        token.safeTransfer(msg.sender, dep.principal);

        emit Withdrawn(depositId, msg.sender, dep.principal, interest, false);
    }
    function earlyWithdraw(
        uint256 depositId
    )
        external
        nonReentrant
        whenNotPaused
        validDeposit(depositId)
        onlyDepositOwner(depositId)
    {
        Deposit storage dep = deposits[depositId];

        require(dep.status == DepositStatus.Active, "Deposit inactive");

        require(block.timestamp < dep.maturityAt, "Already matured");

        uint256 penalty = (dep.principal * dep.penaltyBpsAtOpen) / 10000;

        uint256 refund = dep.principal - penalty;

        dep.status = DepositStatus.Withdrawn;

        _burn(depositId);

        token.safeTransfer(msg.sender, refund);
        token.safeTransfer(vault.feeReceiver(), penalty);

        emit Withdrawn(depositId, msg.sender, refund, 0, true);
    }
    function renewDeposit(
        uint256 depositId
    )
        external
        nonReentrant
        whenNotPaused
        validDeposit(depositId)
        onlyDepositOwner(depositId)
    {
        Deposit storage oldDep = deposits[depositId];

        require(oldDep.status == DepositStatus.Active, "Deposit inactive");

        require(block.timestamp >= oldDep.maturityAt, "Not matured");
        require(
            block.timestamp <= oldDep.maturityAt + GRACE_PERIOD,
            "Grace period expired"
        );
        SavingPlan memory plan = plans[oldDep.planId];

        require(plan.enabled, "Plan disabled");

        uint256 interest = calculateInterest(
            oldDep.principal,
            oldDep.aprBpsAtOpen,
            oldDep.tenorDays
        );

        vault.payInterest(msg.sender, interest);

        oldDep.status = DepositStatus.ManualRenewed;

        _burn(depositId);

        uint256 newDepositId = nextDepositId;

        deposits[newDepositId] = Deposit({
            planId: oldDep.planId,
            principal: oldDep.principal,
            startAt: block.timestamp,
            maturityAt: block.timestamp + plan.tenorDays * 1 days,
            tenorDays: plan.tenorDays,
            aprBpsAtOpen: plan.aprBps,
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            autoRenew: false,
            status: DepositStatus.Active
        });

        _safeMint(msg.sender, newDepositId);

        emit Renewed(depositId, newDepositId, oldDep.principal, oldDep.planId);

        nextDepositId++;
    }
    function enableAutoRenew(
        uint256 depositId
    ) external validDeposit(depositId) onlyDepositOwner(depositId) {
        Deposit storage dep = deposits[depositId];

        require(dep.status == DepositStatus.Active, "Deposit inactive");

        dep.autoRenew = true;
    }

    function disableAutoRenew(
        uint256 depositId
    ) external validDeposit(depositId) onlyDepositOwner(depositId) {
        Deposit storage dep = deposits[depositId];

        require(dep.status == DepositStatus.Active, "Deposit inactive");

        dep.autoRenew = false;
    }
    function autoRenewDeposit(
        uint256 depositId
    ) external nonReentrant whenNotPaused validDeposit(depositId) {
        Deposit storage oldDep = deposits[depositId];

        require(oldDep.status == DepositStatus.Active, "Deposit inactive");

        require(oldDep.autoRenew, "Auto renew disabled");

        require(
            block.timestamp >= oldDep.maturityAt + GRACE_PERIOD,
            "Grace period not ended"
        );

        SavingPlan memory plan = plans[oldDep.planId];

        require(plan.enabled, "Plan disabled");

        uint256 interest = calculateInterest(
            oldDep.principal,
            oldDep.aprBpsAtOpen,
            oldDep.tenorDays
        );

        oldDep.status = DepositStatus.AutoRenewed;

        uint256 newDepositId = nextDepositId;

        deposits[newDepositId] = Deposit({
            planId: oldDep.planId,
            principal: oldDep.principal,
            startAt: block.timestamp,
            maturityAt: block.timestamp + plan.tenorDays * 1 days,
            tenorDays: plan.tenorDays,
            aprBpsAtOpen: plan.aprBps,
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            autoRenew: true,
            status: DepositStatus.Active
        });

        address owner = ownerOf(depositId);

        _burn(depositId);

        vault.payInterest(owner, interest);

        _safeMint(owner, newDepositId);

        emit Renewed(depositId, newDepositId, oldDep.principal, oldDep.planId);

        nextDepositId++;
    }
    function getPlan(
        uint256 planId
    ) external view validPlan(planId) returns (SavingPlan memory) {
        return plans[planId];
    }

    function getDeposit(
        uint256 depositId
    ) external view validDeposit(depositId) returns (Deposit memory) {
        return deposits[depositId];
    }

    receive() external payable {
        revert("ETH not accepted");
    }
}
