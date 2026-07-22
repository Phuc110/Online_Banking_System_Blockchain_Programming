# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-07-22

### Fixed
- **TypeScript Compiler Configuration**: Fixed [tsconfig.json](file:///d:/Desktop/OnlineBankingProject/tsconfig.json) module options causing `verbatimModuleSyntax` module mismatch and obsolete `moduleResolution` errors during `npx tsc --noEmit`.
- **Premature Manual Renewal Vulnerability**: Fixed flaw in [SavingCore.sol](file:///d:/Desktop/OnlineBankingProject/contracts/SavingCore.sol#L294) where `renewDeposit` allowed renewals prior to maturity, enabling premature interest payouts. Added `require(block.timestamp >= oldDep.maturityAt, "Not matured")`.
- **Unclaimed Interest Loss in Auto-Renew**: Fixed missing interest payout in `autoRenewDeposit` inside [SavingCore.sol](file:///d:/Desktop/OnlineBankingProject/contracts/SavingCore.sol#L357) by adding interest calculation and triggering `vault.payInterest(owner, interest)`.
- **MockUSDC Deployment Test Bug**: Fixed missing `initialOwner` parameter in `MockUSDC.deploy()` inside [test/MockUSDC.test.js](file:///d:/Desktop/OnlineBankingProject/test/MockUSDC.test.js#L16).

### Added
- **React & Ethers.js Frontend Web Application**: Built complete, glassmorphic Web3 frontend interface in [frontend/src/App.tsx](file:///d:/Desktop/OnlineBankingProject/frontend/src/App.tsx) supporting wallet connection, mUSDC faucet minting, deposit creation, certificate NFT viewing, maturity withdrawal, early withdrawal, auto-renew toggling, and admin vault/plan management.
- **Contract Configuration**: Created [frontend/src/contracts/config.ts](file:///d:/Desktop/OnlineBankingProject/frontend/src/contracts/config.ts) containing human-readable ABIs and contract addresses for both localhost and Sepolia networks.
- **Deployment Template**: Added [.env.example](file:///d:/Desktop/OnlineBankingProject/.env.example) for Sepolia RPC, private key, and Etherscan API key setup.
- **SafeERC20 Integration**: Added `using SafeERC20 for IERC20;` across [SavingCore.sol](file:///d:/Desktop/OnlineBankingProject/contracts/SavingCore.sol) and [VaultManager.sol](file:///d:/Desktop/OnlineBankingProject/contracts/VaultManager.sol).
- **VaultManager Unit Tests**: Created comprehensive test suite in [test/VaultManager.test.js](file:///d:/Desktop/OnlineBankingProject/test/VaultManager.test.js).
- **SavingCore Unit Tests**: Created comprehensive test suite in [test/SavingCore.test.js](file:///d:/Desktop/OnlineBankingProject/test/SavingCore.test.js).
- **System Documentation**: Added [PLAN.md](file:///d:/Desktop/OnlineBankingProject/PLAN.md), [CONTEXT.md](file:///d:/Desktop/OnlineBankingProject/CONTEXT.md), [ARCHITECTURE.md](file:///d:/Desktop/OnlineBankingProject/ARCHITECTURE.md), and [CHANGELOG.md](file:///d:/Desktop/OnlineBankingProject/CHANGELOG.md).
- **Enhanced README**: Rewrote [README.md](file:///d:/Desktop/OnlineBankingProject/README.md) with comprehensive architecture overview, feature list, installation instructions, and testing guides.
- **Contract View Helpers**: Added `getPlan()` and `getDeposit()` view helper functions to [SavingCore.sol](file:///d:/Desktop/OnlineBankingProject/contracts/SavingCore.sol#L401).
- **Deployment Scripts & Ignition Modules**: Created standalone deployment script [scripts/deploy.js](file:///d:/Desktop/OnlineBankingProject/scripts/deploy.js) and Hardhat Ignition module [ignition/modules/OnlineBanking.ts](file:///d:/Desktop/OnlineBankingProject/ignition/modules/OnlineBanking.ts). Cleaned up sample template files.
