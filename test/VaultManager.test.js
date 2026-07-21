const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultManager", function () {
  let owner;
  let feeReceiver;
  let savingCore;
  let user;
  let mockToken;
  let mockToken2;
  let vault;

  beforeEach(async function () {
    [owner, feeReceiver, savingCore, user] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockToken = await MockUSDC.deploy(owner.address);
    await mockToken.waitForDeployment();

    mockToken2 = await MockUSDC.deploy(owner.address);
    await mockToken2.waitForDeployment();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    vault = await VaultManager.deploy(
      await mockToken.getAddress(),
      owner.address,
      feeReceiver.address
    );
    await vault.waitForDeployment();

    await vault.setSavingCore(savingCore.address);
  });

  describe("Constructor & Initialization", function () {
    it("Should set correct initial state", async function () {
      expect(await vault.token()).to.equal(await mockToken.getAddress());
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.feeReceiver()).to.equal(feeReceiver.address);
      expect(await vault.savingCore()).to.equal(savingCore.address);
    });

    it("Should revert if token address is zero", async function () {
      const VaultManager = await ethers.getContractFactory("VaultManager");
      await expect(
        VaultManager.deploy(
          ethers.ZeroAddress,
          owner.address,
          feeReceiver.address
        )
      ).to.be.revertedWith("Invalid token");
    });

    it("Should revert if initial owner address is zero", async function () {
      const VaultManager = await ethers.getContractFactory("VaultManager");
      await expect(
        VaultManager.deploy(
          await mockToken.getAddress(),
          ethers.ZeroAddress,
          feeReceiver.address
        )
      ).to.be.revertedWithCustomError(VaultManager, "OwnableInvalidOwner");
    });

    it("Should revert if initial fee receiver is zero", async function () {
      const VaultManager = await ethers.getContractFactory("VaultManager");
      await expect(
        VaultManager.deploy(
          await mockToken.getAddress(),
          owner.address,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Invalid fee receiver");
    });
  });

  describe("setSavingCore", function () {
    it("Owner can set savingCore address", async function () {
      await vault.setSavingCore(user.address);
      expect(await vault.savingCore()).to.equal(user.address);
    });

    it("Reverts if non-owner calls setSavingCore", async function () {
      await expect(
        vault.connect(user).setSavingCore(user.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Reverts if savingCore address is zero", async function () {
      await expect(vault.setSavingCore(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid address"
      );
    });
  });

  describe("setFeeReceiver", function () {
    it("Owner can set fee receiver and emit event", async function () {
      await expect(vault.setFeeReceiver(user.address))
        .to.emit(vault, "FeeReceiverUpdated")
        .withArgs(user.address);

      expect(await vault.feeReceiver()).to.equal(user.address);
    });

    it("Reverts if non-owner calls setFeeReceiver", async function () {
      await expect(
        vault.connect(user).setFeeReceiver(user.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Reverts if fee receiver address is zero", async function () {
      await expect(vault.setFeeReceiver(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid address"
      );
    });
  });

  describe("fundVault", function () {
    it("Owner can fund vault", async function () {
      const amount = 1000000;
      await mockToken.mint(owner.address, amount);
      await mockToken.approve(await vault.getAddress(), amount);

      await expect(vault.fundVault(amount))
        .to.emit(vault, "VaultFunded")
        .withArgs(owner.address, amount);

      expect(await vault.vaultBalance()).to.equal(amount);
    });

    it("Reverts if amount is 0", async function () {
      await expect(vault.fundVault(0)).to.be.revertedWith("Invalid amount");
    });

    it("Reverts if non-owner calls fundVault", async function () {
      await expect(
        vault.connect(user).fundVault(1000)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Reverts when paused", async function () {
      await vault.pause();
      await expect(vault.fundVault(1000)).to.be.revertedWithCustomError(
        vault,
        "EnforcedPause"
      );
    });
  });

  describe("withdrawVault", function () {
    beforeEach(async function () {
      const amount = 1000000;
      await mockToken.mint(owner.address, amount);
      await mockToken.approve(await vault.getAddress(), amount);
      await vault.fundVault(amount);
    });

    it("Owner can withdraw vault funds", async function () {
      const withdrawAmount = 400000;
      await expect(vault.withdrawVault(withdrawAmount))
        .to.emit(vault, "VaultWithdrawn")
        .withArgs(owner.address, withdrawAmount);

      expect(await vault.vaultBalance()).to.equal(600000);
    });

    it("Reverts if withdraw amount is 0", async function () {
      await expect(vault.withdrawVault(0)).to.be.revertedWith("Invalid amount");
    });

    it("Reverts if withdraw amount exceeds balance", async function () {
      await expect(vault.withdrawVault(2000000)).to.be.revertedWith(
        "Insufficient balance"
      );
    });

    it("Reverts if non-owner calls withdrawVault", async function () {
      await expect(
        vault.connect(user).withdrawVault(1000)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Reverts when paused", async function () {
      await vault.pause();
      await expect(vault.withdrawVault(1000)).to.be.revertedWithCustomError(
        vault,
        "EnforcedPause"
      );
    });
  });

  describe("payInterest", function () {
    beforeEach(async function () {
      const amount = 1000000;
      await mockToken.mint(owner.address, amount);
      await mockToken.approve(await vault.getAddress(), amount);
      await vault.fundVault(amount);
    });

    it("SavingCore can trigger payInterest", async function () {
      const interestAmount = 50000;
      await expect(
        vault.connect(savingCore).payInterest(user.address, interestAmount)
      )
        .to.emit(vault, "InterestPaid")
        .withArgs(user.address, interestAmount);

      expect(await mockToken.balanceOf(user.address)).to.equal(interestAmount);
      expect(await vault.vaultBalance()).to.equal(950000);
    });

    it("Reverts if non-savingCore calls payInterest", async function () {
      await expect(
        vault.connect(user).payInterest(user.address, 50000)
      ).to.be.revertedWith("Only SavingCore");
    });

    it("Reverts if vault has insufficient balance", async function () {
      await expect(
        vault.connect(savingCore).payInterest(user.address, 2000000)
      ).to.be.revertedWith("Vault insufficient");
    });

    it("Reverts when paused", async function () {
      await vault.pause();
      await expect(
        vault.connect(savingCore).payInterest(user.address, 50000)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });
  });

  describe("Pause & Unpause", function () {
    it("Owner can pause and unpause", async function () {
      await vault.pause();
      expect(await vault.paused()).to.equal(true);

      await vault.unpause();
      expect(await vault.paused()).to.equal(false);
    });

    it("Reverts if non-owner calls pause/unpause", async function () {
      await expect(vault.connect(user).pause()).to.be.revertedWithCustomError(
        vault,
        "OwnableUnauthorizedAccount"
      );

      await expect(
        vault.connect(user).unpause()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("rescueToken", function () {
    it("Owner can rescue non-vault tokens", async function () {
      const amount = 500;
      await mockToken2.mint(await vault.getAddress(), amount);

      await vault.rescueToken(await mockToken2.getAddress(), amount);

      expect(await mockToken2.balanceOf(owner.address)).to.equal(amount);
    });

    it("Reverts if trying to rescue vault token", async function () {
      await expect(
        vault.rescueToken(await mockToken.getAddress(), 100)
      ).to.be.revertedWith("Cannot rescue vault token");
    });

    it("Reverts if non-owner calls rescueToken", async function () {
      await expect(
        vault.connect(user).rescueToken(await mockToken2.getAddress(), 100)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Receive ETH", function () {
    it("Reverts when sending ETH to contract", async function () {
      await expect(
        owner.sendTransaction({
          to: await vault.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("ETH not accepted");
    });
  });
});
