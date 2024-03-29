'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { keccak256 } = require('@ethersproject/keccak256')
const { promisify } = require('util')
const ThriveCoinRewardSeasonIERC20 = artifacts.require('ThriveCoinRewardSeasonIERC20')
const DummyToken = artifacts.require('DummyToken')

describe('ThriveCoinRewardSeasonIERC20', () => {
  contract('reward tests', (accounts) => {
    const now = Date.now()
    const WRITER_ROLE = keccak256(Buffer.from('WRITER_ROLE', 'utf8'))

    let contract
    let erc20
    const contractArgs = {
      defaultDestination: accounts[3],
      closeDate: Math.floor(now / 1000) + 43200,
      claimCloseDate: Math.floor(now / 1000) + 86400
    }
    const seasonIndex = 1

    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    beforeEach(async () => {
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result

      erc20 = await DummyToken.new(
        ...Object.values({ name_: 'MyToken', symbol_: 'MTK' }),
        { from: accounts[0] }
      )

      contract = await ThriveCoinRewardSeasonIERC20.new(
        ...Object.values({ ...contractArgs, _tokenAddress: erc20.address }),
        { from: accounts[0] }
      )

      await contract.grantRole(WRITER_ROLE, accounts[1], { from: accounts[0] })

      await erc20.mint(contract.address, '100', { from: accounts[0] })
    })

    afterEach(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('claim reward should send IERC20 funds from contract to destination', async () => {
      const accBalanceBefore = +(await erc20.balanceOf(accounts[1]))
      const contractBalanceBefore = +(await erc20.balanceOf(contract.address))

      assert.strictEqual(accBalanceBefore, 0)
      assert.strictEqual(contractBalanceBefore, 100)

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

      const accBalanceAfter = +(await erc20.balanceOf(accounts[1]))
      const contractBalanceAfter = +(await erc20.balanceOf(contract.address))

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonInfo.totalRewards, 5)
      assert.strictEqual(+seasonInfo.claimedRewards, 5)

      reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, true)

      assert.strictEqual(accBalanceAfter, 5)
      assert.strictEqual(contractBalanceAfter, 95)
    })

    it('send unclaimed funds should send IERC20 tokens to season default destination', async () => {
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)

      const accBalanceBefore = +(await erc20.balanceOf(accounts[1]))
      const defaultDestBalanceBefore = +(await erc20.balanceOf(seasonInfo.defaultDestination))
      const contractBalanceBefore = +(await erc20.balanceOf(contract.address))

      assert.strictEqual(accBalanceBefore, 0)
      assert.strictEqual(defaultDestBalanceBefore, 0)
      assert.strictEqual(contractBalanceBefore, 100)

      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
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

      const accBalanceAfter = +(await erc20.balanceOf(accounts[1]))
      const defaultDestBalanceAfter = +(await erc20.balanceOf(seasonInfo.defaultDestination))
      const contractBalanceAfter = +(await erc20.balanceOf(contract.address))

      assert.strictEqual(accBalanceAfter, 5)
      assert.strictEqual(defaultDestBalanceAfter, 3)
      assert.strictEqual(contractBalanceAfter, 92)
    })

    it('remaining erc20 cannot be withdrawn during active season', async () => {
      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      try {
        await contract.withdrawERC20(accounts[4], 92, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: previous season not fully closed'))
      }

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      try {
        await contract.withdrawERC20(accounts[4], 92, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: previous season not fully closed'))
      }
    })

    it('remaining erc20 cannot be withdrawn before unclaimed funds are sent', async () => {
      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      try {
        await contract.withdrawERC20(accounts[4], 92, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: unclaimed funds not sent yet'))
      }
    })

    it('remaining erc20 can be withdrawn after sending unclaimed funds', async () => {
      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const contractBalanceBefore = +(await erc20.balanceOf(contract.address))
      assert.strictEqual(contractBalanceBefore, 92)

      const wdAccBalBefore = +(await erc20.balanceOf(accounts[4]))
      await contract.withdrawERC20(accounts[4], 92, { from: accounts[0] })

      const wdAccBalAfter = +(await erc20.balanceOf(accounts[4]))
      const contractBalanceAfter = +(await erc20.balanceOf(contract.address))

      assert.strictEqual(wdAccBalAfter - wdAccBalBefore, 92)
      assert.strictEqual(contractBalanceAfter, 0)
    })

    it('only admin can withdraw remaining funds', async () => {
      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      try {
        await contract.withdrawERC20(accounts[4], 92, { from: accounts[4] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: must have admin role'))
      }

      const contractBalanceBefore = +(await erc20.balanceOf(contract.address))
      assert.strictEqual(contractBalanceBefore, 92)

      const wdAccBalBefore = +(await erc20.balanceOf(accounts[4]))
      await contract.withdrawERC20(accounts[4], 92, { from: accounts[0] })

      const wdAccBalAfter = +(await erc20.balanceOf(accounts[4]))
      const contractBalanceAfter = +(await erc20.balanceOf(contract.address))

      assert.strictEqual(wdAccBalAfter - wdAccBalBefore, 92)
      assert.strictEqual(contractBalanceAfter, 0)
    })

    it('less than remaining erc20 can be withdrawn after sending unclaimed funds', async () => {
      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const contractBalanceBefore = +(await erc20.balanceOf(contract.address))
      assert.strictEqual(contractBalanceBefore, 92)

      const wdAccBalBefore = +(await erc20.balanceOf(accounts[4]))
      await contract.withdrawERC20(accounts[4], 20, { from: accounts[0] })

      const wdAccBalAfter = +(await erc20.balanceOf(accounts[4]))
      const contractBalanceAfter = +(await erc20.balanceOf(contract.address))

      assert.strictEqual(wdAccBalAfter - wdAccBalBefore, 20)
      assert.strictEqual(contractBalanceAfter, 72)
    })

    it('cannot withdraw more than remaining funds after sending unclaimed funds', async () => {
      let userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[0] })

      userReward = { owner: accounts[1], destination: accounts[1], amount: '3' }
      await contract.addReward(userReward, { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(accounts[0], { from: accounts[1] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const contractBalanceBefore = +(await erc20.balanceOf(contract.address))
      assert.strictEqual(contractBalanceBefore, 92)

      try {
        await contract.withdrawERC20(accounts[4], 100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeason: not enough funds available'))
      }
    })
  })
})
