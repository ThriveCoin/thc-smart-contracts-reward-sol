'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { promisify } = require('util')
const ThriveCoinRewardSeason = artifacts.require('ThriveCoinRewardSeason')

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinRewardSeason', () => {
  contract('season tests', (accounts) => {
    const now = Date.now()
    let contract
    const contractArgs = {
      defaultDestination: accounts[1],
      closeDate: Math.floor(now / 1000) + 43200,
      claimCloseDate: Math.floor(now / 1000) + 86400
    }

    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    beforeEach(async () => {
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
    })

    afterEach(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('should fail deployment if default destination is zero address', async () => {
      try {
        contract = await ThriveCoinRewardSeason.new(
          ...Object.values({ ...contractArgs, defaultDestination: ADDRESS_ZERO }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: default destination cannot be zero address'))
      }
    })

    it('should fail deployment if close date is before current block timestamp', async () => {
      try {
        contract = await ThriveCoinRewardSeason.new(
          ...Object.values({ ...contractArgs, closeDate: Math.floor(now / 1000) - 43200 }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: close date already reached'))
      }
    })

    it('should fail deployment if claim close date is same as close date', async () => {
      try {
        contract = await ThriveCoinRewardSeason.new(
          ...Object.values({ ...contractArgs, claimCloseDate: Math.floor(now / 1000) + 43200 }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: close date should be before claim close date'))
      }
    })

    it('should fail deployment if claim close date is before close date', async () => {
      try {
        contract = await ThriveCoinRewardSeason.new(
          ...Object.values({ ...contractArgs, claimCloseDate: Math.floor(now / 1000) - 43200 }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: close date should be before claim close date'))
      }
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
        const closeDate = Math.floor(now / 1000) + 43200
        const claimCloseDate = Math.floor(now / 1000) + 86400
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

        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(now / 1000) + checkpoint + 43200
        const claimCloseDate = Math.floor(now / 1000) + checkpoint + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: unclaimed funds not sent yet'))
      }
    })

    it('adding season should fail if default destination is zero address', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = ADDRESS_ZERO
        const closeDate = Math.floor(now / 1000) + 43200
        const claimCloseDate = Math.floor(now / 1000) + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: default destination cannot be zero address'))
      }
    })

    it('adding season should fail if claim close date is before current timestamp', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(now / 1000) + 43200
        const claimCloseDate = Math.floor(now / 1000) + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: close date already reached'))
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

        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(now / 1000) + checkpoint + 86400
        const claimCloseDate = Math.floor(now / 1000) + checkpoint + 43200
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

        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(now / 1000) + checkpoint + 86400
        const claimCloseDate = Math.floor(now / 1000) + checkpoint + 86400
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

      const checkpoint = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(now / 1000) + checkpoint + 43200
      const claimCloseDate = Math.floor(now / 1000) + checkpoint + 86400
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

      const checkpoint1 = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint1], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      const checkpoint2 = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(now / 1000) + checkpoint1 + checkpoint2 + 43200
      const claimCloseDate = Math.floor(now / 1000) + checkpoint1 + checkpoint2 + 86400
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

      const checkpoint = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(now / 1000) + checkpoint + 43200
      const claimCloseDate = Math.floor(now / 1000) + checkpoint + 86400
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

    it('seasons are enumerable', async () => {
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const checkpoint = 86401
      for (let i = 1; i <= 3; i++) {
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        const defaultDestination = accounts[1]
        const closeDate = Math.floor(now / 1000) + checkpoint * i + 43200
        const claimCloseDate = Math.floor(now / 1000) + checkpoint * i + 86400
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
      }

      const seasonIndex = await contract.currentSeason()
      assert.strictEqual(+seasonIndex, 4)
      for (let i = 1; i <= 4; i++) {
        const season = await contract.readSeasonInfo(i)
        assert.strictEqual(season.defaultDestination, accounts[1])
      }
    })
  })
})
