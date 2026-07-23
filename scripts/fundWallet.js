const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  // Target: user's MetaMask wallet address
  const target = "0xefd241e038e69d5288f8896188355673aebe3698";
  const amount = ethers.parseEther("10");

  console.log(`Funding ${target} with 10 ETH from deployer ${deployer.address}...`);
  const tx = await deployer.sendTransaction({ to: target, value: amount });
  await tx.wait();
  console.log(`✔ Sent 10 ETH to ${target}`);
  console.log(`  Tx hash: ${tx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
