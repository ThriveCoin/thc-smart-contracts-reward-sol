'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
const { keccak256 } = require('@ethersproject/keccak256')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20Token', () => {
  contract('role tests', (accounts) => {
    let contract = null
    const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const MINTER_ROLE = keccak256(Buffer.from('MINTER_ROLE', 'utf8'))
    const PAUSER_ROLE = keccak256(Buffer.from('PAUSER_ROLE', 'utf8'))
    const DUMMY_ROLE = keccak256(Buffer.from('DUMMY_ROLE', 'utf8'))

    before(async () => {
      contract = await ThriveCoinERC20Token.deployed()
      await contract.grantRole(MINTER_ROLE, accounts[1], { from: accounts[0] })
      await contract.grantRole(PAUSER_ROLE, accounts[2], { from: accounts[0] })
      await contract.transfer(accounts[1], 1000, { from: accounts[0] })
      await contract.transfer(accounts[2], 1000, { from: accounts[0] })
    })

    it('hasRole should return true when user has role', async () => {
      const res = await contract.hasRole(ADMIN_ROLE, accounts[0])
      assert.strictEqual(res, true)
    })

    it('hasRole should return false when user does not have role', async () => {
      const res = await contract.hasRole(MINTER_ROLE, accounts[2])
      assert.strictEqual(res, false)
    })

    it('owner should be deployer address', async () => {
      const owner = await contract.owner.call()
      assert.strictEqual(owner, accounts[0])
    })

    it('owner should have all three roles by default', async () => {
      const owner = await contract.owner.call()
      const res = await Promise.all([
        contract.hasRole.call(ADMIN_ROLE, owner),
        contract.hasRole.call(MINTER_ROLE, owner),
        contract.hasRole.call(PAUSER_ROLE, owner)
      ])

      assert.strictEqual(res.every(r => r === true), true)
    })

    it('getRoleAdmin should return admin role for all three roles', async () => {
      const res = await Promise.all([
        contract.getRoleAdmin.call(ADMIN_ROLE),
        contract.getRoleAdmin.call(MINTER_ROLE),
        contract.getRoleAdmin.call(PAUSER_ROLE)
      ])

      assert.strictEqual(res.every(r => r === ADMIN_ROLE), true)
    })

    it('only admin role can grant roles', async () => {
      await contract.grantRole(MINTER_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(MINTER_ROLE, accounts[3])
      assert.strictEqual(hasRole, true)

      try {
        await contract.grantRole(PAUSER_ROLE, accounts[3], { from: accounts[1] })
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
      const res = await contract.grantRole(PAUSER_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, PAUSER_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('only admin role can revoke role', async () => {
      await contract.revokeRole(MINTER_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(MINTER_ROLE, accounts[3])
      assert.strictEqual(hasRole, false)

      try {
        await contract.revokeRole(PAUSER_ROLE, accounts[3], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('revokeRole should emit RoleRevoked event', async () => {
      const res = await contract.revokeRole(PAUSER_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, PAUSER_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('account can renounce their role', async () => {
      await contract.grantRole(PAUSER_ROLE, accounts[3], { from: accounts[0] })
      const hasRoleBefore = await contract.hasRole(PAUSER_ROLE, accounts[3])
      assert.strictEqual(hasRoleBefore, true)

      await contract.renounceRole(PAUSER_ROLE, accounts[3], { from: accounts[3] })
      const hasRoleAfter = await contract.hasRole(PAUSER_ROLE, accounts[3])
      assert.strictEqual(hasRoleAfter, false)
    })

    it('renounce should emit RoleRevoked event', async () => {
      await contract.grantRole(PAUSER_ROLE, accounts[3], { from: accounts[0] })
      const res = await contract.renounceRole(PAUSER_ROLE, accounts[3], { from: accounts[3] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, PAUSER_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[3])
    })

    it('account can renounce only their role', async () => {
      await contract.grantRole(PAUSER_ROLE, accounts[3], { from: accounts[0] })

      try {
        await contract.renounceRole(PAUSER_ROLE, accounts[3], { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('AccessControl: can only renounce roles for self'),
          true
        )
      }
    })

    it('granRole could work for any role', async () => {
      const res = await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('role members be enumerable', async () => {
      const minters = [accounts[0], accounts[1]]
      const length = await contract.getRoleMemberCount.call(MINTER_ROLE)

      for (let index = 0; index < length; index++) {
        const minter = await contract.getRoleMember(MINTER_ROLE, index)
        assert.strictEqual(minter, minters[index])
      }
    })

    it('token transfer is allowed to any user', async () => {
      await contract.transfer(accounts[2], 10, { from: accounts[1] })
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])

      assert.strictEqual(balanceAcc1.toNumber(), 990)
      assert.strictEqual(balanceAcc2.toNumber(), 1010)
    })

    it('approval and allowance is allowed to any user', async () => {
      await contract.approve(accounts[2], 10, { from: accounts[1] })
      let allowance = await contract.allowance.call(accounts[1], accounts[2])
      assert.strictEqual(allowance.toNumber(), 10)

      await contract.increaseAllowance(accounts[2], 2, { from: accounts[1] })
      allowance = await contract.allowance.call(accounts[1], accounts[2])
      assert.strictEqual(allowance.toNumber(), 12)

      await contract.decreaseAllowance(accounts[2], 1, { from: accounts[1] })
      allowance = await contract.allowance.call(accounts[1], accounts[2])
      assert.strictEqual(allowance.toNumber(), 11)
    })

    it('burn can be done by any user', async () => {
      await contract.burn(100, { from: accounts[1] })
      const balance = await contract.balanceOf.call(accounts[1])
      assert.strictEqual(balance.toNumber(), 890)
    })

    it('mint can be done only by MINTER_ROLE', async () => {
      await contract.mint(accounts[1], 5, { from: accounts[0] })
      await contract.mint(accounts[1], 5, { from: accounts[1] })

      try {
        await contract.mint(accounts[1], 10, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20PresetMinterPauser: must have minter role to mint'),
          true
        )
      }
    })

    it('cap can be updated only by owner', async () => {
      const cap = await contract.cap.call()
      await contract.updateCap(cap.toNumber() - 10, { from: accounts[0] })

      try {
        await contract.updateCap(cap.toNumber() - 10, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'),
          true
        )
      }
    })

    it('lockAmount is available to all accounts', async () => {
      await contract.lockAmount(accounts[1], accounts[2], 1, { from: accounts[1] })
    })

    it('unlockAmount is available to all accounts', async () => {
      await contract.unlockAmount(accounts[1], accounts[2], 1, { from: accounts[2] })
    })

    it('pause can be done only by PAUSER_ROLE', async () => {
      await contract.pause({ from: accounts[0] })
      await contract.unpause({ from: accounts[0] })
      await contract.pause({ from: accounts[2] })
      await contract.unpause({ from: accounts[2] })

      try {
        await contract.pause({ from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20PresetMinterPauser: must have pauser role to pause'),
          true
        )
      }
    })

    it('unpause can be done only by PAUSER_ROLE', async () => {
      await contract.pause({ from: accounts[0] })
      await contract.unpause({ from: accounts[0] })
      await contract.pause({ from: accounts[2] })

      try {
        await contract.unpause({ from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20PresetMinterPauser: must have pauser role to unpause'),
          true
        )
      }
    })

    it('blockAccount can be done only by DEFAULT_ADMIN_ROLE', async () => {
      await contract.blockAccount(accounts[4], { from: accounts[0] })
      await contract.unblockAccount(accounts[4], { from: accounts[0] })

      try {
        await contract.blockAccount(accounts[4], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinERC20Token: caller must have admin role to block the account'),
          true
        )
      }
    })

    it('unblockAccount can be done only by DEFAULT_ADMIN_ROLE', async () => {
      await contract.blockAccount(accounts[4], { from: accounts[0] })
      await contract.unblockAccount(accounts[4], { from: accounts[0] })
      await contract.blockAccount(accounts[4], { from: accounts[0] })

      try {
        await contract.unblockAccount(accounts[4], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ThriveCoinERC20Token: caller must have admin role to unblock the account'),
          true
        )
      }
    })

    it('transferOwnership should set new owner and grant all roles to new owner', async () => {
      const oldOwner = await contract.owner.call()
      await contract.transferOwnership(accounts[4], { from: accounts[0] })
      const newOwner = await contract.owner.call()

      const roleResOldOwner = await Promise.all([
        contract.hasRole.call(ADMIN_ROLE, oldOwner),
        contract.hasRole.call(MINTER_ROLE, oldOwner),
        contract.hasRole.call(PAUSER_ROLE, oldOwner)
      ])

      const roleResNewOwner = await Promise.all([
        contract.hasRole.call(ADMIN_ROLE, newOwner),
        contract.hasRole.call(MINTER_ROLE, newOwner),
        contract.hasRole.call(PAUSER_ROLE, newOwner)
      ])

      assert.strictEqual(oldOwner === accounts[0], true)
      assert.strictEqual(newOwner === accounts[4], true)
      assert.ok(roleResOldOwner.every(r => r === false))
      assert.ok(roleResNewOwner.every(r => r === true))
    })

    it('transferOwnership can be done only by owner', async () => {
      const oldOwner = await contract.owner.call()
      await contract.transferOwnership(accounts[5], { from: oldOwner })
      const newOwner = await contract.owner.call()

      const roleRes = await Promise.all([
        contract.hasRole.call(ADMIN_ROLE, newOwner),
        contract.hasRole.call(MINTER_ROLE, newOwner),
        contract.hasRole.call(PAUSER_ROLE, newOwner)
      ])

      assert.strictEqual(oldOwner === accounts[4], true)
      assert.strictEqual(newOwner === accounts[5], true)
      assert.strictEqual(roleRes.every(r => r === true), true)

      try {
        await contract.transferOwnership(accounts[5], { from: oldOwner })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'),
          true
        )
      }
    })

    it('transferOwnership should emit OwnershipTransferred event', async () => {
      const oldOwner = await contract.owner.call()
      const res = await contract.transferOwnership(accounts[4], { from: oldOwner })
      const newOwner = await contract.owner.call()
      const txLog = res.logs[0]

      assert.strictEqual(oldOwner, accounts[5])
      assert.strictEqual(newOwner, accounts[4])
      assert.strictEqual(txLog.event, 'OwnershipTransferred')
      assert.strictEqual(txLog.args.previousOwner, oldOwner)
      assert.strictEqual(txLog.args.newOwner, newOwner)
    })

    it('renounceOwnership can be done only by owner', async () => {
      try {
        await contract.renounceOwnership({ from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('Ownable: caller is not the owner'),
          true
        )
      }
    })

    it('renounceOwnership should move owner to zero address', async () => {
      const oldOwner = await contract.owner.call()
      const res = await contract.renounceOwnership({ from: oldOwner })
      const newOwner = await contract.owner.call()
      const txLog = res.logs[0]

      assert.strictEqual(oldOwner, accounts[4])
      assert.strictEqual(newOwner, ADDRESS_ZERO)
      assert.strictEqual(txLog.event, 'OwnershipTransferred')
      assert.strictEqual(txLog.args.previousOwner, oldOwner)
      assert.strictEqual(txLog.args.newOwner, ADDRESS_ZERO)
    })
  })
})
