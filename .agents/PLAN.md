# Online Banking Development Plan

## Phase 1 — Smart Contracts & Base Setup
- [x] MockUSDC Implementation
- [x] VaultManager Implementation
- [x] SavingCore Implementation
- [x] SafeERC20 Integration

## Phase 2 — Saving Features & Security Patches
- [x] Create Saving Plan
- [x] Open Deposit (ERC721 NFT Certificate Minting)
- [x] Mature Withdraw (Principal + Interest)
- [x] Early Withdraw (Principal - Penalty)
- [x] Manual Renew (Security Fix: Enforce maturity timing)
- [x] Auto Renew (Payout accrued interest & roll over)
- [x] Grace Period Enforcement

## Phase 3 — Security & Control
- [x] Emergency Pause / Unpause
- [x] Emergency Non-Vault Token Recovery (`rescueToken`)
- [x] Reentrancy Guard & Access Control Review

## Phase 4 — Testing Suite & Security Review (COMPLETED)
- [x] Hardhat Unit Tests (MockUSDC, VaultManager, SavingCore)
- [x] Comprehensive Revert, Event, Edge Case, & Access Control Coverage (68 tests passing)
- [x] Security Audit & Exploit Fixes (Premature renewals, lost auto-renew interest, SafeERC20)
- [x] View Helpers (`getPlan`, `getDeposit`) & Getter Tests
- [x] Standalone Deployment Script (`scripts/deploy.js`) & Hardhat Ignition Module (`ignition/modules/OnlineBanking.ts`)

## Phase 5 — Deployment & Frontend Integration (NEXT PHASE)
- [ ] Deploy Sepolia Testnet
- [ ] Sepolia Etherscan Verification
- [ ] React / Ethers.js Frontend Interface (Dashboard, Open Deposit, Withdraw/Renew UI, Admin Panel)