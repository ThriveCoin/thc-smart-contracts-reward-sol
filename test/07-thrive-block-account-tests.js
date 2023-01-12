'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
const { keccak256 } = require('@ethersproject/keccak256')

describe('ThriveCoinERC20Token', () => {
  contract('block account tests', (accounts) => {
    let contract = null
    const MINTER_ROLE = keccak256(Buffer.from('MINTER_ROLE', 'utf8'))
    const PAUSER_ROLE = keccak256(Buffer.from('PAUSER_ROLE', 'utf8'))

    before(async () => {
      contract = await ThriveCoinERC20Token.deployed()

      await contract.burn(300000, { from: accounts[0] })
      await contract.transfer(accounts[1], 1000, { from: accounts[0] })
      await contract.transfer(accounts[2], 1000, { from: accounts[0] })
      await contract.approve(accounts[1], 1000, { from: accounts[0] })
      await contract.approve(accounts[2], 500, { from: accounts[1] })
      await contract.approve(accounts[2], 500, { from: accounts[0] })
      await contract.grantRole(MINTER_ROLE, accounts[1], { from: accounts[0] })
      await contract.grantRole(PAUSER_ROLE, accounts[1], { from: accounts[0] })
      await contract.blockAccount(accounts[1], { from: accounts[0] })
    })

    it('isAccountBlocked should return true when user is blocked', async () => {
      const res = await contract.isAccountBlocked.call(accounts[1])
      assert.strictEqual(res, true)
    })

    it('isAccountBlocked should return false when user is not blocked', async () => {
      const res = await contract.isAccountBlocked.call(accounts[2])
      assert.strictEqual(res, false)
    })

    it('blockAccount should block the account', async () => {
      await contract.blockAccount(accounts[2], { from: accounts[0] })
      const blocked = await contract.isAccountBlocked.call(accounts[2])
      assert.strictEqual(blocked, true)
    })

    it('blockAccount should emit AccountBlocked event', async () => {
      const res = await contract.blockAccount(accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'AccountBlocked')
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.timestamp.toNumber() <= Math.floor(Date.now() / 1000), true)
    })

    it('blockAccount should fail when account is already blocked', async () => {
      try {
        await contract.blockAccount(accounts[2], { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: account is already blocked'),
          true
        )
      }
    })

    it('unblockAccount should unblocks the account', async () => {
      await contract.unblockAccount(accounts[2], { from: accounts[0] })
      const blocked = await contract.isAccountBlocked.call(accounts[2])
      assert.strictEqual(blocked, false)
    })

    it('unblockAccount should emit AccountUnblocked event', async () => {
      const res = await contract.unblockAccount(accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'AccountUnblocked')
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.timestamp.toNumber() <= Math.floor(Date.now() / 1000), true)
    })

    it('unblockAccount should fail when account is already unblocked', async () => {
      try {
        await contract.unblockAccount(accounts[2], { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: account is not blocked'),
          true
        )
      }
    })

    it('transfer should fail when sender is blocked', async () => {
      try {
        await contract.transfer(accounts[2], 100, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: sender account should be not be blocked'),
          true
        )
      }
    })

    it('transfer should fail when receiver is blocked', async () => {
      try {
        await contract.transfer(accounts[1], 100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: receiver account should be not be blocked'),
          true
        )
      }
    })

    it('transferFrom should fail when sender is blocked', async () => {
      try {
        await contract.transferFrom(accounts[1], accounts[2], 100, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: sender account should be not be blocked'),
          true
        )
      }
    })

    it('transferFrom should fail when receiver is blocked', async () => {
      try {
        await contract.transferFrom(accounts[0], accounts[1], 100, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: receiver account should be not be blocked'),
          true
        )
      }
    })

    it('transferFrom should fail when caller is blocked', async () => {
      try {
        await contract.transferFrom(accounts[0], accounts[2], 100, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: caller account should be not be blocked'),
          true
        )
      }
    })

    it('approve should not fail when owner is blocked', async () => {
      await contract.approve(accounts[2], 100, { from: accounts[1] })
    })

    it('approve should not fail when spender is blocked', async () => {
      await contract.approve(accounts[1], 100, { from: accounts[0] })
    })

    it('increaseAllowance should not fail when owner is blocked', async () => {
      await contract.increaseAllowance(accounts[2], 10, { from: accounts[1] })
    })

    it('increaseAllowance should not fail when spender is blocked', async () => {
      await contract.increaseAllowance(accounts[1], 10, { from: accounts[0] })
    })

    it('decreaseAllowance should not fail when owner is blocked', async () => {
      await contract.decreaseAllowance(accounts[2], 10, { from: accounts[1] })
    })

    it('decreaseAllowance should not fail when spender is blocked', async () => {
      await contract.decreaseAllowance(accounts[1], 10, { from: accounts[0] })
    })

    it('mint should fail when caller is blocked', async () => {
      try {
        await contract.mint(accounts[0], 500, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: caller account should be not be blocked'),
          true
        )
      }
    })

    it('burn should fail when caller is blocked', async () => {
      try {
        await contract.burn(25, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: sender account should be not be blocked'),
          true
        )
      }
    })

    it('burnFrom should fail when caller is blocked', async () => {
      try {
        await contract.burnFrom(accounts[0], 100, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Blockable: caller account should be not be blocked'),
          true
        )
      }
    })

    it('lockAmount should not fail when owner is blocked', async () => {
      await contract.lockAmount(accounts[1], accounts[2], 1, { from: accounts[1] })
    })

    it('lockAmount should not fail when spender is blocked', async () => {
      await contract.lockAmount(accounts[2], accounts[1], 1, { from: accounts[2] })
    })

    it('unlockAmount not fail when owner is blocked', async () => {
      await contract.unlockAmount(accounts[1], accounts[2], 1, { from: accounts[2] })
    })

    it('unlockAmount not fail when spender is blocked', async () => {
      await contract.unlockAmount(accounts[2], accounts[1], 1, { from: accounts[1] })
    })

    it('pause should not fail when caller is blocked', async () => {
      await contract.pause({ from: accounts[1] })
    })

    it('unpause should fail when caller is blocked', async () => {
      await contract.unpause({ from: accounts[1] })
    })
  })
})
