import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("OnlineBankingModule", (m) => {
  const deployer = m.getAccount(0);

  const mockUSDC = m.contract("MockUSDC", [deployer]);

  const vaultManager = m.contract("VaultManager", [
    mockUSDC,
    deployer,
    deployer,
  ]);

  const savingCore = m.contract("SavingCore", [
    mockUSDC,
    vaultManager,
    deployer,
  ]);

  m.call(vaultManager, "setSavingCore", [savingCore]);

  return { mockUSDC, vaultManager, savingCore };
});
