'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { promisify } = require('util')
const ThriveCoinRewardSeason = artifacts.require('ThriveCoinRewardSeason')

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinRewardSeason', () => {
  contract('season tests', (accounts) => {
    let contract

    const contractArgs = {
      defaultDestination: accounts[1],
      closeDate: Math.floor(Date.now() / 1000) + 43200,
      claimCloseDate: Math.floor(Date.now() / 1000) + 86400
    }

    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    beforeEach(async () => {
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
    })

    afterEach(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('should have an initial season once deployed', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 1)
      assert.strictEqual(seasonInfo.defaultDestination, contractArgs.defaultDestination)
      assert.strictEqual(+seasonInfo.closeDate, contractArgs.closeDate)
      assert.strictEqual(+seasonInfo.claimCloseDate, contractArgs.claimCloseDate)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('currentSeason should return active season', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      assert.strictEqual(+seasonIndex, 1)
    })

    it('readSeasonInfo should falsy values on property when it is not found', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(0)
      assert.strictEqual(+seasonIndex, 1)
      assert.strictEqual(seasonInfo.defaultDestination, ADDRESS_ZERO)
      assert.strictEqual(+seasonInfo.closeDate, 0)
      assert.strictEqual(+seasonInfo.claimCloseDate, 0)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('adding season should fail if block time is before claim close date', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const defaultDestination = accounts[1]
        const closeDate = Math.floor(Date.now() / 1000) + 43200
        const claimCloseDate = Math.floor(Date.now() / 1000) + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: previous season not fully closed'))
      }
    })

    it('adding season should fail if unclaimed funds are not sent', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86400 * 2], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(Date.now() / 1000) + 43200
        const claimCloseDate = Math.floor(Date.now() / 1000) + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: unclaimed funds not sent yet'))
      }
    })

    it('adding season should fail if claim close date is before close date', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86400 * 2], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(Date.now() / 1000) + 86400
        const claimCloseDate = Math.floor(Date.now() / 1000) + 43200
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: close date should be before claim close date'))
      }
    })

    it('adding season should fail if claim close date is same as close date', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86400 * 2], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(Date.now() / 1000) + 86400
        const claimCloseDate = Math.floor(Date.now() / 1000) + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: close date should be before claim close date'))
      }
    })

    it('season can be added if previous season is closed and unclaimed funds are sent', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86400 * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(Date.now() / 1000) + 43200
      const claimCloseDate = Math.floor(Date.now() / 1000) + 86400
      await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 2)
      assert.strictEqual(seasonInfo.defaultDestination, defaultDestination)
      assert.strictEqual(+seasonInfo.closeDate, closeDate)
      assert.strictEqual(+seasonInfo.claimCloseDate, claimCloseDate)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('season can be added if previous season is closed and had no unclaimed rewards', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [43201], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86400 * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(Date.now() / 1000) + 43200
      const claimCloseDate = Math.floor(Date.now() / 1000) + 86400
      await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 2)
      assert.strictEqual(seasonInfo.defaultDestination, defaultDestination)
      assert.strictEqual(+seasonInfo.closeDate, closeDate)
      assert.strictEqual(+seasonInfo.claimCloseDate, claimCloseDate)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('season can be added if previous season is closed and had no rewards', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86400 * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(Date.now() / 1000) + 43200
      const claimCloseDate = Math.floor(Date.now() / 1000) + 86400
      await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 2)
      assert.strictEqual(seasonInfo.defaultDestination, defaultDestination)
      assert.strictEqual(+seasonInfo.closeDate, closeDate)
      assert.strictEqual(+seasonInfo.claimCloseDate, claimCloseDate)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })
  })
})
