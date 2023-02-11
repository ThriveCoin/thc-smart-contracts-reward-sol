// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
 * @author vigan.abd
 * @title ThriveCoin reward season contract
 *
 * @dev ThriveCoinRewardSeason is a simple smart contract that is used to store reward seasons and their respective
 * user rewards. It supports these key functionalities:
 * - Managing reward seasons where there is at most one active season, seasons can be added only by ADMIN_ROLE
 * - Adding user rewards to a season, only by WRITER_ROLE
 * - Reading user rewards publicly
 * - Sending user rewards to destination, done by reward owner or reward destinaion
 * - Sending unclaimed rewards to default destination, can be done only by admin
 *
 * NOTE: extends openzeppelin v4.6.0 contracts:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/access/AccessControlEnumerable.sol
 */
contract ThriveCoinRewardSeason is AccessControlEnumerable {
  /**
   * @dev Structure that holds reward season.
   *
   * @property defaultDestination - Address where remaining funds will be sent once opportunity is closed
   * @property closeDate - Determines time when season will be closed, end users can't claim rewards prior to this date
   * @property claimCloseDate - Determines the date until funds are available to claim,
   *                            should be after season close date
   * @property totalRewards - Determines total rewards that will be distributed once season is closed
   * @property claimedRewards - Determines total claimed rewards by end users
   * @property unclaimedFundsSent - Determines flag indicating that unclaimed funds are sent to default destination
   *                                once season is fully closed including also claim close date.
   */
  struct Season {
    address defaultDestination;
    uint256 closeDate;
    uint256 claimCloseDate;
    uint256 totalRewards;
    uint256 claimedRewards;
    bool unclaimedFundsSent;
  }

  /**
   * @dev Structure that represents stored user rewards
   * @property destination - Address where reward will be sent
   * @property amount - Amount that will be rewarded
   * @property claimed - Flag specifying that funds were claimed
   */
  struct UserReward {
    address destination;
    uint256 amount;
    bool claimed;
  }

  /**
   * @dev Structure for adding user reward through external call
   *
   * @property owner - Address that represents owner of the reward,
   *                   funds can be sent to destination either by owner or
   *                   destination address through external call
   * @property destination - Address where reward will be sent
   * @property amount - Amount that will be rewarded
   */
  struct UserRewardRequest {
    address owner;
    address destination;
    uint256 amount;
  }

  bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

  /**
   * @dev Storage of user rewards in format season_index => (owner => reward)
   */
  mapping(uint256 => mapping(address => UserReward)) rewards;

  /**
   * @dev Storage of seasons in format season_index => season_data
   */
  mapping(uint256 => Season) seasons;

  /**
   * @dev Active/current season, always incremented only
   */
  uint256 seasonIndex = 1;

  /**
   * @dev Stores first season with default destination and close dates, additionally grants `DEFAULT_ADMIN_ROLE` and
   * `WRITER_ROLE` to the account that deploys the contract.
   *
   * @param defaultDestination - Address where remaining funds will be sent once opportunity is closed
   * @param closeDate - Determines time when season will be closed, end users can't claim rewards prior to this date
   * @param claimCloseDate - Determines the date until funds are available to claim, should be after season close date
   */
  constructor(address defaultDestination, uint256 closeDate, uint256 claimCloseDate) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(WRITER_ROLE, _msgSender());

    seasons[seasonIndex] = Season(defaultDestination, closeDate, claimCloseDate, 0, 0, false);
  }

  modifier onlyWriter() {
    require(hasRole(WRITER_ROLE, _msgSender()), "ThriveCoinRewardSeason: must have writer role");
    _;
  }

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ThriveCoinRewardSeason: must have admin role");
    _;
  }

  /**
   * @dev Returns active/current season index
   */
  function currentSeason() public view returns (uint256) {
    return seasonIndex;
  }

  /**
   * @dev Returns information for season related to index
   */
  function readSeasonInfo(uint256 index) public view returns (Season memory season) {
    return seasons[index];
  }

  /**
   * @dev Starts a new season with default destination and close dates, can be called only by admin and it requires
   * the following conditions:
   * - previous season claim close date is reached
   * - unclaimed rewards for previous season are sent to default destination
   * - new season close date is before new season claim close date
   *
   * @param defaultDestination - Address where remaining funds will be sent once opportunity is closed
   * @param closeDate - Determines time when season will be closed, end users can't claim rewards prior to this date
   * @param claimCloseDate - Determines the date until funds are available to claim, should be after season close date
   */
  function addSeason(address defaultDestination, uint256 closeDate, uint256 claimCloseDate) external onlyAdmin {
    require(
      block.timestamp > seasons[seasonIndex].claimCloseDate,
      "ThriveCoinRewardSeason: previous season not fully closed"
    );
    require(
      seasons[seasonIndex].totalRewards - seasons[seasonIndex].claimedRewards == 0 ||
        seasons[seasonIndex].unclaimedFundsSent,
      "ThriveCoinRewardSeason: unclaimed funds not sent yet"
    );
    require(closeDate < claimCloseDate, "ThriveCoinRewardSeason: close date should be before claim close date");

    seasonIndex++;
    seasons[seasonIndex] = Season(defaultDestination, closeDate, claimCloseDate, 0, 0, false);
  }

  /**
   * @dev Returns reward information for owner
   *
   * @param season - Season index
   * @param owner - Owner of the reward
   */
  function readReward(uint256 season, address owner) public view returns (UserReward memory reward) {
    return rewards[season][owner];
  }

  /**
   * @dev Adds a new reward entry or overrides old reward entry. It's important to notice that if a previous reward is
   * found for owner the amount won't be added as sum of previous amount and new one, but it will replace the
   * previous one. Rewards cannot be added once season is closed.
   *
   * @param entry - User reward entry that constists of owner, destination and amount.
   */
  function addReward(UserRewardRequest calldata entry) external virtual onlyWriter {
    require(block.timestamp <= seasons[seasonIndex].closeDate, "ThriveCoinRewardSeason: season is closed");

    // possible override of current season reward
    uint256 oldReward = rewards[seasonIndex][entry.owner].amount;

    rewards[seasonIndex][entry.owner].amount = entry.amount;
    rewards[seasonIndex][entry.owner].destination = entry.destination;
    rewards[seasonIndex][entry.owner].claimed = false;

    seasons[seasonIndex].totalRewards = seasons[seasonIndex].totalRewards + entry.amount - oldReward;
  }

  /**
   * @dev Adds/overrides multiple rewards in batch. It's important to notice that if a previous reward for owner is
   * detected amount won't be added as sum of previous amount and new one, but it will replace the previous one.
   * Rewards cannot be added once season is closed.
   *
   * @param entries - Lis of user reward entries that constists of owner, destination and amount.
   */
  function addRewardBatch(UserRewardRequest[] calldata entries) external virtual onlyWriter {
    require(block.timestamp <= seasons[seasonIndex].closeDate, "ThriveCoinRewardSeason: season is closed");

    for (uint256 i = 0; i < entries.length; i++) {
      UserRewardRequest calldata entry = entries[i];

      // possible override of current season reward
      uint256 oldReward = rewards[seasonIndex][entry.owner].amount;

      rewards[seasonIndex][entry.owner].amount = entry.amount;
      rewards[seasonIndex][entry.owner].destination = entry.destination;
      rewards[seasonIndex][entry.owner].claimed = false;

      seasons[seasonIndex].totalRewards = seasons[seasonIndex].totalRewards + entry.amount - oldReward;
    }
  }

  /**
   * @dev Can be called by owner or destination of reward to send funds to destination. It can be called only after
   * close date is reached and before claim close date is reached. Reward can be claimed at most once and only for
   * current season.
   *
   * @param owner - Owner from whom the funds will be claimed
   */
  function claimReward(address owner) external {
    require(block.timestamp > seasons[seasonIndex].closeDate, "ThriveCoinRewardSeason: season is not closed yet");
    require(
      block.timestamp <= seasons[seasonIndex].claimCloseDate,
      "ThriveCoinRewardSeason: deadline for claiming reached"
    );
    require(rewards[seasonIndex][owner].amount > 0, "ThriveCoinRewardSeason: reward not found");
    require(rewards[seasonIndex][owner].claimed == false, "ThriveCoinRewardSeason: reward is already claimed");
    require(
      owner == _msgSender() || rewards[seasonIndex][owner].destination == _msgSender(),
      "ThriveCoinRewardSeason: caller is not allowed to claim the reward"
    );

    rewards[seasonIndex][owner].claimed = true;
    seasons[seasonIndex].claimedRewards += rewards[seasonIndex][owner].amount;
  }

  /**
   * @dev Used to send unclaimed funds after claim close date to default destination. Can be called only by admins.
   */
  function sendUnclaimedFunds() external onlyAdmin {
    require(
      block.timestamp > seasons[seasonIndex].claimCloseDate,
      "ThriveCoinRewardSeason: deadline for claiming not reached"
    );
    require(
      seasons[seasonIndex].totalRewards - seasons[seasonIndex].claimedRewards > 0,
      "ThriveCoinRewardSeason: no funds available"
    );
    require(seasons[seasonIndex].unclaimedFundsSent == false, "ThriveCoinRewardSeason: funds already sent");

    seasons[seasonIndex].unclaimedFundsSent = true;
  }
}
