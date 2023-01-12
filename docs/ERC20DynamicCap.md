# ERC20DynamicCap - ERC20 with adjustable cap (ERC20DynamicCap.sol)

**View Source:** [contracts/ERC20DynamicCap.sol](../contracts/ERC20DynamicCap.sol)

**Extends ↗:** [ERC20 (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol)

**Derived Contracts: ↘** [ThriveCoinERC20Token](ThriveCoinERC20Token.md), [ThriveCoinERC20TokenPolygon](ThriveCoinERC20TokenPolygon.md)

**Author:** vigan.abd

**Description**: Extension of {ERC20} that adds a cap to the supply of tokens.
The cap is dynamic still but can only be decreased further!

## Contract Events
- [CapUpdated(address indexed from, uint256 prevCap, uint256 newCap)](#CapUpdated)

### CapUpdated
Emitted when cap is updated/decreased
```solidity
event CapUpdated(address indexed from, uint256 prevCap, uint256 newCap)
```

**Arguments**
- `from<address>` - Account that updated cap
- `prevCap<uint256>` - Previous cap
- `newCap<uint256>` - New cap

## Contract Members
- `_cap<uint256>` - Cap on the token's total supply (max total supply)

## Contract Methods
- [constructor(uint256 cap_)](#constructor)
- [cap()](#cap)
- [_updateCap(uint256 cap_)](#_updateCap)
- [_mint(address account, uint256 amount)](#_mint)

### constructor
Sets the value of the `cap`. This value later can only be decreased.
```solidity
constructor(uint256 cap_)
```

**Arguments**
- `cap_<uint256>` - Initial cap (max total supply)

**Returns**
- `void` 

### cap
Returns the cap on the token's total supply (max total supply).
```solidity
function cap() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### _updateCap
Sets the value of the `cap`. This value can only be decreased further,
it can't be increased
```solidity
function _updateCap(uint256 cap_) internal virtual
```

**Arguments**
- `cap_<uint256>` - New cap, should be lower or equal to previous cap

**Returns**
- `void` 

### _mint
⤾ overrides [ERC20._mint](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/ERC20.sol#L251)

See {ERC20-_mint}. Adds restriction on minting functionality by disallowing
total supply to exceed cap
```solidity
function _mint(address account, uint256 amount) internal virtual override
```

**Arguments**
- `account<address>` - Accounts where the minted funds will be sent
- `amount<uint256>` - Amount that will be minted

**Returns**
- `void` 
