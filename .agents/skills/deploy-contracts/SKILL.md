---
name: deploy-contracts
description: Guide and steps for deploying smart contracts (MockUSDC, VaultManager, SavingCore) to Sepolia or Ethereum networks using Hardhat scripts.
---
# Deploy Contracts Skill

## Goal
Deploy all Online Banking smart contracts to Sepolia or target testnets/mainnet and verify them on Etherscan.

## Pre-Deployment Checklist
1. Ensure `.env` contains valid `SEPOLIA_URL`, `SEPOLIA_PRIVATE_KEY`, and `ETHERSCAN_API_KEY`.
2. Compile contracts: `npx hardhat compile`
3. Run full test suite: `npx hardhat test`

## Deployment Sequence
1. Deploy `MockUSDC(initialOwner)`
2. Deploy `VaultManager(tokenAddress, initialOwner, initialFeeReceiver)`
3. Deploy `SavingCore(tokenAddress, vaultAddress, initialOwner)`
4. Set SavingCore in Vault: `vaultManager.setSavingCore(savingCoreAddress)`
5. Fund Vault with initial interest pool: `vaultManager.fundVault(amount)`

## Verification
Verify deployed contracts on Etherscan:
```bash
npx hardhat verify --network sepolia <DEPLOYED_CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```