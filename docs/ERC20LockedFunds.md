# ERC20LockedFunds - ERC20 with fund locking capability (ERC20LockedFunds.sol)

**View Source:** [contracts/ERC20LockedFunds.sol](../contracts/ERC20LockedFunds.sol)

**Extends ↗:** [ERC20 (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol)

**Derived Contracts: ↘** [ThriveCoinERC20Token](ThriveCoinERC20Token.md), [ThriveCoinERC20TokenPolygon](ThriveCoinERC20TokenPolygon.md)

**Author:** vigan.abd

**Description**: Extension of {ERC20} that adds ability to lock funds to be 
spent only by specific account.

## Contract Events
- [LockedFunds(address indexed owner, address indexed spender, uint256 amount)](#LockedFunds)
- [UnlockedFunds(address indexed owner, address indexed spender, uint256 amount)](#UnlockedFunds)
- [ClaimedLockedFunds(address indexed owner, address indexed spender, uint256 amount)](#ClaimedLockedFunds)

### LockedFunds
Emitted when funds of `owner` are locked to be spent only by `spender`,
`amount` is the additional locked amount!
```solidity
event LockedFunds(address indexed owner, address indexed spender, uint256 amount)
```

**Arguments**
- `owner<address>`
- `spender<address>`
- `amount<uint256>`

### UnlockedFunds
Emitted when funds of `owner` are unlocked from being spent only by `spender`.
`amount` is the subtracted from total locked amount!
```solidity
event UnlockedFunds(address indexed owner, address indexed spender, uint256 amount)
```

**Arguments**
- `owner<address>`
- `spender<address>`
- `amount<uint256>`

### ClaimedLockedFunds
Emitted when `spender` spends locked funds of `owner`. `amount` is spent amount.
```solidity
event ClaimedLockedFunds(address indexed owner, address indexed spender, uint256 amount)
```

**Arguments**
- `owner<address>`
- `spender<address>`
- `amount<uint256>`

## Contract Members
- `_lockedBalances<mapping(address => uint256)>` - private
- `_lockedAccountBalanceMap<mapping(address => mapping(address => uint256))>` - private

## Contract Methods
- [lockedBalanceOf(address account)](#lockedBalanceOf)
- [lockedBalancePerAccount(address owner, address spender)](#lockedBalancePerAccount)
- [lockAmount(address owner, address spender, uint256 amount)](#lockAmount)
- [lockAmountFrom(address owner, address spender, uint256 amount)](#lockAmountFrom)
- [unlockAmount(address owner, address spender, uint256 amount)](#unlockAmount)
- [_lockAmount(address owner, address spender, uint256 amount)](#_lockAmount)
- [_unlockAmount(address owner, address spender, uint256 amount)](#_unlockAmount)
- [_beforeTokenTransfer(address from, address to, uint256 amount)](#_beforeTokenTransfer)

### lockedBalanceOf
Returns the amount of locked tokens by `account`.
```solidity
function lockedBalanceOf(address account) public view virtual returns (uint256)
```

**Arguments**
- `account<address>` - Account whose locked balance will be checked

**Returns**
- `uint256` 

### lockedBalancePerAccount
Returns the remaining number of locked tokens that `spender` will be allowed
to spend on behalf of `owner`.
```solidity
function lockedBalancePerAccount(address owner, address spender) public view virtual returns (uint256)
```

**Arguments**
- `owner<address>` - Account from where the funds are locked
- `spender<address>` - Account who locked the funds for spending

**Returns**
- `uint256` 

### lockAmount
Locks the `amount` to be sent only to `spender` over the caller's tokens.
This `amount` does not override previous amount, it adds on top of it.
The locking guarantees that owner of funds can send the amount in any time in
future to the spender and cannot send this amount to some other account.
This action is different from approve function which gives allowance to 
spend funds. This one just ensures that funds can't be sent somewhere else
but does not allow the spender to receive them by himself, these funds still
will be sent only by owner!
Emits a {LockedFunds} event.
```solidity
function lockAmount(address owner, address spender, uint256 amount) public virtual
```

**Arguments**
- `owner<address>` - Account from where the funds are locked
- `spender<address>` - Account to whom funds will be locked for sending later
- `amount<uint256>` - The amount that will be locked

**Returns**
- `void` 

### lockAmountFrom
Locks the `amount` to be spent by `spender`.
This `amount` does not override previous amount, it adds on top of it.
This action ensures that allowed spender can fully spend the allowed funds
and that the owner cannot use these funds to send them somewhere else.
Emits a {LockedFunds} event.
```solidity
function lockAmountFrom(address owner, address spender, uint256 amount) public virtual
```

**Arguments**
- `owner<address>` - Account from where the funds are locked
- `spender<address>` - Account who locked the funds for spending
- `amount<uint256>` - The amount that will be locked

**Returns**
- `void` 

### unlockAmount
Unlocks the `amount` from being sent only to `caller` over the `owner` balance.
This `amount` does not override previous locked balance, it reduces it.
Emits a {UnlockedFunds} event.
```solidity
function unlockAmount(address owner, address spender, uint256 amount) public virtual
```

**Arguments**
- `owner<address>` - Account from where the funds are locked
- `spender<address>` - Account to whom funds were locked
- `amount<uint256>` - The amount that will be unlocked

**Returns**
- `void` 

### _lockAmount
Locks the `amount` to sent only to `spender` over the `owner` balance.
This `amount` does not override previous locked balance, it adds on top of it.
Emits a {LockedFunds} event.
```solidity
function _lockAmount(address owner, address spender, uint256 amount) internal virtual
```

**Arguments**
- `owner<address>` - Account from where the funds are locked
- `spender<address>` - Account to whom funds will be locked for sending later
- `amount<uint256>` - The amount that will be locked

**Returns**
- `void` 

### _unlockAmount
Unlocks the `amount` from being sent only to `spender` over the `owner` balance.
This `amount` does not override previous locked balance, it reduces it.
Emits a {UnlockedFunds} event.
```solidity
function _unlockAmount(address owner, address spender, uint256 amount) internal virtual
```

**Arguments**
- `owner<address>` - Account from where the funds are locked
- `spender<address>` - Account to whom funds were locked
- `amount<uint256>` - The amount that will be unlocked

**Returns**
- `void` 

### _beforeTokenTransfer
⤾ overrides [ERC20._beforeTokenTransfer](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol#L330)

See {ERC20-_beforeTokenTransfer}. Overrides _beforeTokenTransfer by
adding checks for locked balances.
```solidity
function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override
```
