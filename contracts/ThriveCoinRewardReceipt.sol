// SPDX-License-Identifier: MIT

pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @author vigan.abd
 * @title ThriveCoin reward receipt database
 *
 * @dev ThriveCoinRewardReceipt is a simple smart contract that is used to store
 * reward receipts that are done through thrivecoin platform. Receipts can be
 * stored only by `WRITER_ROLE` and the contract supports role management
 * functionality. Additionally all stored receipts can be enumerated by
 * combining `count` and `getReceipt` functionality.
 *
 * NOTE: extends openzeppelin v4.6.0 contracts:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/access/AccessControlEnumerable.sol
 */
contract ThriveCoinRewardReceipt is AccessControlEnumerable {
  using Counters for Counters.Counter;

  /**
   * @dev Structure that holds relevant information related to reward receipt
   *
   * @property recipient - Reward recipient
   * @property transferTx - Optional reward transaction hash
   * @property version - App version used to distribute the reward
   * @property timestamp - Reward timestamp in UNIX EPOCH seconds
   * @property metaDataURI - Optional URI that points to reward metadata
   */
  struct RewardReceipt {
    address recipient;
    string transferTx;
    string version;
    uint256 timestamp;
    string metaDataURI;
  }

  /**
   * @dev Emitted when a new reward receipt is stored, it includes all params
   * stored in `RewardReceipt` structure and additionally generated `id` that is
   * also indexed.
   */
  event RewardReceiptStored(
    uint256 indexed id,
    address recipient,
    string transferTx,
    string version,
    uint256 timestamp,
    string metaDataURI
  );

  bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

  /**
   * @dev Private id auto increment property
   */
  Counters.Counter private _idTracker;

  /**
   * @dev Reward receipt entries stored in format `id` => `receipt`
   */
  mapping(uint256 => RewardReceipt) _rewardReceipts;

  /**
   * @dev Grants `DEFAULT_ADMIN_ROLE` and `WRITER_ROLE` to the account that
   * deploys the contract.
   */
  constructor() {
    _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setupRole(WRITER_ROLE, _msgSender());
  }

  /**
   * @dev Returns the total number of receipts stored.
   */
  function count() public view returns (uint256) {
    return _idTracker.current();
  }

  /**
   * @dev Stores a new reward receipt and emits `RewardReceiptStored` event that
   * includes indexed receipt id.
   *
   * Requirements:
   * - the caller must have the `WRITER_ROLE`.
   *
   * @param recipient - Reward recipient
   * @param transferTx - Optional reward transaction hash
   * @param version - App version used to distribute the reward
   * @param timestamp - Reward timestamp in UNIX EPOCH seconds
   * @param metaDataURI - Optional URI that points to reward metadata
   */
  function addReceipt(
    address recipient,
    string memory transferTx,
    string memory version,
    uint256 timestamp,
    string memory metaDataURI
  ) public virtual {
    require(hasRole(WRITER_ROLE, _msgSender()), "ThriveCoinRewardReceipt: must have writer role to store receipt");

    _idTracker.increment();
    uint256 id = _idTracker.current();
    _rewardReceipts[id] = RewardReceipt(recipient, transferTx, version, timestamp, metaDataURI);

    emit RewardReceiptStored(id, recipient, transferTx, version, timestamp, metaDataURI);
  }

  /**
   * @dev Returns the receipt details.
   *
   * Requirements:
   * - The id should be greater than 0 and also less than or equal to total
   *   receipt count.
   *
   * @param id - Receipt identifier
   */
  function getReceipt(uint256 id) public view returns (RewardReceipt memory receipt) {
    require(id > 0 && id <= _idTracker.current(), "ThriveCoinRewardReceipt: receipt not found");
    return _rewardReceipts[id];
  }
}
