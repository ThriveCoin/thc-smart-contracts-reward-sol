# ThriveCoinVestingSchedule - ThriveCoin Vesting Schedule (ThriveCoinVestingSchedule.sol)

**View Source:** [contracts/ThriveCoinVestingSchedule.sol](../contracts/ThriveCoinVestingSchedule.sol)

**Extends ↗:** [Ownable (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/Ownable.sol), [Context (openzeppelin@4.3.2)](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/utils/Context.sol)

**Author:** vigan.abd

**Description**: Implementation of the THRIVE Vesting Contract.

ThriveCoin Vesting schedule contract is a generic smart contract that
provides locking and vesting calculation for single wallet.

Vesting schedule is realized through allocating funds for stakeholder for
agreed vesting/locking schedule. The contract acts as a wallet for
stakeholder and they can withdraw funds once they become available
(see calcVestedAmount method). Funds become available periodically and the
stakeholder can check these details at any time by accessing the methods like
vested or available.

NOTE: funds are sent to contract after instantiation!

Implementation is based on these two smart contracts:
- https://github.com/OpenZeppelin/openzeppelin-contracts/blob/release-v4.5/contracts/finance/VestingWallet.sol
- https://github.com/cpu-coin/CPUcoin/blob/master/contracts/IERC20Vestable.sol

NOTE: extends openzeppelin v4.3.2 contracts:
https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/utils/Context.sol
https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/token/ERC20/utils/SafeERC20.sol
https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.2/contracts/access/Ownable.sol

## Contract Events
- [VestingFundsClaimed(address indexed token, address indexed beneficiary, uint256 amount)](#VestingFundsClaimed)
- [VestingFundsRevoked(address indexed token, address indexed beneficiary, address indexed refundDest, uint256 amount)](#VestingFundsRevoked)
- [VestingBeneficiaryChanged(address indexed token, address indexed oldBeneficiary, address indexed newBeneficiary)](#VestingBeneficiaryChanged)

### VestingFundsClaimed
```solidity
event VestingFundsClaimed(address indexed token, address indexed beneficiary, uint256 amount)
```

**Arguments**
- `token<address>`
- `beneficiary<address>`
- `amount<uint256>`

### VestingFundsRevoked
```solidity
event VestingFundsRevoked(address indexed token, address indexed beneficiary, address indexed refundDest, uint256 amount)
```

**Arguments**
- `token<address>`
- `beneficiary<address>`
- `refundDest<address>`
- `amount<uint256>`

### VestingBeneficiaryChanged
```solidity
event VestingBeneficiaryChanged(address indexed token, address indexed oldBeneficiary, address indexed newBeneficiary)
```

**Arguments**
- `token<address>`
- `oldBeneficiary<address>`
- `newBeneficiary<address>`

## Contract Modifiers
- `onlyBeneficiary()` - Throws if called by any account other than the beneficiary.
- `notRevoked()` - Throws if contract is revoked.

## Contract Members
- `SECONDS_PER_DAY<uint256>` - constant
- `_token<address>` - ERC20 token address
- `_beneficiary<address>` - Beneficiary address that is able to claim funds
- `_allocatedAmount<uint256>` - Total allocated amount
- `_startDay<uint256>` - Start day of the vesting schedule
- `_duration<uint256>` - Vesting schedule duration in days
- `_cliffDuration<uint256>` - Vesting schedule cliff period in days
- `_interval<uint256>` - Vesting schedule unlock period/interval in days
- `_revocable<bool>` - Flag that specifies if vesting schedule can be revoked
- `_revoked<bool>` - Flag that specifies if vesting schedule is revoked
- `_immutableBeneficiary<bool>` - Flag that specifies if beneficiary can be changed
- `_claimed<uint256>` - Claimed amount so far
- `_claimLimit<uint256>` - Daily claim limit
- `_lastClaimedDay<uint256>` - Last time (day) when funds were claimed
- `_dailyClaimedAmount<uint256>` - Amount claimed so far during the day

## Contract Methods
- [constructor(address token_, address beneficiary_, uint256 allocatedAmount_, uint256 startTime, uint256 duration_, uint256 cliffDuration_, uint256 interval_, uint256 claimed_, uint256 claimLimit_, bool revocable_, bool immutableBeneficiary_)](#constructor)
- [token()](#token)
- [beneficiary()](#beneficiary)
- [allocatedAmount()](#allocatedAmount)
- [startDay()](#startDay)
- [duration()](#duration)
- [cliffDuration()](#cliffduration)
- [interval()](#interval)
- [revocable()](#revocable)
- [immutableBeneficiary()](#immutablebeneficiary)
- [claimed()](#claimed)
- [vested()](#vested)
- [available()](#available)
- [locked()](#locked)
- [revoked()](#revoked)
- [calcVestedAmount(uint256 timestamp)](#calcVestedAmount)
- [claim(uint256 amount)](#claim)
- [revoke()](#revoke)
- [changeBeneficiary(address newBeneficiary)](#changeBeneficiary)
- [claimLimit()](#claimLimit)
- [changeClaimLimit(uint256 newClaimLimit)](#changeClaimLimit)
- [lastClaimedDay()](#lastClaimedDay)
- [dailyClaimedAmount()](#dailyClaimedAmount)
- [refundExceedingBalance()](#refundExceedingBalance)

### constructor
Initializes the vesting contract
```solidity
constructor(address token_, address beneficiary_, uint256 allocatedAmount_, uint256 startTime, uint256 duration_, uint256 cliffDuration_, uint256 interval_, uint256 claimed_, uint256 claimLimit_, bool revocable_, bool immutableBeneficiary_)
```

**Arguments**
- `token_<address>` - Specifies the ERC20 token that is stored in smart contract
- `beneficiary_<address>` - The address that is able to claim funds
- `allocatedAmount_<uint256>` - Specifies the total allocated amount for vesting/locking schedule/period
- `startTime<uint256>` - Specifies vesting/locking schedule start day, can be a date in future or past. The vesting schedule will calculate the available amount for claiming (unlocked amount) based on this timestamp.
- `duration_<uint256>` - Specifies the duration in days for vesting/locking schedule. At the point in time where start time + duration is passed the whole funds will be unlocked and the vesting/locking schedule would be finished.
- `cliffDuration_<uint256>` - Specifies the cliff period in days for schedule. Until this point in time is reached funds can’t be claimed, and once this time is passed some portion of funds will be unlocked based on schedule calculation from `startTime`.
- `interval_<uint256>` - Specifies how often the funds will be unlocked (in days). e.g. if this one is 365 it means that funds get unlocked every year.
- `claimed_<uint256>` - Is applicable only if the contract is migrated and specifies the amount claimed so far. In most cases this is 0.
- `claimLimit_<uint256>` - Specifies maximum amount that can be claimed/withdrawn during the day
- `revocable_<bool>` - Specifies if the smart contract is revocable or not. Once contract is revoked then no more funds can be claimed
- `immutableBeneficiary_<bool>` - Specifies whenever contract beneficiary can be changed or not. Usually this one is enabled just in case if stakeholder loses access to private key so in this case contract can change account for claiming future funds.

**Returns**
- `void` 

### token
Returns the address of ERC20 token.
```solidity
function token() public view virtual returns (address)
```

**Arguments**
- None

**Returns**
- `address` 

### beneficiary
Returns the address of the current beneficiary.
```solidity
function beneficiary() public view virtual returns (address)
```

**Arguments**
- None

**Returns**
- `address` 

### allocatedAmount
Returns the total amount allocated for vesting.
```solidity
function allocatedAmount() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### startDay
Returns the start day of the vesting schedule.
NOTE: The result is returned in days of year, if you want to get the date
you should multiply result with 86400 (seconds for day)
```solidity
function startDay() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### duration
Returns the vesting schedule duration in days unit.
```solidity
function duration() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### cliffDuration
Returns the vesting schedule cliff duration in days unit.
```solidity
function cliffDuration() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### interval
Returns interval in days of how often funds will be unlocked.
```solidity
function interval() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### revocable
Returns the flag specifying if the contract is revocable.
```solidity
function revocable() public view virtual returns (bool)
```

**Arguments**
- None

**Returns**
- `bool` 

### immutableBeneficiary
Returns the flag specifying if the beneficiary can be changed after
contract instantiation.
```solidity
function immutableBeneficiary() public view virtual returns (bool)
```

**Arguments**
- None

**Returns**
- `bool` 

### claimed
Returns the amount claimed/withdrawn from contract so far.
```solidity
function claimed() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### vested
Returns the amount unlocked so far.
```solidity
function vested() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### available
Returns the amount that is available for claiming/withdrawing.
```solidity
function available() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### locked
Returns the remaining locked amount
```solidity
function locked() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### revoked
Returns the flag that specifies if contract is revoked or not.
```solidity
function revoked() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `bool` 

### ready
Returns the flag specifying that the contract is ready to be used.
The function returns true only if the contract has enough balance for
transferring total allocated amount - already claimed amount
```solidity
function ready() public view virtual returns (bool)
```

**Arguments**
- None

**Returns**
- `bool` 

### calcVestedAmount
Calculates vested amount until specified timestamp.
```solidity
function calcVestedAmount(uint256 timestamp) public view virtual returns (uint256)
```

**Arguments**
- `timestamp<uint256>` - Unix epoch time in seconds

**Returns**
- `uint256` 

### claim
Withdraws funds from smart contract to beneficiary. Withdrawal is
allowed only if amount is less or equal to available amount and daily limit
is zero or greater/equal to amount.
```solidity
function claim(uint256 amount) public virtual onlyBeneficiary notRevoked
```

**Arguments**
- `amount<uint256>` - Amount that will be claimed by beneficiary

**Returns**
- `void`

### revoke
Revokes the contract. After revoking no more funds can be claimed and
remaining amount is transferred back to contract owner
```solidity
function revoke() public virtual onlyOwner notRevoked
```

**Arguments**
- None

**Returns**
- `void`

### changeBeneficiary
Changes the address of beneficiary. Once changed only new beneficiary can claim
the funds
```solidity
function changeBeneficiary(address newBeneficiary) public virtual onlyOwner
```

**Arguments**
- `newBeneficiary<address>` - New beneficiary address that can claim funds
from now on

**Returns**
- `void`

### claimLimit
Returns the max daily claimable amount.
```solidity
function claimLimit() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### changeClaimLimit
Changes daily claim limit.
```solidity
function changeClaimLimit(uint256 newClaimLimit) public virtual onlyOwner
```

**Arguments**
- `newClaimLimit<uint256>` - New daily claim limit
from now on

**Returns**
- `void`

### lastClaimedDay
Returns the day when funds were claimed lastly.
```solidity
function lastClaimedDay() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### dailyClaimedAmount
Returns the amount claimed so far during the day.
```solidity
function dailyClaimedAmount() public view virtual returns (uint256)
```

**Arguments**
- None

**Returns**
- `uint256` 

### refundExceedingBalance
Refunds contract balance that exceeds _allocatedAmount back to contract owner
```solidity
function refundExceedingBalance() public virtual onlyOwner
```

**Arguments**
- None
from now on

**Returns**
- `void`
