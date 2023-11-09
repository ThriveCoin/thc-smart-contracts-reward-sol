'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { promisify } = require('util')
const { web3Utils: { buildMerkleTree } } = require('@thrivecoin/web3-utils')
const DummyToken = artifacts.require('DummyToken')
const ThriveCoinRewardSeasonMerkleIERC20 = artifacts.require('ThriveCoinRewardSeasonMerkleIERC20')

describe('ThriveCoinRewardSeasonMerkleIERC20', () => {
  contract('contract tests', (accounts) => {
    const now = Date.now()

    const records = [
      {
        addr: accounts[0],
        amount: web3.eth.abi.encodeParameter(
          'uint256',
          '10000000000000000000000000'
        )
      },
      {
        addr: accounts[1],
        amount: web3.eth.abi.encodeParameter(
          'uint256',
          '20000000000000000000000000'
        )
      },
      {
        addr: accounts[2],
        amount: web3.eth.abi.encodeParameter(
          'uint256',
          '30000000000000000000000000'
        )
      }
    ]

    const selector = (x) => Buffer.concat([
      Buffer.from(x.addr.replace('0x', ''), 'hex'),
      Buffer.from(x.amount.replace('0x', ''), 'hex')
    ])
    const tree = buildMerkleTree(web3, records, selector)

    let erc20
    let contract
    const contractArgs = {
      defaultDestination: accounts[1],
      merkleRoot: tree.getHexRoot(),
      totalRewards: '60000000000000000000000000',
      claimCloseDate: Math.floor(now / 1000) + 86400
    }
    const seasonIndex = '1'

    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    beforeEach(async () => {
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result

      erc20 = await DummyToken.new(
        ...Object.values({ name_: 'MyToken', symbol_: 'MTK' }),
        { from: accounts[0] }
      )

      contract = await ThriveCoinRewardSeasonMerkleIERC20.new(
        ...Object.values({ ...contractArgs, _tokenAddress: erc20.address }),
        { from: accounts[0] }
      )

      await erc20.mint(contract.address, '60000000000000000000000000', { from: accounts[0] })
    })

    afterEach(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('erc20 contract access is publicly readable', async () => {
      const res = await contract.getTokenAddress()
      assert.strictEqual(res, erc20.address)
    })

    it('claim reward should send IERC20 funds from contract to destination', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[1]))
      )
      const amount = '20000000000000000000000000'

      const accBalanceBefore = await erc20.balanceOf(accounts[1])
      const contractBalanceBefore = await erc20.balanceOf(contract.address)

      assert.strictEqual(accBalanceBefore.toString(), '0')
      assert.strictEqual(contractBalanceBefore.toString(), '60000000000000000000000000')

      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards.toString(), '0')

      let reward = await contract.readReward(seasonIndex, accounts[1])
      assert.strictEqual(reward, false)

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[1] })

      const accBalanceAfter = await erc20.balanceOf(accounts[1])
      const contractBalanceAfter = await erc20.balanceOf(contract.address)

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards.toString(), '20000000000000000000000000')

      reward = await contract.readReward(seasonIndex, accounts[1])
      assert.strictEqual(reward, true)

      assert.strictEqual(accBalanceAfter.toString(), '20000000000000000000000000')
      assert.strictEqual(contractBalanceAfter.toString(), '40000000000000000000000000')
    })

    it('send unclaimed funds should send IERC20 tokens to season default destination', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)

      const accBalanceBefore = await erc20.balanceOf(accounts[0])
      const defaultDestBalanceBefore = await erc20.balanceOf(seasonInfo.defaultDestination)
      const contractBalanceBefore = await erc20.balanceOf(contract.address)

      assert.strictEqual(accBalanceBefore.toString(), '0')
      assert.strictEqual(defaultDestBalanceBefore.toString(), '0')
      assert.strictEqual(contractBalanceBefore.toString(), '80000000000000000000000000')

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards.toString(), '0')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards.toString(), '10000000000000000000000000')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards.toString(), '10000000000000000000000000')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, true)

      const accBalanceAfter = await erc20.balanceOf(accounts[0])
      const defaultDestBalanceAfter = await erc20.balanceOf(seasonInfo.defaultDestination)
      const contractBalanceAfter = await erc20.balanceOf(contract.address)

      assert.strictEqual(accBalanceAfter.toString(), '10000000000000000000000000')
      assert.strictEqual(defaultDestBalanceAfter.toString(), '50000000000000000000000000')
      assert.strictEqual(contractBalanceAfter.toString(), '20000000000000000000000000')
    })

    it('remaining erc20 cannot be withdrawn during active season', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      try {
        await contract.withdrawERC20(accounts[4], '20000000000000000000000000', { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkleIERC20: previous season not fully closed'))
      }

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      try {
        await contract.withdrawERC20(accounts[4], '20000000000000000000000000', { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkleIERC20: previous season not fully closed'))
      }
    })

    it('remaining erc20 cannot be withdrawn before unclaimed funds are sent', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      try {
        await contract.withdrawERC20(accounts[4], '20000000000000000000000000', { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkleIERC20: unclaimed funds not sent yet'))
      }
    })

    it('remaining erc20 can be withdrawn after sending unclaimed funds', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const contractBalanceBefore = await erc20.balanceOf(contract.address)
      assert.strictEqual(contractBalanceBefore.toString(), '20000000000000000000000000')

      const wdAccBalBefore = await erc20.balanceOf(accounts[4])
      await contract.withdrawERC20(accounts[4], '20000000000000000000000000', { from: accounts[0] })

      const wdAccBalAfter = await erc20.balanceOf(accounts[4])
      const contractBalanceAfter = await erc20.balanceOf(contract.address)
      const claimedAccBal = await erc20.balanceOf(accounts[0])
      const defaultDestBal = await erc20.balanceOf(accounts[1])

      assert.strictEqual(wdAccBalBefore.toString(), '0')
      assert.strictEqual(wdAccBalAfter.toString(), '20000000000000000000000000')
      assert.strictEqual(contractBalanceAfter.toString(), '0')
      assert.strictEqual(claimedAccBal.toString(), '10000000000000000000000000')
      assert.strictEqual(defaultDestBal.toString(), '50000000000000000000000000')
    })

    it('only admin can withdraw remaining funds', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      try {
        await contract.withdrawERC20(accounts[4], '20000000000000000000000000', { from: accounts[4] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: must have admin role'))
      }

      const contractBalanceBefore = await erc20.balanceOf(contract.address)
      assert.strictEqual(contractBalanceBefore.toString(), '20000000000000000000000000')

      const wdAccBalBefore = await erc20.balanceOf(accounts[4])
      await contract.withdrawERC20(accounts[4], '20000000000000000000000000', { from: accounts[0] })

      const wdAccBalAfter = await erc20.balanceOf(accounts[4])
      const contractBalanceAfter = await erc20.balanceOf(contract.address)

      assert.strictEqual(wdAccBalBefore.toString(), '0')
      assert.strictEqual(wdAccBalAfter.toString(), '20000000000000000000000000')
      assert.strictEqual(contractBalanceAfter.toString(), '0')
    })

    it('less than remaining erc20 can be withdrawn after sending unclaimed funds', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const contractBalanceBefore = await erc20.balanceOf(contract.address)
      assert.strictEqual(contractBalanceBefore.toString(), '20000000000000000000000000')

      const wdAccBalBefore = await erc20.balanceOf(accounts[4])
      await contract.withdrawERC20(accounts[4], '10000000000000000000000000', { from: accounts[0] })

      const wdAccBalAfter = await erc20.balanceOf(accounts[4])
      const contractBalanceAfter = await erc20.balanceOf(contract.address)

      assert.strictEqual(wdAccBalBefore.toString(), '0')
      assert.strictEqual(wdAccBalAfter.toString(), '10000000000000000000000000')
      assert.strictEqual(contractBalanceAfter.toString(), '10000000000000000000000000')
    })

    it('cannot withdraw more than remaining funds after sending unclaimed funds', async () => {
      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const contractBalanceBefore = await erc20.balanceOf(contract.address)
      assert.strictEqual(contractBalanceBefore.toString(), '20000000000000000000000000')

      try {
        await contract.withdrawERC20(accounts[4], '30000000000000000000000000', { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkleIERC20: not enough funds available'))
      }
    })

    it('remaining funds can be withdrawn after all rewards are sent as well', async () => {
      await erc20.mint(contract.address, '20000000000000000000000000', { from: accounts[0] })

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const proofs = [
        tree.getHexProof(web3.utils.keccak256(selector(records[0]))),
        tree.getHexProof(web3.utils.keccak256(selector(records[1]))),
        tree.getHexProof(web3.utils.keccak256(selector(records[2])))
      ]
      const amounts = [
        '10000000000000000000000000',
        '20000000000000000000000000',
        '30000000000000000000000000'
      ]

      await contract.claimReward(amounts[0], proofs[0], { from: accounts[0] })
      await contract.claimReward(amounts[1], proofs[1], { from: accounts[1] })
      await contract.claimReward(amounts[2], proofs[2], { from: accounts[2] })

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const contractBalanceBefore = await erc20.balanceOf(contract.address)
      assert.strictEqual(contractBalanceBefore.toString(), '20000000000000000000000000')

      const wdAccBalBefore = await erc20.balanceOf(accounts[4])
      await contract.withdrawERC20(accounts[4], '10000000000000000000000000', { from: accounts[0] })

      const wdAccBalAfter = await erc20.balanceOf(accounts[4])
      const contractBalanceAfter = await erc20.balanceOf(contract.address)

      assert.strictEqual(wdAccBalBefore.toString(), '0')
      assert.strictEqual(wdAccBalAfter.toString(), '10000000000000000000000000')
      assert.strictEqual(contractBalanceAfter.toString(), '10000000000000000000000000')
    })
  })
})
