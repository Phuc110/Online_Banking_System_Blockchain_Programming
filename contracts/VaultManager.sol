// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
contract VaultManager is Ownable, Pausable {
    event VaultFunded(address indexed from, uint256 amount);

    event VaultWithdrawn(address indexed to, uint256 amount);

    event InterestPaid(address indexed to, uint256 amount);

    event FeeReceiverUpdated(address indexed receiver);

    IERC20 public immutable token;

    address public feeReceiver;

    address public savingCore;

    constructor(
        address tokenAddress,
        address initialOwner,
        address initialFeeReceiver
    ) Ownable(initialOwner) {
        require(tokenAddress != address(0), "Invalid token");
        require(initialFeeReceiver != address(0), "Invalid fee receiver");
        require(initialOwner != address(0), "Invalid owner");

        token = IERC20(tokenAddress);
        feeReceiver = initialFeeReceiver;
    }
    modifier onlySavingCore() {
        require(msg.sender == savingCore, "Only SavingCore");
        _;
    }
    function setSavingCore(address _savingCore) external onlyOwner {
        require(_savingCore != address(0), "Invalid address");

        savingCore = _savingCore;
    }
    function fundVault(uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "Invalid amount");

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit VaultFunded(msg.sender, amount);
    }
    function withdrawVault(uint256 amount) external onlyOwner whenNotPaused {
        require(amount > 0, "Invalid amount");

        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit VaultWithdrawn(msg.sender, amount);
    }
    function payInterest(
        address to,
        uint256 amount
    ) external onlySavingCore whenNotPaused {
        require(token.balanceOf(address(this)) >= amount, "Vault insufficient");

        require(token.transfer(to, amount), "Transfer failed");

        emit InterestPaid(to, amount);
    }
    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Invalid address");

        feeReceiver = _receiver;

        emit FeeReceiverUpdated(_receiver);
    }
    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
    receive() external payable {
        revert("ETH not accepted");
    }
    function rescueToken(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(tokenAddress != address(token), "Cannot rescue vault token");

        require(
            IERC20(tokenAddress).transfer(owner(), amount),
            "Transfer failed"
        );
    }
}
