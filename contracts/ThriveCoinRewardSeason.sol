// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @author vigan.abd
 * @title ThriveCoin reward season contract
 *
 * NOTE: extends openzeppelin v4.6.0 contracts:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/access/AccessControlEnumerable.sol
 */
contract ThriveCoinRewardSeason is AccessControlEnumerable {
  struct Season {
    address defaultDestination;
    uint256 closeDate;
    uint256 claimCloseDate;
    uint256 totalRewards;
    uint256 claimedRewards;
    bool unclaimedFundsSent;
  }

  struct UserReward {
    address destination;
    uint256 amount;
    bool claimed;
    uint256 season;
  }

  struct UserRewardRequest {
    address owner;
    address destination;
    uint256 amount;
  }

  bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

  mapping(address => UserReward) rewards;
  mapping(uint256 => Season) seasons;
  uint256 seasonIndex = 1;

  /**
   * @dev Grants `DEFAULT_ADMIN_ROLE` and `WRITER_ROLE` to the account that
   * deploys the contract.
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

  function addReward(UserRewardRequest calldata entry) external virtual onlyWriter {
    // possible override of current season reward
    uint256 oldReward = rewards[entry.owner].season == seasonIndex ? rewards[entry.owner].amount : 0;

    rewards[entry.owner].amount = entry.amount;
    rewards[entry.owner].destination = entry.destination;
    rewards[entry.owner].claimed = false;
    rewards[entry.owner].season = seasonIndex;

    seasons[seasonIndex].totalRewards = seasons[seasonIndex].totalRewards + entry.amount - oldReward;
  }

  function addRewardBatch(UserRewardRequest[] calldata entries) external virtual onlyWriter {
    for (uint256 i = 0; i < entries.length; i++) {
      UserRewardRequest calldata entry = entries[i];

      // possible override of current season reward
      uint256 oldReward = rewards[entry.owner].season == seasonIndex ? rewards[entry.owner].amount : 0;

      rewards[entry.owner].amount = entry.amount;
      rewards[entry.owner].destination = entry.destination;
      rewards[entry.owner].claimed = false;
      rewards[entry.owner].season = seasonIndex;

      seasons[seasonIndex].totalRewards = seasons[seasonIndex].totalRewards + entry.amount - oldReward;
    }
  }

  function readReward(address owner) public view returns (UserReward memory reward) {
    return rewards[owner];
  }

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

    seasonIndex++;
    seasons[seasonIndex] = Season(defaultDestination, closeDate, claimCloseDate, 0, 0, false);
  }

  function currentSeason() public view returns (uint256) {
    return seasonIndex;
  }

  function readSeasonInfo(uint256 index) public view returns (Season memory season) {
    return seasons[index];
  }

  function claimReward(address owner) external {
    require(block.timestamp <= seasons[seasonIndex].closeDate, "ThriveCoinRewardSeason: season is not closed yet");
    require(
      block.timestamp <= seasons[seasonIndex].claimCloseDate,
      "ThriveCoinRewardSeason: deadline for claiming reached"
    );
    require(rewards[owner].claimed == false, "ThriveCoinRewardSeason: reward is already claimed");
    require(rewards[owner].season == seasonIndex, "ThriveCoinRewardSeason: cannot read reward from other seasons");
    require(
      owner == _msgSender() || rewards[owner].destination == _msgSender(),
      "ThriveCoinRewardSeason: caller is not allowed to claim the reward"
    );

    rewards[owner].claimed = true;
    seasons[seasonIndex].claimedRewards += rewards[owner].amount;
  }

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
