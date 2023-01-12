'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('polygon functionality tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
    })

    it('constructor should set total supply to zero and set proxy address', async () => {
      const totalSupply = await contract.totalSupply.call()
      const childChainManagerProxy = await contract.childChainManagerProxy.call()

      assert.strictEqual(totalSupply.toNumber(), 0)
      assert.strictEqual(childChainManagerProxy, accounts[0])
    })

    it('childChainManagerProxy cannot be updated from others', async () => {
      try {
        await contract.updateChildChainManager('0xb5505a6d998549090530911180f38aC5130101c6', { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinERC20TokenPolygon: only owner can perform the update'), true
        )
      }
    })

    it('childChainManagerProxy can be updated from owner', async () => {
      await contract.updateChildChainManager(accounts[1], { from: accounts[0] })

      const childChainManagerProxy = await contract.childChainManagerProxy.call()
      assert.strictEqual(childChainManagerProxy, accounts[1])
    })
  })
})
