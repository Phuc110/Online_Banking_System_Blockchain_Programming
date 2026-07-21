# Changelog

## [1.0.0] - 2026-07-22

### Security & Bug Fixes
- **Premature Manual Renewal Fix**: Enforced `require(block.timestamp >= oldDep.maturityAt, "Not matured")` in `renewDeposit()` inside `SavingCore.sol`.
- **Auto-Renew Interest Payout**: Added interest calculation and `vault.payInterest(owner, interest)` call to `autoRenewDeposit()` in `SavingCore.sol`.
- **SafeERC20 Migration**: Replaced raw ERC20 `.transfer()` and `.transferFrom()` with `SafeERC20` across `SavingCore.sol` and `VaultManager.sol`.
- **MockUSDC Test Deployment**: Fixed constructor arguments in `test/MockUSDC.test.js`.

### Test Suite & Documentation
- **66 Unit Tests**: Created comprehensive unit tests in `test/VaultManager.test.js` and `test/SavingCore.test.js`.
- **Skills & Rules Refactoring**: Added YAML frontmatter (`name`, `description`) and detailed instructions to all skills in `.agents/skills/`.
- **Governance Documentation**: Synchronized root & `.agents` governance files (`PLAN.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md`).