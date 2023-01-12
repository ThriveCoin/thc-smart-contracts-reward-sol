'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20Token', () => {
  contract('mint tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20Token.deployed()
      await contract.burn(300000, { from: accounts[0] })
    })

    it('mint should increase total supply and account balance', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceBefore = await contract.balanceOf.call(accounts[0])

      await contract.mint(accounts[0], 2500, { from: accounts[0] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAfter = await contract.balanceOf.call(accounts[0])

      assert.strictEqual(totalSupplyAfter.toNumber() - totalSupplyBefore.toNumber(), 2500)
      assert.strictEqual(balanceAfter.toNumber() - balanceBefore.toNumber(), 2500)
    })

    it('mint should emit Transfer event', async () => {
      const res = await contract.mint(accounts[0], 100, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.to, accounts[0])
      assert.strictEqual(txLog.args.value.toNumber(), 100)
    })

    it('mint could mint for different amount than caller account', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceAcc0Before = await contract.balanceOf.call(accounts[0])
      const balanceAcc1Before = await contract.balanceOf.call(accounts[1])

      await contract.mint(accounts[0], 300, { from: accounts[0] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAcc0After = await contract.balanceOf.call(accounts[0])
      const balanceAcc1After = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(totalSupplyAfter.toNumber() - totalSupplyBefore.toNumber(), 300)
      assert.strictEqual(balanceAcc0After.toNumber() - balanceAcc0Before.toNumber(), 300)
      assert.strictEqual(balanceAcc1After.toNumber() - balanceAcc1Before.toNumber(), 0)
    })

    it('mint should not fail when amount is zero', async () => {
      const res = await contract.mint(accounts[0], 0, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.to, accounts[0])
      assert.strictEqual(txLog.args.value.toNumber(), 0)
    })

    it('mint should fail when amount is negative', async () => {
      try {
        await contract.mint(accounts[0], -300, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'),
          true
        )
      }
    })

    it('mint should fail when account is address zero', async () => {
      try {
        await contract.mint(ADDRESS_ZERO, 100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20: mint to the zero address'),
          true
        )
      }
    })
  })
})
