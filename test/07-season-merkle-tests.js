'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { promisify } = require('util')
const { web3Utils: { buildMerkleTree } } = require('@thrivecoin/web3-utils')
const ThriveCoinRewardSeasonMerkle = artifacts.require('ThriveCoinRewardSeasonMerkle')

describe('ThriveCoinRewardSeasonMerkle', () => {
  contract('contract tests', (accounts) => {
    const now = Date.now()
    const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
    const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const DUMMY_ROLE = web3.utils.keccak256(Buffer.from('DUMMY_ROLE', 'utf8'))

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

    let contract
    const contractArgs = {
      defaultDestination: accounts[1],
      merkleRoot: tree.getHexRoot(),
      totalRewards: '60000000000000000000000000',
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
        contract = await ThriveCoinRewardSeasonMerkle.new(
          ...Object.values({ ...contractArgs, defaultDestination: ADDRESS_ZERO }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: default destination cannot be zero address'))
      }
    })

    it('should fail deployment if total rewards is not greater than zero', async () => {
      try {
        contract = await ThriveCoinRewardSeasonMerkle.new(
          ...Object.values({ ...contractArgs, totalRewards: '0' }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: total rewards should be greater than zero'))
      }
    })

    it('should fail deployment if close date is before current block timestamp', async () => {
      try {
        contract = await ThriveCoinRewardSeasonMerkle.new(
          ...Object.values({ ...contractArgs, claimCloseDate: Math.floor(now / 1000) - 43200 }),
          { from: accounts[0] }
        )
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: claim close date already reached'))
      }
    })

    it('should have an initial season once deployed', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 1)
      assert.strictEqual(seasonInfo.defaultDestination, contractArgs.defaultDestination)
      assert.strictEqual(seasonInfo.merkleRoot, contractArgs.merkleRoot)
      assert.strictEqual(+seasonInfo.claimCloseDate, contractArgs.claimCloseDate)
      assert.strictEqual(seasonInfo.totalRewards, contractArgs.totalRewards)
      assert.strictEqual(seasonInfo.claimedRewards, '0')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('currentSeason should return active season', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      assert.strictEqual(+seasonIndex, 1)
    })

    it('readSeasonInfo should falsy values on property when it is not found', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(0)
      assert.strictEqual(+seasonIndex, 1)
      assert.strictEqual(seasonInfo.defaultDestination, ADDRESS_ZERO)
      assert.strictEqual(seasonInfo.merkleRoot, '0x0000000000000000000000000000000000000000000000000000000000000000')
      assert.strictEqual(+seasonInfo.claimCloseDate, 0)
      assert.strictEqual(+seasonInfo.totalRewards, 0)
      assert.strictEqual(+seasonInfo.claimedRewards, 0)
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('adding season should fail if previous season is not closed yet', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const defaultDestination = accounts[1]
        const merkleRoot = contractArgs.merkleRoot
        const totalRewards = contractArgs.totalRewards
        const claimCloseDate = Math.floor(now / 1000) + 86400
        await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: previous season not fully closed'))
      }
    })

    it('adding season should fail if unclaimed funds are not sent', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        const defaultDestination = accounts[1]
        const merkleRoot = contractArgs.merkleRoot
        const totalRewards = contractArgs.totalRewards
        const claimCloseDate = Math.floor(now / 1000) + checkpoint + 86400
        await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: unclaimed funds not sent yet'))
      }
    })

    it('adding season should fail if default destination is zero address', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = ADDRESS_ZERO
        const merkleRoot = contractArgs.merkleRoot
        const totalRewards = contractArgs.totalRewards
        const claimCloseDate = Math.floor(now / 1000) + 86400
        await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: default destination cannot be zero address'))
      }
    })

    it('adding season should fail if total rewards is not greater than zero', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const merkleRoot = contractArgs.merkleRoot
        const totalRewards = '0'
        const claimCloseDate = Math.floor(now / 1000) + 86400
        await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: total rewards should be greater than zero'))
      }
    })

    it('adding season should fail if claim close date is before current timestamp', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const checkpoint = 86400 * 2
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        const defaultDestination = accounts[1]
        const merkleRoot = contractArgs.merkleRoot
        const totalRewards = contractArgs.totalRewards
        const claimCloseDate = Math.floor(now / 1000) + 86400
        await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: claim close date already reached'))
      }
    })

    it('adding season should work with valid conditions', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const checkpoint = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const defaultDestination = accounts[1]
      const merkleRoot = contractArgs.merkleRoot
      const totalRewards = contractArgs.totalRewards
      const claimCloseDate = Math.floor(now / 1000) + 86400 * 4
      await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 2)
      assert.strictEqual(seasonInfo.defaultDestination, accounts[1])
      assert.strictEqual(seasonInfo.merkleRoot, contractArgs.merkleRoot)
      assert.strictEqual(seasonInfo.totalRewards, contractArgs.totalRewards)
      assert.strictEqual(+seasonInfo.claimCloseDate, claimCloseDate)
      assert.strictEqual(seasonInfo.claimedRewards, '0')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('adding season should work when all previous season funds are sent and prev season is closed', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

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

      const checkpoint = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      const defaultDestination = accounts[1]
      const merkleRoot = contractArgs.merkleRoot
      const totalRewards = contractArgs.totalRewards
      const claimCloseDate = Math.floor(now / 1000) + 86400 * 4
      await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })

      const seasonIndex = await contract.currentSeason()
      const seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(+seasonIndex, 2)
      assert.strictEqual(seasonInfo.defaultDestination, accounts[1])
      assert.strictEqual(seasonInfo.merkleRoot, contractArgs.merkleRoot)
      assert.strictEqual(seasonInfo.totalRewards, contractArgs.totalRewards)
      assert.strictEqual(+seasonInfo.claimCloseDate, claimCloseDate)
      assert.strictEqual(seasonInfo.claimedRewards, '0')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)
    })

    it('claimReward should fail when claim deadline is reached', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const checkpoint = 86401
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        const proof = tree.getHexProof(
          web3.utils.keccak256(selector(records[0]))
        )
        const amount = '10000000000000000000000000'
        await contract.claimReward(amount, proof, { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: deadline for claiming reached'))
      }
    })

    it('claimReward should fail when reward is not found', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const proof = tree.getHexProof(
          web3.utils.keccak256(selector(records[0]))
        )
        const amount = '20000000000000000000000000'
        await contract.claimReward(amount, proof, { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: reward not found'))
      }
    })

    it('claimReward should fail when reward is already claimed', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const seasonIndex = await contract.currentSeason()
        const proof = tree.getHexProof(
          web3.utils.keccak256(selector(records[0]))
        )
        const amount = '10000000000000000000000000'

        let seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards, '0')

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(amount, proof, { from: accounts[0] })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards.toString(), '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards.toString(), '10000000000000000000000000')

        await contract.claimReward(amount, proof, { from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: reward is already claimed'))
      }
    })

    it('claimReward should fail when owner of reward is not the caller', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const proof = tree.getHexProof(
          web3.utils.keccak256(selector(records[0]))
        )
        const amount = '10000000000000000000000000'

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.claimReward(amount, proof, { from: accounts[3] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: reward not found'))
      }
    })

    it('once reward is claimed it should be marked as claimed and claimed funds on season should be updated', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const proof = tree.getHexProof(
        web3.utils.keccak256(selector(records[0]))
      )
      const amount = '10000000000000000000000000'

      const seasonIndex = await contract.currentSeason()

      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards, '0')

      let reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward, false)

      const checkpoint = 43201
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.claimReward(amount, proof, { from: accounts[0] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards, '10000000000000000000000000')

      reward = await contract.readReward(seasonIndex, accounts[0])
      assert.strictEqual(reward, true)
    })

    it('unclaimed funds cannot be sent before season is closed', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const seasonIndex = await contract.currentSeason()
        const seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards, '0')

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: deadline for claiming not reached'))
      }
    })

    it('send unclaimed funds should fail when there are no unclaimed funds', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const seasonIndex = await contract.currentSeason()

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

        const seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards, '60000000000000000000000000')

        const checkpoint = 86401
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: no funds available'))
      }
    })

    it('unclaimed funds cannot be sent twice', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      try {
        const seasonIndex = await contract.currentSeason()
        let seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards, '0')
        assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

        const checkpoint = 43201
        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        const proof = tree.getHexProof(
          web3.utils.keccak256(selector(records[0]))
        )
        const amount = '10000000000000000000000000'

        await contract.claimReward(amount, proof, { from: accounts[0] })

        await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint * 2], id: 0 })
        await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards, '10000000000000000000000000')
        assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        seasonInfo = await contract.readSeasonInfo(seasonIndex)
        assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
        assert.strictEqual(seasonInfo.claimedRewards, '10000000000000000000000000')
        assert.strictEqual(seasonInfo.unclaimedFundsSent, true)

        await contract.sendUnclaimedFunds({ from: accounts[0] })

        throw new Error('Should not reach here')
      } catch (err) {
        assert.ok(err.message.includes('ThriveCoinRewardSeasonMerkle: funds already sent'))
      }
    })

    it('once unclaimed funds are sent season should mark flag indicating the action', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const seasonIndex = await contract.currentSeason()
      let seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards, '0')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, false)

      const checkpoint = 86401
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      seasonInfo = await contract.readSeasonInfo(seasonIndex)
      assert.strictEqual(seasonInfo.totalRewards, '60000000000000000000000000')
      assert.strictEqual(seasonInfo.claimedRewards, '0')
      assert.strictEqual(seasonInfo.unclaimedFundsSent, true)
    })

    it('hasRole should return true when user has role', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
      const res = await contract.hasRole(ADMIN_ROLE, accounts[0])
      assert.strictEqual(res, true)
    })

    it('hasRole should return false when user does not have role', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
      const res = await contract.hasRole(DUMMY_ROLE, accounts[2])
      assert.strictEqual(res, false)
    })

    it('deployer should have admin by default', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
      const res = await contract.hasRole.call(ADMIN_ROLE, accounts[0])
      assert.strictEqual(res, true)
    })

    it('getRoleAdmin should return admin role for all three roles', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )
      const res = await Promise.all([
        contract.getRoleAdmin.call(ADMIN_ROLE),
        contract.getRoleAdmin.call(DUMMY_ROLE)
      ])

      assert.strictEqual(res.every(r => r === ADMIN_ROLE), true)
    })

    it('only admin role can grant roles', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(DUMMY_ROLE, accounts[3])
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
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(ADMIN_ROLE, accounts[4], { from: accounts[0] })
      const hasRole = await contract.hasRole(ADMIN_ROLE, accounts[4])
      assert.strictEqual(hasRole, true)
    })

    it('grantRole should emit RoleGranted event', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const res = await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('only admin role can revoke role', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })

      await contract.revokeRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRole, false)

      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })

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
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })

      const res = await contract.revokeRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('account can renounce their role', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRoleBefore = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRoleBefore, true)

      await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[3] })
      const hasRoleAfter = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRoleAfter, false)
    })

    it('renounce should emit RoleRevoked event', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const res = await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[3] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[3])
    })

    it('account can renounce only their role', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

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
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const res = await contract.grantRole(DUMMY_ROLE, accounts[4], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[4])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('role members must be enumerable', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await contract.grantRole(DUMMY_ROLE, accounts[0], { from: accounts[0] })
      await contract.grantRole(DUMMY_ROLE, accounts[1], { from: accounts[0] })

      const dummies = [accounts[0], accounts[1]]
      const length = await contract.getRoleMemberCount.call(DUMMY_ROLE)

      for (let index = 0; index < length; index++) {
        const dummy = await contract.getRoleMember(DUMMY_ROLE, index)
        assert.strictEqual(dummy, dummies[index])
      }
    })

    it('only admin can send unclaimed funds', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [86500], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      try {
        await contract.sendUnclaimedFunds({ from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinRewardSeasonMerkle: must have admin role'),
          true
        )
      }

      await contract.sendUnclaimedFunds({ from: accounts[0] })
    })

    it('only admin can add new season', async () => {
      contract = await ThriveCoinRewardSeasonMerkle.new(
        ...Object.values(contractArgs),
        { from: accounts[0] }
      )

      const checkpoint = 86400 * 2
      await sendRpc({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [checkpoint], id: 0 })
      await sendRpc({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: 0 })

      await contract.sendUnclaimedFunds({ from: accounts[0] })

      const defaultDestination = accounts[1]
      const merkleRoot = contractArgs.merkleRoot
      const totalRewards = contractArgs.totalRewards
      const claimCloseDate = Math.floor(now / 1000) + 86400 * 4

      try {
        await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinRewardSeasonMerkle: must have admin role'),
          true
        )
      }

      await contract.addSeason(defaultDestination, merkleRoot, totalRewards, claimCloseDate, { from: accounts[0] })
    })
  })
})
