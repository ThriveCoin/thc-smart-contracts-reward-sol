// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @author ThriveCoin
 * @title ThriveCoin reward season contract with merkle tree
 *
 * @dev ThriveCoinRewardSeasonMerkle is a simple smart contract that is used to store reward seasons and their
 * respective user rewards via merkle tree proof. It supports these key functionalities:
 * - Managing reward seasons where there is at most one active season, seasons can be added only by ADMIN_ROLE
 * - Claiming rewards
 * - Sending unclaimed rewards to default destination, can be done only by admin
 *
 * NOTE: extends openzeppelin v4.6.0 contracts:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/access/AccessControlEnumerable.sol
 *
 * NOTE: uses openzeppelin v4.6.0 libraries:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/utils/cryptography/MerkleProof.sol
 */
contract ThriveCoinRewardSeasonMerkle is AccessControlEnumerable {
  /**
   * @dev Structure that holds reward season.
   *
   * @property defaultDestination - Address where remaining funds will be sent once claim opportunity is closed
   * @property merkleRoot - Merkle tree root for reward proof
   * @property claimCloseDate - Determines the date until funds are available to claim
   * @property totalRewards - Determines total rewards that will be distributed once season is closed
   * @property claimedRewards - Determines total claimed rewards by end users
   * @property unclaimedFundsSent - Determines flag indicating that unclaimed funds are sent to default destination
   *                                once claim close date passes.
   */
  struct Season {
    address defaultDestination;
    bytes32 merkleRoot;
    uint256 claimCloseDate;
    uint256 totalRewards;
    uint256 claimedRewards;
    bool unclaimedFundsSent;
  }

  /**
   * @dev Storage of seasons in format season_index => season_data
   */
  mapping(uint256 => Season) internal seasons;

  /**
   * @dev Storage of user rewards in format season_index => (owner => claimed)
   */
  mapping(uint256 => mapping(address => bool)) internal rewards;

  /**
   * @dev Active/current season, always incremented only
   */
  uint256 internal seasonIndex = 1;

  /**
   * @dev Stores first season with default destination and close dates, additionally grants `DEFAULT_ADMIN_ROLE` to the
   * account that deploys the contract.
   *
   * @param defaultDestination - Address where remaining funds will be sent once season is closed
   * @param merkleRoot - Merkle tree root for reward proof
   * @param totalRewards - Determines total rewards that will be distributed once season is closed
   * @param claimCloseDate - Determines the date until funds are available to claim
   */
  constructor(address defaultDestination, bytes32 merkleRoot, uint256 totalRewards, uint256 claimCloseDate) {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

    require(
      defaultDestination != address(0),
      "ThriveCoinRewardSeasonMerkle: default destination cannot be zero address"
    );
    require(claimCloseDate > block.timestamp, "ThriveCoinRewardSeasonMerkle: claim close date already reached");
    seasons[seasonIndex] = Season(defaultDestination, merkleRoot, claimCloseDate, totalRewards, 0, false);
  }

  modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ThriveCoinRewardSeasonMerkle: must have admin role");
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
   * @dev Starts a new season with default destination and claim close date, can be called only by admin and it requires
   * the following conditions:
   * - previous season claim close date is reached
   * - unclaimed rewards for previous season are sent to default destination
   * - default destination should not be address zero
   * - claim close date is after current block timestamp
   *
   * @param defaultDestination - Address where remaining funds will be sent once opportunity is closed
   * @param merkleRoot - Merkle tree root for reward proof
   * @param totalRewards - Determines total rewards that will be distributed once season is closed
   * @param claimCloseDate - Determines the date until funds are available to claim
   */
  function addSeason(
    address defaultDestination,
    bytes32 merkleRoot,
    uint256 totalRewards,
    uint256 claimCloseDate
  ) public onlyAdmin {
    Season memory prevSeason = seasons[seasonIndex];
    require(
      block.timestamp > prevSeason.claimCloseDate,
      "ThriveCoinRewardSeasonMerkle: previous season not fully closed"
    );
    require(
      prevSeason.totalRewards - prevSeason.claimedRewards == 0 || prevSeason.unclaimedFundsSent,
      "ThriveCoinRewardSeasonMerkle: unclaimed funds not sent yet"
    );
    require(
      defaultDestination != address(0),
      "ThriveCoinRewardSeasonMerkle: default destination cannot be zero address"
    );
    require(claimCloseDate > block.timestamp, "ThriveCoinRewardSeasonMerkle: claim close date already reached");

    seasonIndex++;
    seasons[seasonIndex] = Season(defaultDestination, merkleRoot, claimCloseDate, totalRewards, 0, false);
  }

  /**
   * @dev Can be called by owner of reward to claim funds. It can be called only before claim close date is reached.
   * Reward can be claimed at most once and only for current season.
   *
   * @param amount - amount that will be claimed by the caller
   * @param merkleProof - merkle proof data that will be validated against merkle tree root hash
   */
  function claimReward(uint256 amount, bytes32[] calldata merkleProof) public virtual {
    Season storage season = seasons[seasonIndex];
    require(block.timestamp <= season.claimCloseDate, "ThriveCoinRewardSeasonMerkle: deadline for claiming reached");

    address caller = _msgSender();
    require(rewards[seasonIndex][caller] == false, "ThriveCoinRewardSeasonMerkle: reward is already claimed");

    bytes32 leaf = keccak256(abi.encodePacked(caller, amount));
    bool isValidProof = MerkleProof.verify(merkleProof, season.merkleRoot, leaf);

    require(isValidProof, "ThriveCoinRewardSeasonMerkle: caller is not allowed to claim the reward");

    rewards[seasonIndex][caller] = true;
    season.claimedRewards += amount;
  }

  /**
   * @dev Used to send unclaimed funds after claim close date to default destination. Can be called only by admins.
   */
  function sendUnclaimedFunds() public virtual onlyAdmin {
    Season storage season = seasons[seasonIndex];
    require(block.timestamp > season.claimCloseDate, "ThriveCoinRewardSeasonMerkle: deadline for claiming not reached");
    require(season.totalRewards - season.claimedRewards > 0, "ThriveCoinRewardSeasonMerkle: no funds available");
    require(season.unclaimedFundsSent == false, "ThriveCoinRewardSeasonMerkle: funds already sent");

    season.unclaimedFundsSent = true;
  }
}
