export const CONTRACT_ADDRESSES = {
  // Hardhat Local Node default deployment addresses from scripts/deploy.js
  localhost: {
    mockUSDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    vaultManager: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    savingCore: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  },
  sepolia: {
    mockUSDC: (import.meta.env.VITE_SEPOLIA_MOCK_USDC as string) || "0x0000000000000000000000000000000000000000",
    vaultManager: (import.meta.env.VITE_SEPOLIA_VAULT_MANAGER as string) || "0x0000000000000000000000000000000000000000",
    savingCore: (import.meta.env.VITE_SEPOLIA_SAVING_CORE as string) || "0x0000000000000000000000000000000000000000",
  }
};

export const MOCK_USDC_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function mint(address to, uint256 amount)"
];

export const VAULT_MANAGER_ABI = [
  "function vaultBalance() view returns (uint256)",
  "function feeReceiver() view returns (address)",
  "function savingCore() view returns (address)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function fundVault(uint256 amount)",
  "function withdrawVault(uint256 amount)",
  "function setFeeReceiver(address _receiver)",
  "function setSavingCore(address _savingCore)",
  "function pause()",
  "function unpause()",
  "event VaultFunded(address indexed from, uint256 amount)",
  "event VaultWithdrawn(address indexed to, uint256 amount)",
  "event InterestPaid(address indexed to, uint256 amount)"
];

export const SAVING_CORE_ABI = [
  "function nextPlanId() view returns (uint256)",
  "function nextDepositId() view returns (uint256)",
  "function getPlan(uint256 planId) view returns (tuple(uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 earlyWithdrawPenaltyBps, bool enabled))",
  "function getDeposit(uint256 depositId) view returns (tuple(uint256 planId, uint256 principal, uint256 startAt, uint256 maturityAt, uint256 tenorDays, uint256 aprBpsAtOpen, uint256 penaltyBpsAtOpen, bool autoRenew, uint8 status))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function calculateInterest(uint256 principal, uint256 aprBps, uint256 tenorDays) pure returns (uint256)",
  "function openDeposit(uint256 planId, uint256 amount)",
  "function withdrawAtMaturity(uint256 depositId)",
  "function earlyWithdraw(uint256 depositId)",
  "function renewDeposit(uint256 depositId)",
  "function autoRenewDeposit(uint256 depositId)",
  "function enableAutoRenew(uint256 depositId)",
  "function disableAutoRenew(uint256 depositId)",
  "function createPlan(uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 penaltyBps)",
  "function updatePlan(uint256 planId, uint256 newAprBps)",
  "function enablePlan(uint256 planId)",
  "function disablePlan(uint256 planId)",
  "function pause()",
  "function unpause()",
  "function paused() view returns (bool)",
  "function owner() view returns (address)",
  "event DepositOpened(uint256 indexed depositId, address indexed owner, uint256 planId, uint256 principal, uint256 maturityAt, uint256 aprBpsAtOpen)",
  "event Withdrawn(uint256 indexed depositId, address indexed owner, uint256 principal, uint256 interest, bool isEarly)",
  "event Renewed(uint256 indexed oldDepositId, uint256 indexed newDepositId, uint256 newPrincipal, uint256 newPlanId)"
];
