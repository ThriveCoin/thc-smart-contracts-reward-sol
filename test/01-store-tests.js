'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinRewardSeason = artifacts.require('ThriveCoinRewardSeason')

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinRewardSeason', () => {
  contract('store tests', (accounts) => {
    let contract
    const season = 1

    before(async () => {
      contract = await ThriveCoinRewardSeason.deployed()
    })

    it('addReward should store new receipt', async () => {
      const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })
      const reward = await contract.readReward(season, accounts[0])

      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)
    })

    it('addRewardBatch should store multiple receipts', async () => {
      const userRewards = [
        { owner: accounts[0], destination: accounts[0], amount: '3' },
        { owner: accounts[1], destination: accounts[2], amount: '4' }
      ]
      await contract.addRewardBatch(userRewards, { from: accounts[0] })

      let reward = await contract.readReward(season, accounts[0])
      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '3')

      reward = await contract.readReward(season, accounts[1])
      assert.strictEqual(reward.destination, accounts[2])
      assert.strictEqual(reward.amount, '4')
    })

    it('readReward should return 0 address and amount when no reward exists', async () => {
      const reward = await contract.readReward(season, accounts[2])
      assert.strictEqual(reward.destination, ADDRESS_ZERO)
      assert.strictEqual(reward.amount, '0')
    })

    it('readReward should return entry when it exists', async () => {
      const reward = await contract.readReward(season, accounts[0])
      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '3')
    })
  })
})
