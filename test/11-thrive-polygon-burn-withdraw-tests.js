'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('burn and withdraw tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
      await contract.deposit(
        accounts[0],
        web3.eth.abi.encodeParameter('uint256', '1000000000'),
        { from: accounts[0] }
      )
      await contract.transfer(accounts[1], 2000, { from: accounts[0] })
    })

    it('burn is not supported', async () => {
      try {
        await contract.burn(300, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message, 'contract.burn is not a function')
      }
    })

    it('burnFrom should burn from target account and decrease allowance', async () => {
      try {
        await contract.burnFrom(accounts[0], 2000, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message, 'contract.burnFrom is not a function')
      }
    })

    it('withdraw should reduce balance and total supply', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceBefore = await contract.balanceOf.call(accounts[0])

      await contract.withdraw(2500, { from: accounts[0] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAfter = await contract.balanceOf.call(accounts[0])

      assert.strictEqual(totalSupplyBefore.toNumber() - totalSupplyAfter.toNumber(), 2500)
      assert.strictEqual(balanceBefore.toNumber() - balanceAfter.toNumber(), 2500)
    })

    it('withdraw emit Transfer event', async () => {
      const res = await contract.withdraw(300, { from: accounts[1] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[1])
      assert.strictEqual(txLog.args.to, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.value.toNumber(), 300)
    })

    it('withdraw should not fail when amount is zero', async () => {
      const res = await contract.withdraw(0, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.to, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.value.toNumber(), 0)
    })

    it('withdraw should fail when amount is greater than balance', async () => {
      try {
        await contract.withdraw(2500, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'),
          true
        )
      }
    })

    it('withdraw should fail when amount is negative', async () => {
      try {
        await contract.withdraw(-2500, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'),
          true
        )
      }
    })
  })
})
