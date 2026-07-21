# Blockchain Term Deposit & Online Banking System

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.26.3-yellow.svg)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5.6.1-blueviolet.svg)](https://openzeppelin.com/contracts/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-66%20Passing-brightgreen.svg)]()

A decentralized, fixed-term savings certificate system built on Ethereum smart contracts. It enables users to deposit stablecoins (e.g., USDC) into fixed-tenor plans with guaranteed APR interest payouts, represented on-chain as transferrable ERC721 **Saving Certificates**.

---

## Key Features

- **Fixed-Term Savings Plans**: Configurable deposit plans with customizable tenor (days), APR (basis points), deposit limits, and early withdrawal penalties.
- **NFT-Backed Certificates (ERC721)**: Every active deposit mints a unique `SCERT` NFT to the user, establishing verifiable proof of ownership and position parameters.
- **Automated Interest Vault**: A dedicated `VaultManager` contract holds interest liquidity, disbursing payments strictly upon verified maturity or term renewal.
- **Flexible Term Lifecycle**:
  - **Maturity Withdrawal**: Collect full principal + accrued interest upon tenor completion.
  - **Early Withdrawal**: Emergency exit prior to maturity with configurable early withdrawal penalties.
  - **Manual Renewal**: Rollover principal into a new term with instant interest payout within a 3-day grace period.
  - **Automated Auto-Renewal**: Automated rollover after grace period without losing accrued interest.
- **Enterprise-Grade Security**: Integrated OpenZeppelin v5 standards (`SafeERC20`, `ReentrancyGuard`, `Pausable`, `Ownable`).

---

## Architecture Overview

```
                        +-------------------+
                        |     MockUSDC      |
                        | (ERC20 6 Decimals)|
                        +---------+---------+
                                  |
                +-----------------+-----------------+
                |                                   |
                v                                   v
      +------------------+                 +------------------+
      |   SavingCore     |<----------------|   VaultManager   |
      | (ERC721 SCERT)   |   payInterest   | (Interest Vault) |
      +------------------+                 +------------------+
                ^
                |
          User / NFT Owner
```

---

## Smart Contracts Reference

| Contract | File | Description |
| :--- | :--- | :--- |
| **`SavingCore`** | [`contracts/SavingCore.sol`](file:///d:/Desktop/OnlineBankingProject/contracts/SavingCore.sol) | Core contract managing plan creation, deposit minting, withdrawals, penalties, and renewals. |
| **`VaultManager`** | [`contracts/VaultManager.sol`](file:///d:/Desktop/OnlineBankingProject/contracts/VaultManager.sol) | Vault contract holding token liquidity to fund interest payouts to depositors. |
| **`MockUSDC`** | [`contracts/MockUSDC.sol`](file:///d:/Desktop/OnlineBankingProject/contracts/MockUSDC.sol) | Mock ERC20 token with 6 decimal places for local development and testing. |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or `yarn`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Phuc110/Online_Banking_System_Blockchain_Programming.git
   cd Online_Banking_System_Blockchain_Programming
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory:
   ```env
   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
   ```

---

## Testing & Compilation

### Compile Smart Contracts

```bash
npx hardhat compile
```

### Run Unit Tests

Execute the full suite of 66 automated tests covering Happy Path, Edge Cases, Reverts, Events, and Access Control:

```bash
npx hardhat test
```

---

## Project Structure

```
OnlineBankingProject/
├── contracts/
│   ├── MockUSDC.sol          # ERC20 mock token
│   ├── SavingCore.sol        # Term deposit core & ERC721 NFT minting logic
│   └── VaultManager.sol      # Liquidity vault for interest disbursement
├── test/
│   ├── MockUSDC.test.js      # ERC20 token unit tests
│   ├── SavingCore.test.js    # Comprehensive SavingCore logic & security tests
│   └── VaultManager.test.js  # Vault interest payment & access control tests
├── PLAN.md                   # Task tracking & milestone plan
├── CONTEXT.md                # System business logic & entity rules
├── ARCHITECTURE.md           # Technical design & security invariants
├── CHANGELOG.md              # Project modification history
├── hardhat.config.js         # Hardhat network & compiler configuration
└── package.json              # Dependencies & scripts
```

---

## License

This project is licensed under the [MIT License](LICENSE).
