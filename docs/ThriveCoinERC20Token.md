# ThriveCoinERC20Token - ThriveCoin L1 ERC20 Token (ThriveCoinERC20Token.sol)

**View Source:** [contracts/ThriveCoinERC20Token.sol](../contracts/ThriveCoinERC20Token.sol)

**Extends ↗:** [ERC20PresetMinterPauser (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol), [Ownable (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/Ownable.sol)

**Author:** vigan.abd

**Description**: Implementation of the THRIVE ERC20 Token.

THRIVE is a dynamic supply cross chain ERC20 token that supports burning and
minting. The token is capped where `cap` is dynamic, but can only be
decreased after the initial value. The decrease of `cap` happens when
additional blockchains are added. The idea is to divide every blockchain
to keep nearly equal `cap`, so e.g. when a new blockchain is supported
all existing blockchains decrease their `cap`.

Token cross chain swapping is supported through minting and burning
where a separate smart contract also owned by THC owner will operate on each
chain and will handle requests. The steps of swapping are:
- `address` calls approve(`swap_contract_chain_1`, `swap_amount`)
- `swap_contract_chain_1` calls burnFrom(`address`, `swap_amount`)
- `swap_contract_chain_2` calls mint(`address`, `swap_amount`)
NOTE: If an address beside `swap_contract_chain_1` calls burn action
the funds will be lost forever and are not recoverable, this will cause to
decrease total supply additionally!

Another key feature of THRIVE is ability to lock funds to be send only to
specific accounts. This is achieved through `lockAmount` and `unlockAmount`
actions, where the first one is called by balance owner and second by receiver.

Key features:
- burn
- mint
- capped, dynamic decreasing only
- pausable
- blocking/unblocking accounts
- role management
- locking/unlocking funds

## Contract Members
- `_decimals<uint8>` - Denominaton of token

## Contract Methods
- [constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 totalSupply_, uint256 cap_)](#constructor)
- [decimals()](#decimals)
- [updateCap(uint256 cap_)](#updateCap)
- [blockAccount(address account)](#blockAccount)
- [unblockAccount(address account)](#unblockAccount)
- [transferOwnership(address newOwner)](#transferOwnership)
- [_setupDecimals(uint8 decimals_)](#_setupDecimals)
- [_beforeTokenTransfer(address from, address to, uint256 amount)](#_beforeTokenTransfer)
- [_mint(address account, uint256 amount)](#_mint)
- [_updateCap(uint256 cap_)](#_updateCap)

### constructor
Sets the values for {name}, {symbol}, {decimals}, {totalSupply} and {cap}.
All of these values beside {cap} are immutable: they can only be set
once during construction. {cap} param is only decreasable and is expected
to decrease when additional blockchains are added.
```solidity
constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 totalSupply_, uint256 cap_)
```

**Arguments**
- `name_<string>` - Name of the token that complies with IERC20 interface
- `symbol_<string>` - Symbol of the token that complies with IERC20 interface
- `decimals_<uint8>` - Denomination of the token that complies with IERC20 interface
- `totalSupply_<uint256>` - Total supply of the token that complies with IERC20 interface
- `cap_<uint256>` - Token supply max cap

**Returns**
- `void` 

### decimals
⤾ overrides [ERC20.decimals](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol#L86)

Returns the number of decimals used to get its user representation.
For example, if `decimals` equals `2`, a balance of `505` tokens should
be displayed to a user as `5.05` (`505 / 10 ** 2`).

NOTE: This information is only used for _display_ purposes: it in
no way affects any of the arithmetic of the contract, including
{IERC20-balanceOf} and {IERC20-transfer}.

```solidity
function decimals() public view virtual override returns (uint8)
```
**Arguments**
- None

**Returns**
- `uint8` 

### updateCap
⤾ overrides [ERC20DynamicCap.updateCap](./ERC20DynamicCap.md#updatecap)

See {ERC20DynamicCap-updateCap}. Adds only owner restriction to updateCap action.
```solidity
function updateCap(uint256 cap_) public virtual override onlyOwner
```

**Arguments**
- `cap_<uint256>` - New cap, should be lower or equal to previous cap

**Returns**
- `void` 

### blockAccount
See {ERC20Blockable-_blockAccount}. Adds admin only restriction to blockAccount
action.
```solidity
function blockAccount(address account) public virtual
```

**Arguments**
- `account<address>` - Account that will be blocked

**Returns**
- `void` 

### unblockAccount
See {ERC20Blockable-_unblockAccount}. Adds admin only restriction to
unblockAccount action
```solidity
function unblockAccount(address account) public virtual
```

**Arguments**
- `account<address>` - Account that will be unblocked

**Returns**
- `void` 

### transferOwnership
⤾ overrides [Ownable.transferOwnership](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/Ownable.sol#L61)

See {Ownable-transferOwnership}. Overrides action by adding also all roles
to new owner
```solidity
function transferOwnership(address newOwner) public virtual override onlyOwner
```

**Arguments**
- `newOwner<address>` - The new owner of smart contract

**Returns**
- `void` 

### _setupDecimals
Sets the value of `_decimals` field
```solidity
function _setupDecimals(uint8 decimals_) internal virtual
```

**Arguments**
- `decimals_<uint8>` - Denomination of the token that complies with IERC20 interface

**Returns**
- `void` 

### _beforeTokenTransfer
⤾ overrides [ERC20._beforeTokenTransfer](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol#L330)

See {ERC20-_beforeTokenTransfer}. Adjust order of calls for extended
 parent contracts.
```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override(ERC20, ERC20PresetMinterPauser, ERC20Blockable, ERC20LockedFunds)
```

**Arguments**
- `from<address>` - Account from where the funds will be sent
- `to<address>` - Account that will receive funds
- `amount<uint256>` - The amount that will be sent

**Returns**
- `void` 

### _mint
⤾ overrides [ERC20._mint](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol#L251)

See {ERC20DynamicCap-_mint}. Adjust order of calls for extended parent contracts.
```solidity
function _mint(address account, uint256 amount) internal virtual override(ERC20, ERC20DynamicCap)
```

**Arguments**
- `account<address>` - Accounts where the minted funds will be sent
- `amount<uint256>` - Amount that will be minted

**Returns**
- `void` 

### _updateCap
⤾ overrides [ERC20DynamicCap._updateCap](./ERC20DynamicCap.md#updatecap-1)

See {ERC20DynamicCap-_updateCap}. Adds check for paused state to _updateCap
method.
```solidity
function _updateCap(uint256 cap_) internal virtual override
```

**Arguments**
- `cap_<uint256>` - New cap, should be lower or equal to previous cap

**Returns**
- `void` 
