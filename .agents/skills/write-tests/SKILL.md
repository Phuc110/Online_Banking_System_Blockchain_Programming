---
name: write-tests
description: Standards and guidelines for writing comprehensive Hardhat unit and integration tests for Solidity smart contracts.
---
# Write Tests Skill

## Required Test Coverage
Every smart contract feature must include:
1. **Happy Path**: Verifying successful state transitions and balance updates.
2. **Revert Tests**: Testing invalid arguments, zero addresses, unauthorized access, and premature timing calls.
3. **Event Tests**: Expecting proper event emissions with accurate arguments.
4. **Access Control**: Ensuring non-owners and unauthorized roles are rejected.
5. **Edge Cases**: Testing boundary conditions (e.g., zero amounts, max limits, grace period boundaries, pausing).

## Execution
Run tests and verify coverage:
```bash
npx hardhat test
```