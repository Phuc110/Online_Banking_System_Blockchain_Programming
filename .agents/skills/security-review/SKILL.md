---
name: security-review
description: Security review checklist and guidelines for Solidity smart contracts, focusing on reentrancy, access control, SafeERC20, and time manipulation.
---
# Security Review Skill

## Security Checklist
- **Access Control**: Verify `onlyOwner`, `onlySavingCore`, and `onlyDepositOwner` checks on privileged functions.
- **Reentrancy**: Ensure `ReentrancyGuard` modifier (`nonReentrant`) on all state-changing token transfers. Follow Check-Effects-Interactions (CEI).
- **Token Handling**: Use OpenZeppelin `SafeERC20` (`safeTransfer`, `safeTransferFrom`) for all ERC20 operations.
- **Time Invariants**: Ensure `renewDeposit` and `withdrawAtMaturity` strictly enforce `block.timestamp >= maturityAt`.
- **Decimal Precision**: Handle 6 decimals (USDC standard) accurately across interest calculations without overflow/underflow.
- **ETH Safety**: Explicitly reject unhandled ETH deposits via `receive() external payable { revert("ETH not accepted"); }`.