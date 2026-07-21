const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockUSDC", function () {
    let owner;
    let alice;
    let bob;

    let usdc;

    beforeEach(async function () {
        [owner, alice, bob] = await ethers.getSigners();

        const MockUSDC = await ethers.getContractFactory("MockUSDC");

        usdc = await MockUSDC.deploy(owner.address);

        await usdc.waitForDeployment();
    });

    it("Should have correct name", async function () {
        expect(await usdc.name()).to.equal("Mock USDC");
    });

    it("Should have correct symbol", async function () {
        expect(await usdc.symbol()).to.equal("mUSDC");
    });

    it("Should have 6 decimals", async function () {
        expect(await usdc.decimals()).to.equal(6);
    });

    it("Owner can mint token", async function () {
        await usdc.mint(alice.address, 1000);

        expect(await usdc.balanceOf(alice.address)).to.equal(1000);
    });

    it("Anyone can mint (Mock Token)", async function () {
        await usdc.connect(alice).mint(alice.address, 5000);

        expect(await usdc.balanceOf(alice.address)).to.equal(5000);
    });

    it("Transfer token", async function () {
        await usdc.mint(owner.address, 10000);

        await usdc.transfer(alice.address, 3000);

        expect(await usdc.balanceOf(alice.address)).to.equal(3000);

        expect(await usdc.balanceOf(owner.address)).to.equal(7000);
    });

    it("Approve allowance", async function () {
        await usdc.mint(owner.address, 10000);

        await usdc.approve(alice.address, 5000);

        expect(
            await usdc.allowance(owner.address, alice.address)
        ).to.equal(5000);
    });

    it("transferFrom should work", async function () {
        await usdc.mint(owner.address, 10000);

        await usdc.approve(alice.address, 4000);

        await usdc
            .connect(alice)
            .transferFrom(owner.address, bob.address, 4000);

        expect(await usdc.balanceOf(bob.address)).to.equal(4000);

        expect(await usdc.balanceOf(owner.address)).to.equal(6000);
    });

    it("Should fail transferFrom without allowance", async function () {
        await usdc.mint(owner.address, 10000);

        await expect(
            usdc
                .connect(alice)
                .transferFrom(owner.address, bob.address, 1000)
        ).to.be.reverted;
    });

    it("Should fail when balance is insufficient", async function () {
        await usdc.mint(owner.address, 1000);

        await expect(
            usdc.transfer(alice.address, 5000)
        ).to.be.reverted;
    });
});