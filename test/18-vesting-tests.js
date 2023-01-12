'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { promisify } = require('util')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
const SECONDS_PER_DAY = 86400

describe('ThriveCoinVestingSchedule', () => {
  contract('constructor tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startTime = Math.floor(Date.now() / 1000) + SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startTime,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should fail instantiation when token address is zero address', async () => {
      try {
        await ThriveCoinVestingSchedule.new(
          ...Object.values({ ...contractArgs, token_: ADDRESS_ZERO }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: token is zero address'), true
        )
      }
    })

    it('should fail instantiation when beneficiary address is zero address', async () => {
      try {
        await ThriveCoinVestingSchedule.new(
          ...Object.values({ ...contractArgs, beneficiary_: ADDRESS_ZERO }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: beneficiary is zero address'), true
        )
      }
    })

    it('should fail instantiation when cliffDuration is greater than duration', async () => {
      try {
        await ThriveCoinVestingSchedule.new(
          ...Object.values({ ...contractArgs, cliffDuration_: 40 }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: cliff duration greater than duration'), true
        )
      }
    })

    it('should fail instantiation when interval is lower than 1', async () => {
      try {
        await ThriveCoinVestingSchedule.new(
          ...Object.values({ ...contractArgs, interval_: 0 }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: interval should be at least 1 day'), true
        )
      }
    })

    it('should work with valid contract args', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
      assert.strictEqual(typeof contract.address, 'string')
    })
  })

  contract('private props access tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let contract = null
    let erc20 = null
    const startTime = Math.floor(Date.now() / 1000) + SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startTime,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
      contract = await ThriveCoinVestingSchedule.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
    })

    it('should expose token for read access', async () => {
      const token = await contract.token.call()
      assert.strictEqual(token, contractArgs.token_)
    })

    it('should expose beneficiary for read access', async () => {
      const beneficiary = await contract.beneficiary.call()
      assert.strictEqual(beneficiary, contractArgs.beneficiary_)
    })

    it('should expose allocatedAmount for read access', async () => {
      const allocatedAmount = await contract.allocatedAmount.call()
      assert.strictEqual(allocatedAmount.toNumber(), contractArgs.allocatedAmount_)
    })

    it('should expose startDay for read access', async () => {
      const startDay = await contract.startDay.call()
      assert.strictEqual(startDay.toNumber(), Math.floor(contractArgs.startTime / SECONDS_PER_DAY))
    })

    it('should expose duration for read access', async () => {
      const duration = await contract.duration.call()
      assert.strictEqual(duration.toNumber(), contractArgs.duration_)
    })

    it('should expose cliffDuration for read access', async () => {
      const cliffDuration = await contract.cliffDuration.call()
      assert.strictEqual(cliffDuration.toNumber(), contractArgs.cliffDuration_)
    })

    it('should expose interval for read access', async () => {
      const interval = await contract.interval.call()
      assert.strictEqual(interval.toNumber(), contractArgs.interval_)
    })

    it('should expose revocable for read access', async () => {
      const revocable = await contract.revocable.call()
      assert.strictEqual(revocable, contractArgs.revocable_)
    })

    it('should expose immutableBeneficiary for read access', async () => {
      const immutableBeneficiary = await contract.immutableBeneficiary.call()
      assert.strictEqual(immutableBeneficiary, contractArgs.immutableBeneficiary_)
    })
  })

  contract('calc vested amount tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let contract = null
    let erc20 = null
    const startTime = Math.floor(Date.now() / 1000) + SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startTime,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
      contract = await ThriveCoinVestingSchedule.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
    })

    it('should return 0 if timestamp is less than startDay', async () => {
      const startDay = (await contract.startDay.call()).toNumber()
      const timestamp = (startDay - 1) * SECONDS_PER_DAY
      const calcRes = await contract.calcVestedAmount.call(timestamp)
      assert.strictEqual(calcRes.toNumber(), 0)
    })

    it('should return 0 if timestamp is less than startDay + cliffDuration', async () => {
      const startDay = (await contract.startDay.call()).toNumber()
      const timestamp = (startDay + contractArgs.cliffDuration_ - 1) * SECONDS_PER_DAY
      const calcRes = await contract.calcVestedAmount.call(timestamp)

      assert.strictEqual(calcRes.toNumber(), 0)
    })

    it('should return calculated vested amount until cliffDuration when timestamp is equal to cliffDuration', async () => {
      const startDay = (await contract.startDay.call()).toNumber()
      const timestamp = (startDay + contractArgs.cliffDuration_) * SECONDS_PER_DAY
      const calcRes = await contract.calcVestedAmount.call(timestamp)

      assert.strictEqual(calcRes.toNumber(), 13) // 3.33 * 4 => 13.32 -> 13
    })

    it('should calc values accuratelly based on duration and interval', async () => {
      const startDay = (await contract.startDay.call()).toNumber()
      const timestamp = (startDay + 10) * SECONDS_PER_DAY
      const calcRes = await contract.calcVestedAmount.call(timestamp)

      assert.strictEqual(calcRes.toNumber(), 26) // 3.33 * 8 => 26.64 -> 26
    })

    it('can return less than total in last vesting day depending on params', async () => {
      const startDay = (await contract.startDay.call()).toNumber()
      const timestamp = (startDay + contractArgs.duration_) * SECONDS_PER_DAY
      const calcRes = await contract.calcVestedAmount.call(timestamp)

      assert.strictEqual(calcRes.toNumber(), 93) // 3.33 * 28 => 93.33 -> 93
    })

    it('can return total in last vesting day depending on params', async () => {
      const testContract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, interval_: 1, duration_: 100 }),
        { from: accounts[0] }
      )
      const startDay = (await testContract.startDay.call()).toNumber()
      const timestamp = (startDay + 100) * SECONDS_PER_DAY
      const calcRes = await testContract.calcVestedAmount.call(timestamp)

      assert.strictEqual(calcRes.toNumber(), 100)
    })

    it('should return total amount if it exceeds duration', async () => {
      const startDay = (await contract.startDay.call()).toNumber()
      const timestamp = (startDay + contractArgs.duration_ + 1) * SECONDS_PER_DAY
      const allocatedAmount = await contract.allocatedAmount.call()
      const calcRes = await contract.calcVestedAmount.call(timestamp)

      assert.strictEqual(calcRes.toNumber(), allocatedAmount.toNumber())
    })
  })

  contract('claim tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should fail when contract does not have funds', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )

      const available = await contract.available.call()
      assert.strictEqual(available.toNumber(), 26)

      try {
        await contract.claim(26, { from: contractArgs.beneficiary_, gas: 500000 })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: Contract is not fully initialized yet'), true
        )
      }
    })

    it('should fail when amount exceeds available funds', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const available = await contract.available.call()
      assert.strictEqual(available.toNumber(), 26)

      try {
        await contract.claim(30, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: amount exceeds available balance'), true
        )
      }
    })

    it('should transfer funds when contract has requested amount and amount is available', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const availableBefore = await contract.available.call()
      const claimedBefore = await contract.claimed.call()
      const contractBalBefore = await erc20.balanceOf.call(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf.call(contractArgs.beneficiary_)

      await contract.claim(20, { from: contractArgs.beneficiary_ })

      const availableAfter = await contract.available.call()
      const claimedAfter = await contract.claimed.call()
      const contractBalAfter = await erc20.balanceOf.call(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf.call(contractArgs.beneficiary_)

      assert.strictEqual(availableBefore.toNumber(), 26)
      assert.strictEqual(claimedBefore.toNumber(), 0)
      assert.strictEqual(contractBalBefore.toNumber(), 100)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 0)
      assert.strictEqual(availableAfter.toNumber(), 6)
      assert.strictEqual(claimedAfter.toNumber(), 20)
      assert.strictEqual(contractBalAfter.toNumber(), 80)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 20)
    })

    it('should emit VestingFundsClaimed event', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      const res = await contract.claim(20, { from: contractArgs.beneficiary_ })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'VestingFundsClaimed')
      assert.strictEqual(txLog.args.token, erc20.address)
      assert.strictEqual(txLog.args.beneficiary, contractArgs.beneficiary_)
      assert.strictEqual(txLog.args.amount.toNumber(), 20)
    })

    it('should transfer up to available limit', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const availableBefore = await contract.available.call()
      const claimedBefore = await contract.claimed.call()
      const contractBalBefore = await erc20.balanceOf.call(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf.call(contractArgs.beneficiary_)

      await contract.claim(26, { from: contractArgs.beneficiary_ })

      const availableAfter = await contract.available.call()
      const claimedAfter = await contract.claimed.call()
      const contractBalAfter = await erc20.balanceOf.call(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf.call(contractArgs.beneficiary_)

      assert.strictEqual(availableBefore.toNumber(), 26)
      assert.strictEqual(claimedBefore.toNumber(), 0)
      assert.strictEqual(contractBalBefore.toNumber(), 100)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 40)
      assert.strictEqual(availableAfter.toNumber(), 0)
      assert.strictEqual(claimedAfter.toNumber(), 26)
      assert.strictEqual(contractBalAfter.toNumber(), 74)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 66)
    })
  })

  contract('claimed metric tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('initial value could be zero', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )

      const claimed = await contract.claimed.call()
      assert.strictEqual(claimed.toNumber(), 0)
    })

    it('initial value could be different from zero', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimed_: 10 }),
        { from: accounts[0] }
      )

      const claimed = await contract.claimed.call()
      assert.strictEqual(claimed.toNumber(), 10)
    })

    it('should return claimed so far after multiple claims', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      await contract.claim(13, { from: contractArgs.beneficiary_ })
      const claimed1 = await contract.claimed.call()

      await contract.claim(5, { from: contractArgs.beneficiary_ })
      const claimed2 = await contract.claimed.call()

      assert.strictEqual(claimed1.toNumber(), 13)
      assert.strictEqual(claimed2.toNumber(), 18)
    })
  })

  contract('vested metric tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should return vested amount so far', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )

      const vested = await contract.vested.call()
      assert.strictEqual(vested.toNumber(), 26)
    })
  })

  contract('available metric tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should return vested amount so far minus claimed so far', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(20, { from: contractArgs.beneficiary_ })

      const vested = await contract.vested.call()
      const claimed = await contract.claimed.call()
      const available = await contract.available.call()

      assert.strictEqual(vested.toNumber(), 26)
      assert.strictEqual(available.toNumber(), 6)
      assert.strictEqual(claimed.toNumber(), 20)
    })
  })

  contract('locked metric tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should return remaining amount to be unlocked', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(20, { from: contractArgs.beneficiary_ })

      const vested = await contract.vested.call()
      const locked = await contract.locked.call()

      assert.strictEqual(vested.toNumber(), 26)
      assert.strictEqual(locked.toNumber(), 74)
    })
  })

  contract('revoke tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: true,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should fail if funds are not transferred yet to contract', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )

      try {
        await contract.revoke({ from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: Contract is not fully initialized yet'), true
        )
      }
    })

    it('should return remaining amount to owner', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(20, { from: contractArgs.beneficiary_ })

      const revokedBefore = await contract.revoked.call()
      const contractBalBefore = await erc20.balanceOf(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalBefore = await erc20.balanceOf(accounts[0])

      await contract.revoke({ from: accounts[0] })

      const revokedAfter = await contract.revoked.call()
      const contractBalAfter = await erc20.balanceOf(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalAfter = await erc20.balanceOf(accounts[0])

      assert.strictEqual(revokedBefore, false)
      assert.strictEqual(contractBalBefore.toNumber(), 80)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 20)
      assert.strictEqual(ownerBalBefore.toNumber(), 999999900)
      assert.strictEqual(revokedAfter, true)
      assert.strictEqual(contractBalAfter.toNumber(), 0)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 20)
      assert.strictEqual(ownerBalAfter.toNumber(), 999999980)
    })

    it('can revoke the whole amount if not claimed', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const revokedBefore = await contract.revoked.call()
      const contractBalBefore = await erc20.balanceOf(contract.address)
      const ownerBalBefore = await erc20.balanceOf(accounts[0])

      await contract.revoke({ from: accounts[0] })

      const revokedAfter = await contract.revoked.call()
      const contractBalAfter = await erc20.balanceOf(contract.address)
      const ownerBalAfter = await erc20.balanceOf(accounts[0])

      assert.strictEqual(revokedBefore, false)
      assert.strictEqual(contractBalBefore.toNumber(), 100)
      assert.strictEqual(ownerBalBefore.toNumber(), 999999880)
      assert.strictEqual(revokedAfter, true)
      assert.strictEqual(contractBalAfter.toNumber(), 0)
      assert.strictEqual(ownerBalAfter.toNumber(), 999999980)
    })

    it('won\'t revoke any amount if all funds are already claimed', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 50 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(100, { from: contractArgs.beneficiary_ })

      const revokedBefore = await contract.revoked.call()
      const contractBalBefore = await erc20.balanceOf(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalBefore = await erc20.balanceOf(accounts[0])

      await contract.revoke({ from: accounts[0] })

      const revokedAfter = await contract.revoked.call()
      const contractBalAfter = await erc20.balanceOf(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalAfter = await erc20.balanceOf(accounts[0])

      assert.strictEqual(revokedBefore, false)
      assert.strictEqual(contractBalBefore.toNumber(), 0)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 120)
      assert.strictEqual(ownerBalBefore.toNumber(), 999999880)
      assert.strictEqual(revokedAfter, true)
      assert.strictEqual(contractBalAfter.toNumber(), 0)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 120)
      assert.strictEqual(ownerBalAfter.toNumber(), 999999880)
    })

    it('should emit VestingFundsRevoked event', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(20, { from: contractArgs.beneficiary_ })

      const res = await contract.revoke({ from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'VestingFundsRevoked')
      assert.strictEqual(txLog.args.token, erc20.address)
      assert.strictEqual(txLog.args.beneficiary, contractArgs.beneficiary_)
      assert.strictEqual(txLog.args.refundDest, accounts[0])
      assert.strictEqual(txLog.args.amount.toNumber(), 80)
    })

    it('moves back to owner the whole contract balance', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 50 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, 130, { from: accounts[0] })
      await contract.claim(100, { from: contractArgs.beneficiary_ })

      const revokedBefore = await contract.revoked.call()
      const contractBalBefore = await erc20.balanceOf(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalBefore = await erc20.balanceOf(accounts[0])

      await contract.revoke({ from: accounts[0] })

      const revokedAfter = await contract.revoked.call()
      const contractBalAfter = await erc20.balanceOf(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalAfter = await erc20.balanceOf(accounts[0])

      assert.strictEqual(revokedBefore, false)
      assert.strictEqual(contractBalBefore.toNumber(), 30)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 240)
      assert.strictEqual(ownerBalBefore.toNumber(), 999999730)
      assert.strictEqual(revokedAfter, true)
      assert.strictEqual(contractBalAfter.toNumber(), 0)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 240)
      assert.strictEqual(ownerBalAfter.toNumber(), 999999760)
    })

    it('can be triggered only by owner', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.revoke({ from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'), true
        )
      }
    })

    it('cannot be called if contract is already revoked', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.revoke({ from: accounts[0] })

      try {
        await contract.revoke({ from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: contract is revoked'), true
        )
      }
    })

    it('cannot be revoked if contract is not revocable', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, revocable_: false }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.revoke({ from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: contract is not revocable'), true
        )
      }
    })

    it('funds cannot be claimed once revoked', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(5, { from: contractArgs.beneficiary_ })
      await contract.revoke({ from: accounts[0] })

      try {
        await contract.claim(5, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: contract is revoked'), true
        )
      }
    })
  })

  contract('refund exceeding balance tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: true,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('should fail if funds are not transferred yet to contract', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )

      try {
        await contract.refundExceedingBalance({ from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: Contract is not fully initialized yet'), true
        )
      }
    })

    it('moves difference from allocated amount back to owner from contract balance', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 50 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, 130, { from: accounts[0] })

      const contractBalBefore = await erc20.balanceOf(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalBefore = await erc20.balanceOf(accounts[0])

      await contract.refundExceedingBalance({ from: accounts[0] })

      const contractBalAfter = await erc20.balanceOf(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalAfter = await erc20.balanceOf(accounts[0])

      assert.strictEqual(contractBalBefore.toNumber(), 130)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 0)
      assert.strictEqual(ownerBalBefore.toNumber(), 999999870)
      assert.strictEqual(contractBalAfter.toNumber(), 100)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 0)
      assert.strictEqual(ownerBalAfter.toNumber(), 999999900)
    })

    it('moves difference from allocated and already claimed amount back to owner from contract balance', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 50 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, 130, { from: accounts[0] })
      await contract.claim(100, { from: contractArgs.beneficiary_ })

      const contractBalBefore = await erc20.balanceOf(contract.address)
      const beneficiaryBalBefore = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalBefore = await erc20.balanceOf(accounts[0])

      await contract.refundExceedingBalance({ from: accounts[0] })

      const contractBalAfter = await erc20.balanceOf(contract.address)
      const beneficiaryBalAfter = await erc20.balanceOf(contractArgs.beneficiary_)
      const ownerBalAfter = await erc20.balanceOf(accounts[0])

      assert.strictEqual(contractBalBefore.toNumber(), 30)
      assert.strictEqual(beneficiaryBalBefore.toNumber(), 100)
      assert.strictEqual(ownerBalBefore.toNumber(), 999999770)
      assert.strictEqual(contractBalAfter.toNumber(), 0)
      assert.strictEqual(beneficiaryBalAfter.toNumber(), 100)
      assert.strictEqual(ownerBalAfter.toNumber(), 999999800)
    })
  })

  contract('change beneficiary tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: false
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
    })

    it('cannot change beneficiary if it is immutable', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, immutableBeneficiary_: true }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.changeBeneficiary(accounts[2], { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: beneficiary is immutable'), true
        )
      }
    })

    it('can be called only by owner', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.changeBeneficiary(accounts[2], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'), true
        )
      }
    })

    it('once changed funds will be moved to new beneficiary when claim is triggered', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      const res1 = await contract.claim(5, { from: contractArgs.beneficiary_ })
      const txLog1 = res1.logs[0]

      const oldBenefBalBefore = await erc20.balanceOf(contractArgs.beneficiary_)
      const newBenefBalBefore = await erc20.balanceOf(accounts[2])

      await contract.changeBeneficiary(accounts[2], { from: accounts[0] })
      const res2 = await contract.claim(10, { from: accounts[2] })
      const txLog2 = res2.logs[0]

      const oldBenefBalAfter = await erc20.balanceOf(contractArgs.beneficiary_)
      const newBenefBalAfter = await erc20.balanceOf(accounts[2])

      assert.strictEqual(txLog1.event, 'VestingFundsClaimed')
      assert.strictEqual(txLog1.args.token, erc20.address)
      assert.strictEqual(txLog1.args.beneficiary, contractArgs.beneficiary_)
      assert.strictEqual(txLog1.args.amount.toNumber(), 5)

      assert.strictEqual(txLog2.event, 'VestingFundsClaimed')
      assert.strictEqual(txLog2.args.token, erc20.address)
      assert.strictEqual(txLog2.args.beneficiary, accounts[2])
      assert.strictEqual(txLog2.args.amount.toNumber(), 10)

      assert.strictEqual(oldBenefBalBefore.toNumber(), 5)
      assert.strictEqual(newBenefBalBefore.toNumber(), 0)
      assert.strictEqual(oldBenefBalAfter.toNumber(), 5)
      assert.strictEqual(newBenefBalAfter.toNumber(), 10)
    })

    it('once changed funds cannod be claimed by old beneficiary', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(5, { from: contractArgs.beneficiary_ })

      await contract.changeBeneficiary(accounts[2], { from: accounts[0] })

      try {
        await contract.claim(5, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: only beneficiary can perform the action'), true
        )
      }
    })

    it('should emit VestingBeneficiaryChanged event', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )

      const res = await contract.changeBeneficiary(accounts[2], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'VestingBeneficiaryChanged')
      assert.strictEqual(txLog.args.token, erc20.address)
      assert.strictEqual(txLog.args.oldBeneficiary, contractArgs.beneficiary_)
      assert.strictEqual(txLog.args.newBeneficiary, accounts[2])
    })
  })

  contract('ownership tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let contract = null
    let erc20 = null
    const startTime = Math.floor(Date.now() / 1000) + SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startTime,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
      contract = await ThriveCoinVestingSchedule.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
    })

    it('transferOwnership can be done only by owner', async () => {
      const oldOwner = await contract.owner.call()
      await contract.transferOwnership(accounts[5], { from: oldOwner })
      const newOwner = await contract.owner.call()

      assert.strictEqual(oldOwner === accounts[0], true)
      assert.strictEqual(newOwner === accounts[5], true)

      try {
        await contract.transferOwnership(accounts[5], { from: oldOwner })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'),
          true
        )
      }
    })

    it('transferOwnership should emit OwnershipTransferred event', async () => {
      const oldOwner = await contract.owner.call()
      const res = await contract.transferOwnership(accounts[4], { from: oldOwner })
      const newOwner = await contract.owner.call()
      const txLog = res.logs[0]

      assert.strictEqual(oldOwner, accounts[5])
      assert.strictEqual(newOwner, accounts[4])
      assert.strictEqual(txLog.event, 'OwnershipTransferred')
      assert.strictEqual(txLog.args.previousOwner, oldOwner)
      assert.strictEqual(txLog.args.newOwner, newOwner)
    })

    it('renounceOwnership can be done only by owner', async () => {
      try {
        await contract.renounceOwnership({ from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'),
          true
        )
      }
    })

    it('renounceOwnership should move owner to zero address', async () => {
      const oldOwner = await contract.owner.call()
      const res = await contract.renounceOwnership({ from: oldOwner })
      const newOwner = await contract.owner.call()
      const txLog = res.logs[0]

      assert.strictEqual(oldOwner, accounts[4])
      assert.strictEqual(newOwner, ADDRESS_ZERO)
      assert.strictEqual(txLog.event, 'OwnershipTransferred')
      assert.strictEqual(txLog.args.previousOwner, oldOwner)
      assert.strictEqual(txLog.args.newOwner, ADDRESS_ZERO)
    })
  })

  contract('claim limit tests', (accounts) => {
    const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
    const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

    let erc20 = null
    const startOfDay = Math.floor(Math.floor(Date.now() / 1000) / SECONDS_PER_DAY) * SECONDS_PER_DAY
    const contractArgs = {
      token_: '',
      beneficiary_: accounts[1],
      allocatedAmount_: 100,
      startTime: startOfDay - 10 * SECONDS_PER_DAY,
      duration_: 30,
      cliffDuration_: 5,
      interval_: 4,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: false,
      immutableBeneficiary_: true
    }
    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    before(async () => {
      erc20 = await ThriveCoinERC20Token.deployed()
      contractArgs.token_ = erc20.address
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
    })

    after(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('if claim limit is zero then there is no limit', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(26, { from: contractArgs.beneficiary_ })
    })

    it('if claim limit is passed the call should fail', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.claim(26, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: amount exceeds claim limit'),
          true
        )
      }
    })

    it('funds can be claimed if limit is not reached', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(18, { from: contractArgs.beneficiary_ })
    })

    it('can claim up to limit', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(20, { from: contractArgs.beneficiary_ })
    })

    it('limit can be changed', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.claim(26, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: amount exceeds claim limit'),
          true
        )
      }

      await contract.changeClaimLimit(26, { from: accounts[0] })
      await contract.claim(26, { from: contractArgs.beneficiary_ })
    })

    it('only owner can change limit', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      try {
        await contract.changeClaimLimit(26, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'),
          true
        )
      }
      await contract.changeClaimLimit(26, { from: accounts[0] })
    })

    it('daily claimed amount should be zero by default', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const dailyClaimedAmount = await contract.dailyClaimedAmount.call()
      assert.strictEqual(dailyClaimedAmount.toNumber(), 0)
    })

    it('daily claimed amount should be increased when amount is claimed', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const dailyClaimedAmountBefore = await contract.dailyClaimedAmount.call()
      await contract.claim(10, { from: contractArgs.beneficiary_ })
      const dailyClaimedAmountAfter = await contract.dailyClaimedAmount.call()

      assert.strictEqual(dailyClaimedAmountBefore.toNumber(), 0)
      assert.strictEqual(dailyClaimedAmountAfter.toNumber(), 10)
    })

    it('if daily claim limit is passed the call should fail', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(16, { from: contractArgs.beneficiary_ })

      try {
        await contract.claim(10, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: amount exceeds claim limit'),
          true
        )
      }
    })

    it('if day changes the limit should be reset', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })
      await contract.claim(16, { from: contractArgs.beneficiary_ })

      const dailyClaimedAmountToday = await contract.dailyClaimedAmount.call()
      assert.strictEqual(dailyClaimedAmountToday.toNumber(), 16)

      try {
        await contract.claim(10, { from: contractArgs.beneficiary_ })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinVestingSchedule: amount exceeds claim limit'),
          true
        )
      }

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [SECONDS_PER_DAY], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claim(10, { from: contractArgs.beneficiary_ })
      const dailyClaimedAmountTomorrow = await contract.dailyClaimedAmount.call()
      assert.strictEqual(dailyClaimedAmountTomorrow.toNumber(), 10)
    })

    it('daily claimed amount should be reset when day changes', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      await contract.claim(10, { from: contractArgs.beneficiary_ })

      const dailyClaimedAmountToday = await contract.dailyClaimedAmount.call()
      assert.strictEqual(dailyClaimedAmountToday.toNumber(), 10)

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [SECONDS_PER_DAY], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const dailyClaimedAmountTomorrow = await contract.dailyClaimedAmount.call()
      assert.strictEqual(dailyClaimedAmountTomorrow.toNumber(), 0)
    })

    it('last claimed day should be set when claim occurs', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const lastClaimedDayBefore = await contract.lastClaimedDay.call()
      await contract.claim(10, { from: contractArgs.beneficiary_ })
      const lastClaimedDayAfter = await contract.lastClaimedDay.call()

      const blockNumber = await web3.eth.getBlockNumber()
      const { timestamp } = await web3.eth.getBlock(blockNumber)

      assert.strictEqual(lastClaimedDayBefore.toNumber(), 0)
      assert.strictEqual(lastClaimedDayAfter.toNumber(), Math.floor(timestamp / SECONDS_PER_DAY))
    })

    it('last claimed day should be updated when day changes', async () => {
      const contract = await ThriveCoinVestingSchedule.new(
        ...Object.values({ ...contractArgs, startTime: startOfDay - 10 * SECONDS_PER_DAY, claimLimit_: 20 }),
        { from: accounts[0] }
      )
      await erc20.transfer(contract.address, contractArgs.allocatedAmount_, { from: accounts[0] })

      const blockNumber = await web3.eth.getBlockNumber()
      const { timestamp } = await web3.eth.getBlock(blockNumber)

      await contract.claim(10, { from: contractArgs.beneficiary_ })
      const lastClaimedDayBefore = await contract.lastClaimedDay.call()

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [SECONDS_PER_DAY], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claim(10, { from: contractArgs.beneficiary_ })
      const lastClaimedDayAfter = await contract.lastClaimedDay.call()

      assert.strictEqual(lastClaimedDayBefore.toNumber(), Math.floor(timestamp / SECONDS_PER_DAY))
      assert.strictEqual(lastClaimedDayAfter.toNumber(), Math.floor(timestamp / SECONDS_PER_DAY) + 1)
    })
  })
})
