'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('cap tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
      await contract.deposit(
        accounts[0],
        web3.eth.abi.encodeParameter('uint256', '1000000000'),
        { from: accounts[0] }
      )
    })

    it('cap should be readable', async () => {
      const cap = await contract.cap.call()
      assert.strictEqual(cap.toNumber(), 1000000000)
    })

    it('cap cannot be increased', async () => {
      try {
        await contract.updateCap(1000000001, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20DynamicCap: cap can only be decreased'), true
        )
      }
    })

    it('cap cannot be decreased below total supply', async () => {
      try {
        await contract.updateCap(1000, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20DynamicCap: cap cannot be less than total supply'), true
        )
      }
    })

    it('cap update should be reject on zero amount', async () => {
      try {
        await contract.updateCap(0, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20DynamicCap: cap cannot be 0'), true
        )
      }
    })

    it('cap update should be reject on negative amount', async () => {
      try {
        await contract.updateCap(-100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'), true
        )
      }
    })

    it('cap decrease should override value, not substract it', async () => {
      await contract.withdraw(70000, { from: accounts[0] })
      const res = await contract.updateCap(999997000, { from: accounts[0] })
      const txLog = res.logs[0]
      const cap = await contract.cap.call()

      assert.strictEqual(cap.toNumber(), 999997000)

      assert.strictEqual(txLog.event, 'CapUpdated')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.prevCap.toNumber(), 1000000000)
      assert.strictEqual(txLog.args.newCap.toNumber(), 999997000)
    })

    it('deposit cannot exceed total cap', async () => {
      try {
        await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', 90000), { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20DynamicCap: cap exceeded'), true
        )
      }
    })

    it('deposit can be below total cap', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', 2500), { from: accounts[0] })
      const totalSupplyAfter = await contract.totalSupply.call()

      assert.strictEqual(totalSupplyBefore.toNumber(), 999930000)
      assert.strictEqual(totalSupplyAfter.toNumber(), 999932500)
    })

    it('deposit can hit total cap', async () => {
      await contract.deposit(accounts[0], web3.eth.abi.encodeParameter('uint256', 64500), { from: accounts[0] })
      const totalSupply = await contract.totalSupply.call()

      assert.strictEqual(totalSupply.toNumber(), 999997000)
    })
  })
})
