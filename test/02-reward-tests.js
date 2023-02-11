'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { promisify } = require('util')
const ThriveCoinRewardSeason = artifacts.require('ThriveCoinRewardSeason')

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinRewardSeason', () => {
  contract('reward tests', (accounts) => {
    const now = Date.now()
    let contract
    const contractArgs = {
      defaultDestination: accounts[1],
      closeDate: Math.floor(now / 1000) + 43200,
      claimCloseDate: Math.floor(now / 1000) + 86400
    }
    const seasonIndex = 1

    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    beforeEach(async () => {
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
      contract = await ThriveCoinRewardSeason.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
    })

    afterEach(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('readReward should return 0 address and amount when no reward exists', async () => {
      let reward = await contract.readReward(seasonIndex, accounts[2])
      assert.strictEqual(reward.destination, ADDRESS_ZERO)
      assert.strictEqual(reward.amount, '0')

      reward = await contract.readReward(2, accounts[0])
      assert.strictEqual(reward.destination, ADDRESS_ZERO)
      assert.strictEqual(reward.amount, '0')
    })

    it('readReward should return entry when it exists', async () => {
      const userReward = { owner: accounts[0], destination: accounts[0], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      const reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '3')
    })

    it('addReward should fail when season is closed', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })
        await contract.addReward(userReward, { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: season is closed'))
      }
    })

    it('addReward should store new reward', async () => {
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.rewardCount, 0)

      const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })
      const reward = await contract.readReward(seasonIndex, accounts[0])
      const rewardByIndex = await contract.readRewardByIndex(seasonIndex, 0)

      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)

      assert.strictEqual(rewardByIndex.reward.destination, accounts[1])
      assert.strictEqual(rewardByIndex.reward.amount, '5')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.rewardCount, 1)
    })

    it('addReward should override previous reward if it exists', async () => {
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.rewardCount, 0)

      let userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })
      let reward = await contract.readReward(seasonIndex, accounts[0])

      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)

      let rewardByIndex = await contract.readRewardByIndex(seasonIndex, 0)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[0])
      assert.strictEqual(rewardByIndex.reward.amount, '5')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.rewardCount, 1)

      userReward = { owner: accounts[0], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })
      reward = await contract.readReward(seasonIndex, accounts[0])

      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '3')
      assert.strictEqual(reward.claimed, false)

      rewardByIndex = await contract.readRewardByIndex(seasonIndex, 0)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[1])
      assert.strictEqual(rewardByIndex.reward.amount, '3')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, +3)
      assert.strictEqual(+seasonInfo.rewardCount, 1)
    })

    it('addRewardBatch should fail when season is closed', async () => {
      try {
        const userRewards = [
          { owner: accounts[0], destination: accounts[0], amount: '3' },
          { owner: accounts[1], destination: accounts[2], amount: '4' }
        ]
        await contract.addRewardBatch(userRewards, { from: accounts[0] })

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })
        await contract.addRewardBatch(userRewards, { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: season is closed'))
      }
    })

    it('addRewardBatch should store multiple rewards', async () => {
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.rewardCount, 0)

      const userRewards = [
        { owner: accounts[0], destination: accounts[0], amount: '3' },
        { owner: accounts[1], destination: accounts[2], amount: '4' }
      ]
      await contract.addRewardBatch(userRewards, { from: accounts[0] })

      let reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '3')
      assert.strictEqual(reward.claimed, false)

      let rewardByIndex = await contract.readRewardByIndex(seasonIndex, 0)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[0])
      assert.strictEqual(rewardByIndex.reward.amount, '3')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      reward = await contract.readReward(seasonIndex, accounts[1])
      assert.strictEqual(reward.destination, accounts[2])
      assert.strictEqual(reward.amount, '4')
      assert.strictEqual(reward.claimed, false)

      rewardByIndex = await contract.readRewardByIndex(seasonIndex, 1)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[2])
      assert.strictEqual(rewardByIndex.reward.amount, '4')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 7)
      assert.strictEqual(+seasonInfo.rewardCount, 2)
    })

    it('addRewardBatch should override existing rewards', async () => {
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.rewardCount, 0)

      let userRewards = [
        { owner: accounts[0], destination: accounts[0], amount: '3' },
        { owner: accounts[1], destination: accounts[2], amount: '4' }
      ]
      await contract.addRewardBatch(userRewards, { from: accounts[0] })

      let reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '3')
      assert.strictEqual(reward.claimed, false)

      let rewardByIndex = await contract.readRewardByIndex(seasonIndex, 0)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[0])
      assert.strictEqual(rewardByIndex.reward.amount, '3')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      reward = await contract.readReward(seasonIndex, accounts[1])
      assert.strictEqual(reward.destination, accounts[2])
      assert.strictEqual(reward.amount, '4')
      assert.strictEqual(reward.claimed, false)

      rewardByIndex = await contract.readRewardByIndex(seasonIndex, 1)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[2])
      assert.strictEqual(rewardByIndex.reward.amount, '4')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 7)
      assert.strictEqual(+seasonInfo.rewardCount, 2)

      userRewards = [
        { owner: accounts[0], destination: accounts[1], amount: '6' },
        { owner: accounts[2], destination: accounts[2], amount: '5' }
      ]
      await contract.addRewardBatch(userRewards, { from: accounts[0] })

      reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '6')
      assert.strictEqual(reward.claimed, false)

      rewardByIndex = await contract.readRewardByIndex(seasonIndex, 0)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[1])
      assert.strictEqual(rewardByIndex.reward.amount, '6')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      reward = await contract.readReward(seasonIndex, accounts[1])
      assert.strictEqual(reward.destination, accounts[2])
      assert.strictEqual(reward.amount, '4')
      assert.strictEqual(reward.claimed, false)

      rewardByIndex = await contract.readRewardByIndex(seasonIndex, 1)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[2])
      assert.strictEqual(rewardByIndex.reward.amount, '4')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      reward = await contract.readReward(seasonIndex, accounts[2])
      assert.strictEqual(reward.destination, accounts[2])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)

      rewardByIndex = await contract.readRewardByIndex(seasonIndex, 2)
      assert.strictEqual(rewardByIndex.reward.destination, accounts[2])
      assert.strictEqual(rewardByIndex.reward.amount, '5')
      assert.strictEqual(rewardByIndex.reward.claimed, false)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 15)
      assert.strictEqual(+seasonInfo.rewardCount, 3)
    })

    it('claimReward should fail when season is not closed', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })
        await contract.claimReward(accounts[0], { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: season is not closed yet'))
      }
    })

    it('claimReward should fail when claim deadline is reached', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const checkpoint = 86401
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(accounts[0], { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: deadline for claiming reached'))
      }
    })

    it('claimReward should fail when reward is not found', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(accounts[1], { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: reward not found'))
      }
    })

    it('claimReward should fail when reward is already claimed', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        let seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 5)
        assert.strictEqual(+seasonInfo.claimedRewards, 0)

        let reward = await contract.readReward(seasonIndex, accounts[0])
        assert.strictEqual(reward.destination, accounts[1])
        assert.strictEqual(reward.amount, '5')
        assert.strictEqual(reward.claimed, false)

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(accounts[0], { from: accounts[0] })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 5)
        assert.strictEqual(+seasonInfo.claimedRewards, 5)

        reward = await contract.readReward(seasonIndex, accounts[0])
        assert.strictEqual(reward.destination, accounts[1])
        assert.strictEqual(reward.amount, '5')
        assert.strictEqual(reward.claimed, true)

        await contract.claimReward(accounts[0], { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: reward is already claimed'))
      }
    })

    it('claimReward should fail when neither owner or destination is the caller', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(accounts[0], { from: accounts[2] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: caller is not allowed to claim the reward'))
      }
    })

    it('once reward is claimed it should be marked as claimed and claimed funds on season should be updated', async () => {
      const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)

      let reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[0] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 5)

      reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, true)
    })

    it('also destination amount can claim reward', async () => {
      const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)

      let reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 5)

      reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, true)
    })

    it('unclaimed funds cannot be sent before season is closed', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        const seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 5)
        assert.strictEqual(+seasonInfo.claimedRewards, 0)

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: deadline for claiming not reached'))
      }
    })

    it('send unclaimed funds should fail when there are no funds at all', async () => {
      try {
        const seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 0)
        assert.strictEqual(+seasonInfo.claimedRewards, 0)

        const checkpoint = 86401
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: no funds available'))
      }
    })

    it('send unclaimed funds should fail when there are no unclaimed funds', async () => {
      try {
        const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        let seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 5)
        assert.strictEqual(+seasonInfo.claimedRewards, 0)

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(accounts[0], { from: accounts[1] })

        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 5)
        assert.strictEqual(+seasonInfo.claimedRewards, 5)

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: no funds available'))
      }
    })

    it('unclaimed funds cannot be sent twice', async () => {
      try {
        let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
        await contract.addReward(userReward, { from: accounts[0] })

        userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
        await contract.addReward(userReward, { from: accounts[0] })

        let seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 8)
        assert.strictEqual(+seasonInfo.claimedRewards, 0)
        assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(accounts[0], { from: accounts[1] })

        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 8)
        assert.strictEqual(+seasonInfo.claimedRewards, 5)
        assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(+seasonInfo.totalRewards, 8)
        assert.strictEqual(+seasonInfo.claimedRewards, 5)
        assert.strictEqual(seasonInfo.unclaimedFundsSent, true)

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: funds already sent'))
      }
    })

    it('once unclaimed funds are sent season should mark flag indicating the action', async () => {
      const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

      const checkpoint = 86401
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, true)
    })

    it('rewards can be iterated', async () => {
      const userRewardsSeason1 = [
        { owner: accounts[0], destination: accounts[0], amount: '3' },
        { owner: accounts[1], destination: accounts[2], amount: '4' }
      ]
      await contract.addRewardBatch(userRewardsSeason1, { from: accounts[0] })

      const season1 = await contract.readSeasonInfo(1)
      for (let i = 0; i < +season1.rewardCount; i++) {
        const rewardByIndex = await contract.readRewardByIndex(1, i)
        assert.strictEqual(rewardByIndex.owner, userRewardsSeason1[i].owner)
        assert.strictEqual(rewardByIndex.reward.destination, userRewardsSeason1[i].destination)
        assert.strictEqual(rewardByIndex.reward.amount, userRewardsSeason1[i].amount)
      }

      const checkpoint = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const defaultDestination = accounts[1]
      const closeDate = Math.floor(now / 1000) + checkpoint + 43200
      const claimCloseDate = Math.floor(now / 1000) + checkpoint + 86400
      await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })

      const userRewardsSeason2 = [
        { owner: accounts[3], destination: accounts[3], amount: '6' },
        { owner: accounts[5], destination: accounts[4], amount: '7' }
      ]
      await contract.addRewardBatch(userRewardsSeason2, { from: accounts[0] })

      const season2 = await contract.readSeasonInfo(2)
      for (let i = 0; i < +season2.rewardCount; i++) {
        const rewardByIndex = await contract.readRewardByIndex(2, i)
        assert.strictEqual(rewardByIndex.owner, userRewardsSeason2[i].owner)
        assert.strictEqual(rewardByIndex.reward.destination, userRewardsSeason2[i].destination)
        assert.strictEqual(rewardByIndex.reward.amount, userRewardsSeason2[i].amount)
      }
    })
  })
})
