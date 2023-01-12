# ERC20Blockable - ERC20 with blocking capability (ERC20Blockable.sol)

**View Source:** [contracts/ERC20Blockable.sol](../contracts/ERC20Blockable.sol)

**Extends ↗:** [ERC20 (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol)

**Derived Contracts: ↘** [ThriveCoinERC20Token](ThriveCoinERC20Token.md), [ThriveCoinERC20TokenPolygon](ThriveCoinERC20TokenPolygon.md)

**Author:** vigan.abd

**Description**: Extension of {ERC20} that adds capability for blocking/unblocking 
accounts. Blocked accounts can't participate in transfers!

## Contract Events
- [AccountBlocked(address indexed account, uint256 timestamp)](#AccountBlocked)
- [AccountUnblocked(address indexed account, uint256 timestamp)](#AccountUnblocked)

### AccountBlocked
```solidity
event AccountBlocked(address indexed account, uint256 timestamp)
```

**Arguments**
- `account<address>`
- `timestamp<uint256>`

### AccountUnblocked
```solidity
event AccountUnblocked(address indexed account, uint256 timestamp)
```

**Arguments**
- `account<address>`
- `timestamp<uint256>`

## Contract Members
- `_blockedAccounts<mapping(address => bool)>` - Mapping that tracks blocked accounts

## Contract Methods
- [isAccountBlocked(address account)](#isAccountBlocked)
- [_blockAccount(address account)](#_blockAccount)
- [_unblockAccount(address account)](#_unblockAccount)
- [_beforeTokenTransfer(address from, address to, uint256 amount)](#_beforeTokenTransfer)

### isAccountBlocked
Returns true if account has been blocked.
```solidity
function isAccountBlocked(address account) public view returns (bool)
```

**Arguments**
- `account<address>` - Account that will be checked

**Returns**
- `bool` 

### _blockAccount
Blocks the account, if account is already blocked action call is reverted
```solidity
function _blockAccount(address account) internal virtual
```

**Arguments**
- `account<address>` - Account that will be blocked

**Returns**
- `void` 

### _unblockAccount
Unblocks the account, if account is not blocked action call is reverted
```solidity
function _unblockAccount(address account) internal virtual
```

**Arguments**
- `account<address>` - Account that will be unblocked

**Returns**
- `void` 

### _beforeTokenTransfer
⤾ overrides [ERC20._beforeTokenTransfer](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol#L330)

Overrides _beforeTokenTransfer by adding checks to reject transaction if 
at least one of source, dest or caller is blocked.
```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override
```

**Arguments**
- `from<address>` - Account from where the funds will be sent
- `to<address>` - Account that will receive funds
- `amount<uint256>` - The amount that will be sent

**Returns**
- `void` 
