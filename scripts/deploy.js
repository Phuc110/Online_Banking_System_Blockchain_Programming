const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("----------------------------------------------------");
  console.log("Deploying Online Banking Contracts...");
  console.log("Deployer address:", deployer.address);
  console.log("----------------------------------------------------");

  // 1. Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy(deployer.address);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✔ MockUSDC deployed to:", usdcAddress);

  // 2. Deploy VaultManager
  const VaultManager = await ethers.getContractFactory("VaultManager");
  const vault = await VaultManager.deploy(usdcAddress, deployer.address, deployer.address);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✔ VaultManager deployed to:", vaultAddress);

  // 3. Deploy SavingCore
  const SavingCore = await ethers.getContractFactory("SavingCore");
  const savingCore = await SavingCore.deploy(usdcAddress, vaultAddress, deployer.address);
  await savingCore.waitForDeployment();
  const savingCoreAddress = await savingCore.getAddress();
  console.log("✔ SavingCore deployed to:", savingCoreAddress);

  // 4. Set savingCore address in VaultManager
  const setTx = await vault.setSavingCore(savingCoreAddress);
  await setTx.wait();
  console.log("✔ VaultManager linked with SavingCore");

  // 5. Create Initial Saving Plan (30 days, 5% APR, Min 100 USDC, Max 100,000 USDC, 10% penalty)
  const planTx = await savingCore.createPlan(
    30,
    500,
    ethers.parseUnits("100", 6),
    ethers.parseUnits("100000", 6),
    1000
  );
  await planTx.wait();
  console.log("✔ Initial Saving Plan created (ID: 0)");

  console.log("----------------------------------------------------");
  console.log("Deployment Complete!");
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
