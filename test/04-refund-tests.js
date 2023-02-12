'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { keccak256 } = require('@ethersproject/keccak256')
const { promisify } = require('util')
const ThriveCoinRewardSeasonGasRefundable = artifacts.require('ThriveCoinRewardSeasonGasRefundable')

describe('ThriveCoinRewardSeasonGasRefundable', () => {
  contract('reward tests', (accounts) => {
    const now = Date.now()
    const WRITER_ROLE = keccak256(Buffer.from('WRITER_ROLE', 'utf8'))

    let contract
    const contractArgs = {
      defaultDestination: accounts[1],
      closeDate: Math.floor(now / 1000) + 43200,
      claimCloseDate: Math.floor(now / 1000) + 86400,
      _fixedGasFee: '31602'
    }
    const seasonIndex = 1

    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    beforeEach(async () => {
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
      contract = await ThriveCoinRewardSeasonGasRefundable.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(WRITER_ROLE, accounts[1], { from: accounts[0] })
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result

      await web3.eth.sendTransaction({
        to: contract.address,
        value: web3.utils.toWei('1', 'ether').toString(),
        from: accounts[0]
      })
    })

    afterEach(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('addReward should store new reward', async () => {
      const accBalanceBefore = +web3.utils.fromWei(await web3.eth.getBalance(accounts[1]))
      const contractBalanceBefore = +web3.utils.fromWei(await web3.eth.getBalance(contract.address))

      const userReward = { owner: accounts[0], destination: accounts[1], amount: '5' }
      await contract.addReward(userReward, { from: accounts[1] })

      const accBalanceAfter = +web3.utils.fromWei(await web3.eth.getBalance(accounts[1]))
      const contractBalanceAfter = +web3.utils.fromWei(await web3.eth.getBalance(contract.address))

      const reward = await contract.readReward(seasonIndex, accounts[0])

      assert.strictEqual(reward.destination, accounts[1])
      assert.strictEqual(reward.amount, '5')
      assert.strictEqual(reward.claimed, false)

      assert.ok(contractBalanceBefore > contractBalanceAfter)
      assert.ok(Math.abs(accBalanceAfter - accBalanceBefore) <= 0.0001)
    })

    it('addRewardBatch should store multiple rewards', async () => {
      const accBalanceBefore = +web3.utils.fromWei(await web3.eth.getBalance(accounts[1]))
      const contractBalanceBefore = +web3.utils.fromWei(await web3.eth.getBalance(contract.address))

      const userRewards = [
        { owner: accounts[0], destination: accounts[0], amount: '3' },
        { owner: accounts[1], destination: accounts[2], amount: '4' }
      ]
      await contract.addRewardBatch(userRewards, { from: accounts[1] })

      const accBalanceAfter = +web3.utils.fromWei(await web3.eth.getBalance(accounts[1]))
      const contractBalanceAfter = +web3.utils.fromWei(await web3.eth.getBalance(contract.address))

      let reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward.destination, accounts[0])
      assert.strictEqual(reward.amount, '3')
      assert.strictEqual(reward.claimed, false)

      reward = await contract.readReward(seasonIndex, accounts[1])
      assert.strictEqual(reward.destination, accounts[2])
      assert.strictEqual(reward.amount, '4')
      assert.strictEqual(reward.claimed, false)

      assert.ok(contractBalanceBefore > contractBalanceAfter)
      assert.ok(Math.abs(accBalanceAfter - accBalanceBefore) <= 0.0001)
    })
  })
})
