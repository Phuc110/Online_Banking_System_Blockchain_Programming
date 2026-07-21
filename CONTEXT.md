# Context & Business Logic

## Overview
`OnlineBankingProject` is a decentralized fixed-term savings system built on Ethereum smart contracts. Users deposit ERC20 stablecoins (e.g. USDC) into fixed-term savings plans and receive an ERC721 NFT ("Saving Certificate") representing their deposit position. Upon maturity, users can withdraw their principal along with guaranteed interest paid out from a dedicated `VaultManager`.

---

## Core Entities & Roles

### 1. Saving Certificate (`SavingCore`)
- **ERC721 NFT**: Minted when a deposit is opened, representing ownership of the deposit.
- **Saving Plans**: Created by the contract owner defining tenor (in days), APR (in BPS), minimum/maximum deposit amounts, and early withdrawal penalty (in BPS).
- **Deposits**: Contains principal, start timestamp, maturity timestamp, APR at opening, early withdrawal penalty BPS at opening, auto-renew setting, and status (`Active`, `Withdrawn`, `ManualRenewed`, `AutoRenewed`).

### 2. Interest Vault (`VaultManager`)
- Stores funds designated specifically for interest payouts.
- Only the `SavingCore` contract is authorized to call `payInterest()` to disburse interest to deposit owners upon maturity or renewal.
- Maintained and funded by the contract owner.

### 3. Mock USDC (`MockUSDC`)
- ERC20 token mock with 6 decimal places used for local testing and simulation.

---

## Business Rules & Logic

1. **Opening a Deposit**:
   - Requires plan to be enabled.
   - Deposit amount must satisfy `minDeposit` and `maxDeposit` thresholds.
   - Mints an ERC721 NFT to `msg.sender`.

2. **Maturity Withdrawal**:
   - Can only be called on or after `maturityAt`.
   - Interest is calculated via `(principal * aprBps * tenorSeconds) / (365 days * 10000)`.
   - `VaultManager` pays accrued interest to the user.
   - `SavingCore` transfers principal back to the user and burns the deposit NFT.

3. **Early Withdrawal**:
   - Called prior to `maturityAt`.
   - Penalty is calculated and transferred to `VaultManager.feeReceiver()`.
   - Remaining principal (`principal - penalty`) is refunded to the user. Interest is forfeited. Deposit NFT is burned.

4. **Manual Renewal**:
   - Requires deposit to have reached maturity (`block.timestamp >= maturityAt`).
   - Must be called within `GRACE_PERIOD` (3 days post-maturity).
   - Accrued interest is paid out from `VaultManager`.
   - Old deposit NFT is burned, and a new deposit NFT with renewed tenor is minted.

5. **Auto Renewal**:
   - If `autoRenew` is enabled, anyone can trigger `autoRenewDeposit` after `maturityAt + GRACE_PERIOD`.
   - Accrued interest from the completed term is transferred to the deposit owner.
   - Old deposit NFT is burned, and a new deposit NFT with renewed tenor is minted to the owner.
