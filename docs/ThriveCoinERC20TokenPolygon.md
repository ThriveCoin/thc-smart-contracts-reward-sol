# ThriveCoinERC20TokenPolygon - ThriveCoin L2 ERC20 Token (ThriveCoinERC20TokenPolygon.sol)

**View Source:** [contracts/ThriveCoinERC20TokenPolygon.sol](../contracts/ThriveCoinERC20TokenPolygon.sol)

**Extends ↗:** [ERC20Pausable (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/extensions/ERC20Pausable.sol), [Ownable (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/Ownable.sol), [Context (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/utils/Context.sol), [AccessControlEnumerable (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/AccessControlEnumerable.sol)

**Author:** vigan.abd

**Description**: Implementation of the THRIVE ERC20 Token wrapper for Polygon chain.
The key difference from L1 implementation is that Polygon implementation is 
Non Polygon-Mintable. So polygon implementation does not support `mint`
action and total supply by default is 0 since funds are supposed to be
moved later from L1 chain.

Additionally in difference from L1 chain, L2 implementation supports
`deposit`, `withdraw` and `updateChildChainManager` actions based on
recommendation from polygon docs
(https://docs.polygon.technology/docs/develop/ethereum-polygon/pos/mapping-assets#custom-child-token).

The rest of implementation is same as L1 contract!

## Contract Members
- `_decimals<uint8>` - Denomination of token
- `childChainManagerProxy<address>` - Proxy chain manager contract address
- `PAUSER_ROLE<bytes32>` - Pauser role hash

## Contract Methods
- [constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 cap_, address childChainManagerProxy_)](#constructor)
- [pause()](#pause)
- [unpause()](#unpause)
- [decimals()](#decimals)
- [updateCap(uint256 cap_)](#updatecap)
- [blockAccount(address account)](#blockAccount)
- [unblockAccount(address account)](#unblockAccount)
- [transferOwnership(address newOwner)](#transferOwnership)
- [_setupDecimals(uint8 decimals_)](#_setupDecimals)
- [_beforeTokenTransfer(address from, address to, uint256 amount)](#_beforeTokenTransfer)
- [_mint(address account, uint256 amount)](#_mint)
- [_updateCap(uint256 cap_)](#_updateCap)
- [deposit(address user, bytes calldata depositData)][#deposit]
- [withdraw(uint256 amount)](#withdraw)

### constructor
Sets the values for {name}, {symbol}, {decimals}, {cap} and
{childChainManagerProxy_}. `totalSupply` is 0 in this case because minting
in child chain smart contract's constructor not allowed!
```solidity
constructor(string memory name_, string memory symbol_, uint8 decimals_, uint256 cap_, address childChainManagerProxy_)
```

**Arguments**
- `name_<string>` - Name of the token that complies with IERC20 interface
- `symbol_<string>` - Symbol of the token that complies with IERC20 interface
- `decimals_<uint8>` - Denomination of the token that complies with IERC20 interface
- `cap_<uint256>` - Token supply max cap
- `childChainManagerProxy_<address>` - Proxy chain manager contract address

**Returns**
- `void` 

### pause
Pauses all token transfers.   
See {ERC20Pausable} and {Pausable-_pause}.

Requirements:
- the caller must have the `PAUSER_ROLE`.

```solidity
function pause() public virtual
```

**Arguments**
- None

**Returns**
- `void` 

### unpause
Unpauses all token transfers.
See {ERC20Pausable} and {Pausable-_unpause}.

Requirements:   
- the caller must have the `PAUSER_ROLE`.

```solidity
function unpause() public virtual
```

**Arguments**
- None

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
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override(ERC20, ERC20Pausable, ERC20Blockable, ERC20LockedFunds)
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

### deposit
Mints locked funds from RootChain into ChildChain
```solidity
function deposit(address user, bytes calldata depositData) external
```

**Arguments**
- `user<address>` - Accounts where the minted funds will be sent
- `depositData<bytes>` - ABI encoded amount that will be minted

**Returns**
- `void` 

### withdraw
Burns funds from ChildChain and later those funds will be unlocked on RootChain
```solidity
function withdraw(uint256 amount) external
```

**Arguments**
- `amount<uint256>` - Amount that will be burned

**Returns**
- `void` 
