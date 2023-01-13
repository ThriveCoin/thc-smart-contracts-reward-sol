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
  uint256 totalRewards = 0;
  uint256 totalClaimedRewards = 0;
  uint256 seasonCloseDate = 0;
  uint256 season = 1;

  /**
   * @dev Grants `DEFAULT_ADMIN_ROLE` and `WRITER_ROLE` to the account that
   * deploys the contract.
   */
  constructor(uint256 _seasonCloseDate) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(WRITER_ROLE, _msgSender());

    seasonCloseDate = _seasonCloseDate;
  }

  modifier onlyWriter() {
    require(hasRole(WRITER_ROLE, _msgSender()), "ThriveCoinRewardSeason: must have writer role");
    _;
  }

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ThriveCoinRewardSeason: must have admin role");
    _;
  }

  function addReward(UserRewardRequest calldata _reward) external virtual onlyWriter {
    // possible override of current season reward
    uint256 oldReward = rewards[_reward.owner].season == season ? rewards[_reward.owner].amount : 0;

    rewards[_reward.owner].amount = _reward.amount;
    rewards[_reward.owner].destination = _reward.destination;
    rewards[_reward.owner].claimed = false;
    rewards[_reward.owner].season = season;
    totalRewards = totalRewards + _reward.amount - oldReward;
  }

  function addRewardBatch(UserRewardRequest[] calldata _rewards) external virtual onlyWriter {
    for (uint256 i = 0; i < _rewards.length; i++) {
      UserRewardRequest calldata _reward = _rewards[i];
      // possible override of current season reward
      uint256 oldReward = rewards[_reward.owner].season == season ? rewards[_reward.owner].amount : 0;

      rewards[_reward.owner].amount = _reward.amount;
      rewards[_reward.owner].destination = _reward.destination;
      rewards[_reward.owner].claimed = false;
      rewards[_reward.owner].season = season;
      totalRewards = totalRewards + _reward.amount - oldReward;
    }
  }

  function readReward(address owner) public view returns (UserReward memory reward) {
    return rewards[owner];
  }

  function getTotalReward() public view returns (uint256) {
    return totalRewards;
  }

  function resetSeason(uint256 _seasonCloseDate) external onlyAdmin {
    totalRewards = 0;
    totalClaimedRewards = 0;
    seasonCloseDate = _seasonCloseDate;
    season++;
  }

  function claimReward(address from) external {
    UserReward memory _reward = rewards[from];
    require(_reward.claimed == false);
    require(_reward.season == season); // safety check for non existent season and avoid double spend in case of failed to claim reward
    require(_reward.destination == from || _reward.destination == _msgSender()); // make sure that caller is either owner or destination
    // TODO: send erc20

    totalClaimedRewards += _reward.amount;
    _reward.claimed = true;
  }
}
