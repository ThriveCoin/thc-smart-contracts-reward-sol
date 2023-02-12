'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { keccak256 } = require('@ethersproject/keccak256')
const { promisify } = require('util')
const ThriveCoinRewardSeasonIERC20GasRefundable = artifacts.require('ThriveCoinRewardSeasonIERC20GasRefundable')
const DummyToken = artifacts.require('DummyToken')

describe.only('ThriveCoinRewardSeasonIERC20GasRefundable', () => {
  contract('reward tests', (accounts) => {
    const now = Date.now()
    const WRITER_ROLE = keccak256(Buffer.from('WRITER_ROLE', 'utf8'))

    let contract
    let erc20
    const contractArgs = {
      defaultDestination: accounts[3],
      closeDate: Math.floor(now / 1000) + 43200,
      claimCloseDate: Math.floor(now / 1000) + 86400,
      _fixedGasFee: '31602'
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

      contract = await ThriveCoinRewardSeasonIERC20GasRefundable.new(
        ...Object.values({ ...contractArgs, _tokenAddress: erc20.address }),
        { from: accounts[0] }
      )

      await contract.grantRole(WRITER_ROLE, accounts[1], { from: accounts[0] })

      await web3.eth.sendTransaction({
        to: contract.address,
        value: web3.utils.toWei('1', 'ether').toString(),
        from: accounts[0]
      })
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
  })
})
