const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("SavingCore", function () {
  let owner;
  let feeReceiver;
  let alice;
  let bob;

  let mockToken;
  let vault;
  let savingCore;

  const TENOR_30_DAYS = 30;
  const APR_5_PERCENT = 500; // 5% = 500 BPS
  const MIN_DEPOSIT = 1000;
  const MAX_DEPOSIT = 100000;
  const PENALTY_10_PERCENT = 1000; // 10% penalty

  beforeEach(async function () {
    [owner, feeReceiver, alice, bob] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockToken = await MockUSDC.deploy(owner.address);
    await mockToken.waitForDeployment();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    vault = await VaultManager.deploy(
      await mockToken.getAddress(),
      owner.address,
      feeReceiver.address
    );
    await vault.waitForDeployment();

    const SavingCore = await ethers.getContractFactory("SavingCore");
    savingCore = await SavingCore.deploy(
      await mockToken.getAddress(),
      await vault.getAddress(),
      owner.address
    );
    await savingCore.waitForDeployment();

    await vault.setSavingCore(await savingCore.getAddress());

    // Fund vault with 1,000,000 tokens for interest payments
    await mockToken.mint(owner.address, 10000000);
    await mockToken.approve(await vault.getAddress(), 10000000);
    await vault.fundVault(10000000);
  });

  describe("Constructor & Initialization", function () {
    it("Should initialize correctly", async function () {
      expect(await savingCore.token()).to.equal(await mockToken.getAddress());
      expect(await savingCore.vault()).to.equal(await vault.getAddress());
      expect(await savingCore.owner()).to.equal(owner.address);
      expect(await savingCore.name()).to.equal("Saving Certificate");
      expect(await savingCore.symbol()).to.equal("SCERT");
    });

    it("Reverts if token address is zero", async function () {
      const SavingCore = await ethers.getContractFactory("SavingCore");
      await expect(
        SavingCore.deploy(
          ethers.ZeroAddress,
          await vault.getAddress(),
          owner.address
        )
      ).to.be.revertedWith("Invalid token");
    });

    it("Reverts if vault address is zero", async function () {
      const SavingCore = await ethers.getContractFactory("SavingCore");
      await expect(
        SavingCore.deploy(
          await mockToken.getAddress(),
          ethers.ZeroAddress,
          owner.address
        )
      ).to.be.revertedWith("Invalid vault");
    });

    it("Reverts if initial owner is zero", async function () {
      const SavingCore = await ethers.getContractFactory("SavingCore");
      await expect(
        SavingCore.deploy(
          await mockToken.getAddress(),
          await vault.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(SavingCore, "OwnableInvalidOwner");
    });
  });

  describe("Plan Management", function () {
    it("Owner can create a saving plan and emit event", async function () {
      await expect(
        savingCore.createPlan(
          TENOR_30_DAYS,
          APR_5_PERCENT,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_10_PERCENT
        )
      )
        .to.emit(savingCore, "PlanCreated")
        .withArgs(0, TENOR_30_DAYS, APR_5_PERCENT);

      const plan = await savingCore.plans(0);
      expect(plan.tenorDays).to.equal(TENOR_30_DAYS);
      expect(plan.aprBps).to.equal(APR_5_PERCENT);
      expect(plan.minDeposit).to.equal(MIN_DEPOSIT);
      expect(plan.maxDeposit).to.equal(MAX_DEPOSIT);
      expect(plan.earlyWithdrawPenaltyBps).to.equal(PENALTY_10_PERCENT);
      expect(plan.enabled).to.equal(true);

      const planFromGetter = await savingCore.getPlan(0);
      expect(planFromGetter.tenorDays).to.equal(TENOR_30_DAYS);
    });

    it("Reverts getPlan for non-existent plan", async function () {
      await expect(savingCore.getPlan(99)).to.be.revertedWith("Plan not found");
    });

    it("Reverts on invalid plan creation parameters", async function () {
      // tenorDays == 0
      await expect(
        savingCore.createPlan(0, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT)
      ).to.be.revertedWith("Invalid tenor");

      // aprBps == 0
      await expect(
        savingCore.createPlan(TENOR_30_DAYS, 0, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT)
      ).to.be.revertedWith("Invalid APR");

      // aprBps > 10000
      await expect(
        savingCore.createPlan(TENOR_30_DAYS, 10001, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT)
      ).to.be.revertedWith("APR too high");

      // penaltyBps > 10000
      await expect(
        savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, 10001)
      ).to.be.revertedWith("Penalty too high");

      // maxDeposit < minDeposit (when maxDeposit > 0)
      await expect(
        savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, 5000, 1000, PENALTY_10_PERCENT)
      ).to.be.revertedWith("Invalid deposit range");
    });

    it("Non-owner cannot create plan", async function () {
      await expect(
        savingCore
          .connect(alice)
          .createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT)
      ).to.be.revertedWithCustomError(savingCore, "OwnableUnauthorizedAccount");
    });

    it("Owner can update plan APR", async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);

      await expect(savingCore.updatePlan(0, 600))
        .to.emit(savingCore, "PlanUpdated")
        .withArgs(0, 600);

      const plan = await savingCore.plans(0);
      expect(plan.aprBps).to.equal(600);
    });

    it("Owner can enable and disable plans", async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);

      await savingCore.disablePlan(0);
      let plan = await savingCore.plans(0);
      expect(plan.enabled).to.equal(false);

      await savingCore.enablePlan(0);
      plan = await savingCore.plans(0);
      expect(plan.enabled).to.equal(true);
    });
  });

  describe("openDeposit", function () {
    beforeEach(async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);
      await mockToken.mint(alice.address, 50000);
      await mockToken.connect(alice).approve(await savingCore.getAddress(), 50000);
    });

    it("Alice can open a deposit", async function () {
      const amount = 10000;
      await expect(savingCore.connect(alice).openDeposit(0, amount))
        .to.emit(savingCore, "DepositOpened");

      expect(await savingCore.ownerOf(0)).to.equal(alice.address);
      const dep = await savingCore.deposits(0);
      expect(dep.principal).to.equal(amount);
      expect(dep.planId).to.equal(0);
      expect(dep.aprBpsAtOpen).to.equal(APR_5_PERCENT);
      expect(dep.status).to.equal(0); // Active

      const depFromGetter = await savingCore.getDeposit(0);
      expect(depFromGetter.principal).to.equal(amount);
    });

    it("Reverts getDeposit for invalid deposit ID", async function () {
      await expect(savingCore.getDeposit(99)).to.be.revertedWith("Deposit not found");
    });

    it("Reverts if amount is below minimum deposit", async function () {
      await expect(savingCore.connect(alice).openDeposit(0, 500)).to.be.revertedWith(
        "Below minimum deposit"
      );
    });

    it("Reverts if amount is above maximum deposit", async function () {
      await mockToken.mint(alice.address, 200000);
      await mockToken.connect(alice).approve(await savingCore.getAddress(), 200000);

      await expect(savingCore.connect(alice).openDeposit(0, 150000)).to.be.revertedWith(
        "Above maximum deposit"
      );
    });

    it("Reverts if plan is disabled", async function () {
      await savingCore.disablePlan(0);
      await expect(savingCore.connect(alice).openDeposit(0, 10000)).to.be.revertedWith(
        "Plan disabled"
      );
    });

    it("Reverts when paused", async function () {
      await savingCore.pause();
      await expect(savingCore.connect(alice).openDeposit(0, 10000)).to.be.revertedWithCustomError(
        savingCore,
        "EnforcedPause"
      );
    });
  });

  describe("withdrawAtMaturity", function () {
    const depositAmount = 10000;

    beforeEach(async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);
      await mockToken.mint(alice.address, depositAmount);
      await mockToken.connect(alice).approve(await savingCore.getAddress(), depositAmount);
      await savingCore.connect(alice).openDeposit(0, depositAmount);
    });

    it("Reverts if called before maturity", async function () {
      await expect(savingCore.connect(alice).withdrawAtMaturity(0)).to.be.revertedWith(
        "Not matured"
      );
    });

    it("Alice can withdraw at maturity and receive interest + principal", async function () {
      // Advance time by 30 days
      await network.provider.send("evm_increaseTime", [TENOR_30_DAYS * 86400]);
      await network.provider.send("evm_mine");

      const expectedInterest = await savingCore.calculateInterest(
        depositAmount,
        APR_5_PERCENT,
        TENOR_30_DAYS
      );

      await expect(savingCore.connect(alice).withdrawAtMaturity(0))
        .to.emit(savingCore, "Withdrawn")
        .withArgs(0, alice.address, depositAmount, expectedInterest, false);

      expect(await mockToken.balanceOf(alice.address)).to.equal(
        depositAmount + Number(expectedInterest)
      );

      // Deposit NFT burned
      await expect(savingCore.ownerOf(0)).to.be.revertedWithCustomError(
        savingCore,
        "ERC721NonexistentToken"
      );
    });

    it("Reverts if non-owner tries to withdraw", async function () {
      await network.provider.send("evm_increaseTime", [TENOR_30_DAYS * 86400]);
      await network.provider.send("evm_mine");

      await expect(savingCore.connect(bob).withdrawAtMaturity(0)).to.be.revertedWith(
        "Not deposit owner"
      );
    });
  });

  describe("earlyWithdraw", function () {
    const depositAmount = 10000;

    beforeEach(async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);
      await mockToken.mint(alice.address, depositAmount);
      await mockToken.connect(alice).approve(await savingCore.getAddress(), depositAmount);
      await savingCore.connect(alice).openDeposit(0, depositAmount);
    });

    it("Alice can withdraw early with penalty", async function () {
      const penalty = (depositAmount * PENALTY_10_PERCENT) / 10000;
      const expectedRefund = depositAmount - penalty;

      await expect(savingCore.connect(alice).earlyWithdraw(0))
        .to.emit(savingCore, "Withdrawn")
        .withArgs(0, alice.address, expectedRefund, 0, true);

      expect(await mockToken.balanceOf(alice.address)).to.equal(expectedRefund);
      expect(await mockToken.balanceOf(feeReceiver.address)).to.equal(penalty);
    });

    it("Reverts if called after maturity", async function () {
      await network.provider.send("evm_increaseTime", [TENOR_30_DAYS * 86400]);
      await network.provider.send("evm_mine");

      await expect(savingCore.connect(alice).earlyWithdraw(0)).to.be.revertedWith(
        "Already matured"
      );
    });

    it("Reverts if non-owner tries to early withdraw", async function () {
      await expect(savingCore.connect(bob).earlyWithdraw(0)).to.be.revertedWith(
        "Not deposit owner"
      );
    });
  });

  describe("renewDeposit (Manual Renewal Security Fix)", function () {
    const depositAmount = 10000;

    beforeEach(async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);
      await mockToken.mint(alice.address, depositAmount);
      await mockToken.connect(alice).approve(await savingCore.getAddress(), depositAmount);
      await savingCore.connect(alice).openDeposit(0, depositAmount);
    });

    it("Reverts if attempting to renew before maturity (SECURITY FIX)", async function () {
      await expect(savingCore.connect(alice).renewDeposit(0)).to.be.revertedWith(
        "Not matured"
      );
    });

    it("Allows renewal after maturity within grace period", async function () {
      // Advance to maturity
      await network.provider.send("evm_increaseTime", [TENOR_30_DAYS * 86400]);
      await network.provider.send("evm_mine");

      await expect(savingCore.connect(alice).renewDeposit(0))
        .to.emit(savingCore, "Renewed");

      // Old NFT burned, new NFT (id 1) minted to Alice
      expect(await savingCore.ownerOf(1)).to.equal(alice.address);
      const newDep = await savingCore.deposits(1);
      expect(newDep.principal).to.equal(depositAmount);
    });

    it("Reverts if grace period has expired", async function () {
      // Advance past maturity + 3-day grace period
      await network.provider.send("evm_increaseTime", [(TENOR_30_DAYS + 4) * 86400]);
      await network.provider.send("evm_mine");

      await expect(savingCore.connect(alice).renewDeposit(0)).to.be.revertedWith(
        "Grace period expired"
      );
    });
  });

  describe("autoRenewDeposit", function () {
    const depositAmount = 10000;

    beforeEach(async function () {
      await savingCore.createPlan(TENOR_30_DAYS, APR_5_PERCENT, MIN_DEPOSIT, MAX_DEPOSIT, PENALTY_10_PERCENT);
      await mockToken.mint(alice.address, depositAmount);
      await mockToken.connect(alice).approve(await savingCore.getAddress(), depositAmount);
      await savingCore.connect(alice).openDeposit(0, depositAmount);
    });

    it("Reverts autoRenew if autoRenew is false", async function () {
      await network.provider.send("evm_increaseTime", [(TENOR_30_DAYS + 4) * 86400]);
      await network.provider.send("evm_mine");

      await expect(savingCore.connect(bob).autoRenewDeposit(0)).to.be.revertedWith(
        "Auto renew disabled"
      );
    });

    it("Anyone can trigger autoRenew after grace period ends, interest sent to owner", async function () {
      await savingCore.connect(alice).enableAutoRenew(0);

      // Advance past grace period (maturity + 3 days)
      await network.provider.send("evm_increaseTime", [(TENOR_30_DAYS + 4) * 86400]);
      await network.provider.send("evm_mine");

      const expectedInterest = await savingCore.calculateInterest(
        depositAmount,
        APR_5_PERCENT,
        TENOR_30_DAYS
      );

      await expect(savingCore.connect(bob).autoRenewDeposit(0))
        .to.emit(savingCore, "Renewed");

      // Alice receives interest payout
      expect(await mockToken.balanceOf(alice.address)).to.equal(expectedInterest);
      // New deposit minted to Alice
      expect(await savingCore.ownerOf(1)).to.equal(alice.address);
    });
  });

  describe("Pause & ETH Rejection", function () {
    it("Owner can pause and unpause contract", async function () {
      await savingCore.pause();
      expect(await savingCore.paused()).to.equal(true);

      await savingCore.unpause();
      expect(await savingCore.paused()).to.equal(false);
    });

    it("Reverts when sending ETH to contract", async function () {
      await expect(
        owner.sendTransaction({
          to: await savingCore.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("ETH not accepted");
    });
  });
});
