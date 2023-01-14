'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { keccak256 } = require('@ethersproject/keccak256')
const { promisify } = require('util')
const ThriveCoinRewardSeason = artifacts.require('ThriveCoinRewardSeason')

describe('ThriveCoinRewardSeason', () => {
  contract('role tests', (accounts) => {
    let contract = null
    const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const WRITER_ROLE = keccak256(Buffer.from('WRITER_ROLE', 'utf8'))
    const DUMMY_ROLE = keccak256(Buffer.from('DUMMY_ROLE', 'utf8'))
    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    before(async () => {
      contract = await ThriveCoinRewardSeason.deployed()

      await contract.grantRole(WRITER_ROLE, accounts[1], { from: accounts[0] })
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
    })

    after(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('hasRole should return true when user has role', async () => {
      const res = await contract.hasRole(ADMIN_ROLE, accounts[0])
      assert.strictEqual(res, true)
    })

    it('hasRole should return false when user does not have role', async () => {
      const res = await contract.hasRole(WRITER_ROLE, accounts[2])
      assert.strictEqual(res, false)
    })

    it('deployer should have all three roles by default', async () => {
      const res = await Promise.all([
        contract.hasRole.call(ADMIN_ROLE, accounts[0]),
        contract.hasRole.call(WRITER_ROLE, accounts[0])
      ])

      assert.strictEqual(res.every(r => r === true), true)
    })

    it('getRoleAdmin should return admin role for all three roles', async () => {
      const res = await Promise.all([
        contract.getRoleAdmin.call(ADMIN_ROLE),
        contract.getRoleAdmin.call(WRITER_ROLE)
      ])

      assert.strictEqual(res.every(r => r === ADMIN_ROLE), true)
    })

    it('only admin role can grant roles', async () => {
      await contract.grantRole(WRITER_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(WRITER_ROLE, accounts[3])
      assert.strictEqual(hasRole, true)

      try {
        await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('also admin role can be granted', async () => {
      await contract.grantRole(ADMIN_ROLE, accounts[4], { from: accounts[0] })
      const hasRole = await contract.hasRole(ADMIN_ROLE, accounts[4])
      assert.strictEqual(hasRole, true)
    })

    it('grantRole should emit RoleGranted event', async () => {
      const res = await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('only admin role can revoke role', async () => {
      await contract.revokeRole(WRITER_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(WRITER_ROLE, accounts[3])
      assert.strictEqual(hasRole, false)

      try {
        await contract.revokeRole(DUMMY_ROLE, accounts[3], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('revokeRole should emit RoleRevoked event', async () => {
      const res = await contract.revokeRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('account can renounce their role', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRoleBefore = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRoleBefore, true)

      await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[3] })
      const hasRoleAfter = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRoleAfter, false)
    })

    it('renounce should emit RoleRevoked event', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const res = await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[3] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[3])
    })

    it('account can renounce only their role', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })

      try {
        await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('AccessControl: can only renounce roles for self'),
          true
        )
      }
    })

    it('grantRole could work for any role', async () => {
      const res = await contract.grantRole(DUMMY_ROLE, accounts[4], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[4])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('role members must be enumerable', async () => {
      const minters = [accounts[0], accounts[1]]
      const length = await contract.getRoleMemberCount.call(WRITER_ROLE)

      for (let index = 0; index < length; index++) {
        const minter = await contract.getRoleMember(WRITER_ROLE, index)
        assert.strictEqual(minter, minters[index])
      }
    })

    it('addReward can be done only by WRITER_ROLE', async () => {
      const userReward = { owner: accounts[0], destination: accounts[0], amount: '5' }

      await contract.addReward(userReward, { from: accounts[0] })
      await contract.addReward(userReward, { from: accounts[1] })

      try {
        await contract.addReward(userReward, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinRewardSeason: must have writer role'),
          true
        )
      }
    })

    it('addRewardBatch can be done only by WRITER_ROLE', async () => {
      const userRewards = [
        { owner: accounts[0], destination: accounts[0], amount: '3' },
        { owner: accounts[1], destination: accounts[2], amount: '4' }
      ]

      await contract.addRewardBatch(userRewards, { from: accounts[0] })
      await contract.addRewardBatch(userRewards, { from: accounts[1] })

      try {
        await contract.addRewardBatch(userRewards, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinRewardSeason: must have writer role'),
          true
        )
      }
    })

    it('sendUnclaimedFunds - only admin can send unclaimed funds', async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86500], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      try {
        await contract.sendUnclaimedFunds({ from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinRewardSeason: must have admin role'),
          true
        )
      }

      await contract.sendUnclaimedFunds({ from: accounts[0] })
    })

    it('addSeason - only admin can add new season', async () => {
      const defaultDestination = accounts[0]
      const closeDate = Math.floor(Date.now() / 1000) + 286400
      const claimCloseDate = Math.floor(Date.now() / 1000) + 386400

      try {
        await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinRewardSeason: must have admin role'),
          true
        )
      }

      await contract.addSeason(defaultDestination, closeDate, claimCloseDate, { from: accounts[0] })
    })
  })
})
