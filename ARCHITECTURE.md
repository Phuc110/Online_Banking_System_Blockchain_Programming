# Architecture & Design

## System Architecture

```
                       +-------------------+
                       |    MockUSDC       |
                       | (ERC20 6 Decimals)|
                       +---------+---------+
                                 |
                 +---------------+---------------+
                 |                               |
                 v                               v
       +------------------+             +------------------+
       |   SavingCore     |<----------->|   VaultManager   |
       | (ERC721 SCERT)   | payInterest | (Interest Vault) |
       +------------------+             +------------------+
                 ^
                 |
             User / NFT Owner
```

---

## Contract Responsibilities

### 1. `SavingCore.sol`
- Inherits `ERC721`, `Ownable`, `Pausable`, `ReentrancyGuard`.
- Handles saving plan administration (`createPlan`, `updatePlan`, `enablePlan`, `disablePlan`).
- Manages user deposits (`openDeposit`, `withdrawAtMaturity`, `earlyWithdraw`, `renewDeposit`, `autoRenewDeposit`).
- Uses `SafeERC20` for token transfer safety.
- Mints and burns NFT tokens to track deposit lifecycle.

### 2. `VaultManager.sol`
- Inherits `Ownable`, `Pausable`.
- Stores ERC20 funds for interest payouts.
- Restricts `payInterest` execution to `savingCore`.
- Supports owner funding (`fundVault`), withdrawal (`withdrawVault`), fee receiver configuration, and emergency token recovery (`rescueToken`).

---

## Security & Architectural Invariants

1. **Access Control**: Only `SavingCore` can trigger interest disbursement from `VaultManager`.
2. **Reentrancy Protection**: All state modifications precede external token interactions in `SavingCore`. `nonReentrant` modifier applied to state-changing endpoints.
3. **Pausability**: Critical administrative functions allow emergency pausing of deposits and withdrawals.
4. **Owner Separation**: `initialOwner` is explicitly set via constructor arguments across all contracts following OpenZeppelin v5 standards.
5. **Strict Time Verification**: Renewals cannot occur prior to deposit maturity.
