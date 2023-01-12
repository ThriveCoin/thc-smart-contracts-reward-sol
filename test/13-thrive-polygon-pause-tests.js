'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')
const { keccak256 } = require('@ethersproject/keccak256')

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('pause tests', (accounts) => {
    let contract = null
    const PAUSER_ROLE = keccak256(Buffer.from('PAUSER_ROLE', 'utf8'))

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
      await contract.deposit(
        accounts[0],
        web3.eth.abi.encodeParameter('uint256', '1000000000'),
        { from: accounts[0] }
      )
      await contract.approve(accounts[1], 5000, { from: accounts[0] })
      await contract.withdraw(10000, { from: accounts[0] })
      await contract.pause({ from: accounts[0] })
    })

    it('unpause should emit Unpaused event', async () => {
      const res = await contract.unpause({ from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Unpaused')
      assert.strictEqual(txLog.args.account, accounts[0])
    })

    it('pause should emit Paused event', async () => {
      const res = await contract.pause({ from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Paused')
      assert.strictEqual(txLog.args.account, accounts[0])
    })

    it('transfer should fail when paused', async () => {
      try {
        await contract.transfer(accounts[1], 10, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Pausable: token transfer while paused'),
          true
        )
      }
    })

    it('transferFrom should fail when paused', async () => {
      try {
        await contract.transferFrom(accounts[0], accounts[1], 100, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Pausable: token transfer while paused'),
          true
        )
      }
    })

    it('approve should not fail when paused', async () => {
      await contract.approve(accounts[1], 100, { from: accounts[0] })
    })

    it('increaseAllowance should not fail when paused', async () => {
      await contract.increaseAllowance(accounts[1], 35, { from: accounts[0] })
    })

    it('decreaseAllowance should not fail when paused', async () => {
      await contract.decreaseAllowance(accounts[1], 35, { from: accounts[0] })
    })

    it('deposit should fail when paused', async () => {
      try {
        await contract.deposit(accounts[1], web3.eth.abi.encodeParameter('uint256', 35), { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Pausable: token transfer while paused'),
          true
        )
      }
    })

    it('withdraw should fail when paused', async () => {
      try {
        await contract.withdraw(100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20Pausable: token transfer while paused'),
          true
        )
      }
    })

    it('updateCap should fail when paused', async () => {
      try {
        await contract.updateCap(999999000, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinERC20TokenPolygon: update cap while paused'),
          true
        )
      }
    })

    it('lockAmount should work when paused', async () => {
      await contract.lockAmount(accounts[0], accounts[1], 50, { from: accounts[0] })
    })

    it('unlockAmount should work when paused', async () => {
      await contract.unlockAmount(accounts[0], accounts[1], 50, { from: accounts[1] })
    })

    it('grantRole should work when paused', async () => {
      await contract.grantRole(PAUSER_ROLE, accounts[1], { from: accounts[0] })
      await contract.grantRole(PAUSER_ROLE, accounts[2], { from: accounts[0] })
    })

    it('revokeRole should work when paused', async () => {
      await contract.revokeRole(PAUSER_ROLE, accounts[1], { from: accounts[0] })
    })

    it('renounceRole should work when paused', async () => {
      await contract.renounceRole(PAUSER_ROLE, accounts[2], { from: accounts[2] })
    })

    it('block should work when paused', async () => {
      await contract.blockAccount(accounts[1], { from: accounts[0] })
      const blocked = await contract.isAccountBlocked.call(accounts[1])
      assert.strictEqual(blocked, true)
    })

    it('unblock should work when paused', async () => {
      await contract.unblockAccount(accounts[1], { from: accounts[0] })
      const blocked = await contract.isAccountBlocked.call(accounts[1])
      assert.strictEqual(blocked, false)
    })
  })
})
