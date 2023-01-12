'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('mint and deposit tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
    })

    it('mint is not supported', async () => {
      try {
        await contract.mint(2500, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message, 'contract.mint is not a function')
      }
    })

    it('deposit should increase total supply and account balance', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceBefore = await contract.balanceOf.call(accounts[0])

      await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', 2500), { from: accounts[0] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAfter = await contract.balanceOf.call(accounts[0])

      assert.strictEqual(totalSupplyAfter.toNumber() - totalSupplyBefore.toNumber(), 2500)
      assert.strictEqual(balanceAfter.toNumber() - balanceBefore.toNumber(), 2500)
    })

    it('deposit should emit Transfer event', async () => {
      const res = await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', 100), { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.to, accounts[0])
      assert.strictEqual(txLog.args.value.toNumber(), 100)
    })

    it('deposit could mint for different amount than caller account', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceAcc0Before = await contract.balanceOf.call(accounts[0])
      const balanceAcc3Before = await contract.balanceOf.call(accounts[3])

      await contract.deposit(accounts[3], web3.eth.abi.encodeParameter('uint256', 300), { from: accounts[0] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAcc0After = await contract.balanceOf.call(accounts[0])
      const balanceAcc3After = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalSupplyAfter.toNumber() - totalSupplyBefore.toNumber(), 300)
      assert.strictEqual(balanceAcc0After.toNumber() - balanceAcc0Before.toNumber(), 0)
      assert.strictEqual(balanceAcc3After.toNumber() - balanceAcc3Before.toNumber(), 300)
    })

    it('deposit should not fail when amount is zero', async () => {
      const res = await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', 0), { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.to, accounts[0])
      assert.strictEqual(txLog.args.value.toNumber(), 0)
    })

    it('deposit should fail when amount is negative', async () => {
      try {
        await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', -300), { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'),
          true
        )
      }
    })

    it('deposit should fail when account is address zero', async () => {
      try {
        await contract.deposit(ADDRESS_ZERO, web3.eth.abi.encodeParameter('uint256', 100), { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20: mint to the zero address'),
          true
        )
      }
    })

    it('deposit can be called only by proxy', async () => {
      try {
        await contract.deposit(accounts[2], web3.eth.abi.encodeParameter('uint256', 100), { from: accounts[3] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinERC20TokenPolygon: only proxy can make deposits'), true
        )
      }
    })
  })
})
