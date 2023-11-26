// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ThriveCoinRewardSeasonMerkle.sol";

/**
 * @author ThriveCoin
 * @title ThriveCoin reward season contract with erc20 rewards.
 *
 * @dev ThriveCoinRewardSeasonMerkle is a simple smart contract that is used to store reward seasons and their
 * respective user rewards via merkle tree proof. It supports these key functionalities:
 * - Managing reward seasons where there is at most one active season, seasons can be added only by ADMIN_ROLE
 * - Claiming IERC20 rewards
 * - Reading user rewards publicly
 * - Sending unclaimed IERC20 rewards to default destination, can be done only by admin
 */
contract ThriveCoinRewardSeasonMerkleIERC20 is ThriveCoinRewardSeasonMerkle {
  address tokenAddress;

  /**
   * @dev Stores first season with default destination and close dates, additionally grants `DEFAULT_ADMIN_ROLE` and
   * `WRITER_ROLE` to the account that deploys the contract.
   *
   * @param defaultDestination - Address where remaining funds will be sent once season is closed
   * @param merkleRoot - Merkle tree root for reward proof
   * @param totalRewards - Determines total rewards that will be distributed once season is closed
   * @param claimCloseDate - Determines the date until funds are available to claim
   * @param _tokenAddress - IERC20 token address used for distributing rewards
   */
  constructor(
    address defaultDestination,
    bytes32 merkleRoot,
    uint256 totalRewards,
    uint256 claimCloseDate,
    address _tokenAddress
  ) ThriveCoinRewardSeasonMerkle(defaultDestination, merkleRoot, totalRewards, claimCloseDate) {
    tokenAddress = _tokenAddress;
  }

  /**
   * @dev Returns the erc20 token address
   */
  function getTokenAddress() public view returns (address) {
    return tokenAddress;
  }

  /**
   * @dev Can be called by owner of reward to claim funds. It can be called only before claim close date is reached.
   * Reward can be claimed at most once and only for current season.
   *
   * @param amount - amount that will be claimed by the caller
   * @param merkleProof - merkle proof data that will be validated against merkle tree root hash
   */
  function claimReward(uint256 amount, bytes32[] calldata merkleProof) public override {
    super.claimReward(amount, merkleProof);

    SafeERC20.safeTransfer(IERC20(tokenAddress), _msgSender(), amount);
  }

  /**
   * @dev Used to send unclaimed IERC20 funds after claim close date to default destination. Can be called only by
   * admins.
   */
  function sendUnclaimedFunds() public override onlyAdmin {
    super.sendUnclaimedFunds();

    Season memory season = seasons[seasonIndex];
    SafeERC20.safeTransfer(
      IERC20(tokenAddress),
      season.defaultDestination,
      season.totalRewards - season.claimedRewards
    );
  }

  /**
   * @dev Withdraw remaining ERC20 from smart contract, only admins can do this.
   * This is useful when contract has more funds than needed to fulfill rewards.
   *
   * @param account - Destination of ERC20 funds
   * @param amount - Amount that will be withdrawn
   */
  function withdrawERC20(address account, uint256 amount) public onlyAdmin {
    Season memory season = seasons[seasonIndex];
    require(
      block.timestamp > season.claimCloseDate,
      "ThriveCoinRewardSeasonMerkleIERC20: previous season not fully closed"
    );
    require(
      season.totalRewards - season.claimedRewards == 0 || season.unclaimedFundsSent,
      "ThriveCoinRewardSeasonMerkleIERC20: unclaimed funds not sent yet"
    );

    uint256 contractBalance = IERC20(tokenAddress).balanceOf(address(this));
    require(contractBalance >= amount, "ThriveCoinRewardSeasonMerkleIERC20: not enough funds available");

    SafeERC20.safeTransfer(IERC20(tokenAddress), account, amount);
  }
}
