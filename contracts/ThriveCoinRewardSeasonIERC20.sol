// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ThriveCoinRewardSeason.sol";

/**
 * @author vigan.abd
 * @title ThriveCoin reward season contract with erc20 rewards.
 *
 * @dev ThriveCoinRewardSeasonIERC20 is a simple smart contract that is used to store reward seasons and
 * their respective IERC20 user rewards. It supports these key functionalities:
 * - Managing reward seasons where there is at most one active season, seasons can be added only by ADMIN_ROLE
 * - Adding user rewards to a season, only by WRITER_ROLE
 * - Reading user rewards publicly
 * - Sending IERC20 user rewards to destination, done by reward owner or reward destinaion
 * - Sending unclaimed IERC20 rewards to default destination, can be done only by admin
 */
contract ThriveCoinRewardSeasonIERC20 is ThriveCoinRewardSeason {
  address tokenAddress;

  /**
   * @dev Stores first season with default destination and close dates, additionally grants `DEFAULT_ADMIN_ROLE` and
   * `WRITER_ROLE` to the account that deploys the contract.
   *
   * @param defaultDestination - Address where remaining funds will be sent once opportunity is closed
   * @param closeDate - Determines time when season will be closed, end users can't claim rewards prior to this date
   * @param claimCloseDate - Determines the date until funds are available to claim, should be after season close date
   * @param _tokenAddress - IERC20 token address used for distributing rewards
   */
  constructor(
    address defaultDestination,
    uint256 closeDate,
    uint256 claimCloseDate,
    address _tokenAddress
  ) ThriveCoinRewardSeason(defaultDestination, closeDate, claimCloseDate) {
    tokenAddress = _tokenAddress;
  }

  /**
   * @dev Can be called by owner or destination of reward to send IERC20 funds to destination. It can be called only
   * after close date is reached and before claim close date is reached. Reward can be claimed at most once and only for
   * current season.
   *
   * @param owner - Owner from whom the funds will be claimed
   */
  function claimReward(address owner) public override {
    super.claimReward(owner);

    UserReward memory reward = rewards[seasonIndex][owner];
    SafeERC20.safeTransfer(IERC20(tokenAddress), reward.destination, reward.amount);
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
    require(block.timestamp > season.claimCloseDate, "ThriveCoinRewardSeason: previous season not fully closed");
    require(
      season.totalRewards - season.claimedRewards == 0 || season.unclaimedFundsSent,
      "ThriveCoinRewardSeason: unclaimed funds not sent yet"
    );

    uint256 contractBalance = IERC20(tokenAddress).balanceOf(address(this));
    require(contractBalance >= amount, "ThriveCoinRewardSeason: not enough funds available");

    SafeERC20.safeTransfer(IERC20(tokenAddress), account, amount);
  }
}
