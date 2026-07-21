---
name: frontend
description: Instructions and guidelines for building the frontend web interface using React, Ethers.js v6, and CSS.
---
# Frontend Skill

## Tech Stack
- **Framework**: React / Vite / Next.js
- **Blockchain Interaction**: Ethers.js v6 / Wagmi / Viem
- **Styling**: Vanilla CSS or Tailwind CSS

## Core User Workflows
1. **Home / Dashboard**: Display active user deposit certificates, total deposited principal, total earned interest, and savings stats.
2. **Deposit / Saving Plans**: List active saving plans with tenor & APR; allow users to approve token & open new deposits.
3. **Withdraw & Renewal**: Enable depositors to execute maturity withdrawal, early withdrawal, manual renewal, or toggle auto-renewal.
4. **Admin Panel**: Allow contract owner to create new saving plans, update APRs, enable/disable plans, and pause contracts.