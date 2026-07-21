# Project Context & Business Overview

## Project Name
Online Banking Saving Platform

## Technology Stack
- **Smart Contracts**: Solidity (^0.8.28), OpenZeppelin v5
- **Tooling**: Hardhat, Ethers.js v6, Chai
- **Frontend (Target)**: React, Ethers.js / Wagmi

---

## Core Entities & Roles

### 1. Admin / Owner
- Create & update saving plans (tenor, APR bps, deposit range, penalty bps).
- Enable / disable saving plans.
- Pause / unpause contract operations during emergencies.
- Fund and withdraw vault liquidity.

### 2. Depositor / User
- Open deposit positions with ERC20 tokens; receives ERC721 NFT certificate (`SCERT`).
- Withdraw principal + interest upon reaching maturity.
- Withdraw early prior to maturity (forfeits interest, incurs penalty).
- Manually renew deposit at/after maturity within grace period (3 days).
- Enable / disable auto-renewal for automatic rollover.

### 3. Interest Vault (`VaultManager`)
- Stores liquidity dedicated for interest payments.
- Disburses interest payments strictly upon authorization from `SavingCore`.
- Receives early withdrawal penalties.

---

## Business Invariants
1. Interest rates use fixed APR set at deposit opening.
2. Subsequent APR updates do not retroactively alter active deposit rates.
3. Penalties are deducted strictly during early withdrawal.
4. Each deposit is represented by 1 ERC721 NFT (`SCERT`) burned upon withdrawal or renewal.
5. Manual renewals require `block.timestamp >= maturityAt`.
6. Auto-renewal pays accrued interest to the deposit owner upon rollover.