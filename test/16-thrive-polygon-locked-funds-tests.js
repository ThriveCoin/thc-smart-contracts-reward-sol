'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('locked funds tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
      await contract.deposit(
        accounts[0],
        web3.eth.abi.encodeParameter('uint256', '999990000'),
        { from: accounts[0] }
      )
      await contract.transfer(accounts[1], 1000, { from: accounts[0] })
      await contract.transfer(accounts[2], 1000, { from: accounts[0] })
    })

    it('locked balance by default should be zero', async () => {
      const balance = await contract.lockedBalanceOf.call(accounts[3])
      assert.strictEqual(balance.toNumber(), 0)
    })

    it('locked balance per account by default should be zero', async () => {
      const balance = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      assert.strictEqual(balance.toNumber(), 0)
    })

    it('lockAmount is available only for own funds', async () => {
      try {
        await contract.lockAmount(accounts[1], accounts[2], 100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: can lock only own funds'),
          true
        )
      }
    })

    it('lockAmount should fail when amount is zero', async () => {
      try {
        await contract.lockAmount(accounts[1], accounts[2], 0, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount to be locked should be greater than zero'),
          true
        )
      }
    })

    it('lockAmount should fail when owner is zero address', async () => {
      try {
        await contract.lockAmount(ADDRESS_ZERO, accounts[2], 10, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: can lock only own funds'),
          true
        )
      }
    })

    it('lockAmount should fail when spender is zero address', async () => {
      try {
        await contract.lockAmount(accounts[1], ADDRESS_ZERO, 10, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: lock to the zero address'),
          true
        )
      }
    })

    it('lockAmount should set both _lockedBalances and _lockedAccountBalanceMap', async () => {
      await contract.lockAmount(accounts[1], accounts[2], 50, { from: accounts[1] })
      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])

      assert.strictEqual(totalLockedBalance.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount.toNumber(), 50)
    })

    it('lockAmount should emit LockedFunds event with amount specified in args', async () => {
      const res = await contract.lockAmount(accounts[1], accounts[3], 20, { from: accounts[1] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'LockedFunds')
      assert.strictEqual(txLog.args.owner, accounts[1])
      assert.strictEqual(txLog.args.spender, accounts[3])
      assert.strictEqual(txLog.args.amount.toNumber(), 20)

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 70)
      assert.strictEqual(lockedBalancePerAccount.toNumber(), 20)
    })

    it('lockAmount should increase existing locked balances', async () => {
      await contract.lockAmount(accounts[1], accounts[2], 15, { from: accounts[1] })
      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 85)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 65)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
    })

    it('lockAmount should fail when new locked balance exceeds account balance', async () => {
      try {
        await contract.lockAmount(accounts[1], accounts[2], 916, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount greater than total lockable balance'),
          true
        )
      }
    })

    it('unlockAmount is available to spender only', async () => {
      try {
        await contract.unlockAmount(accounts[1], accounts[2], 10, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: only spender can unlock funds'),
          true
        )
      }
    })

    it('unlockAmount should fail when amount is zero', async () => {
      try {
        await contract.unlockAmount(accounts[1], accounts[2], 0, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount to be unlocked should be greater than zero'),
          true
        )
      }
    })

    it('unlockAmount should fail when owner is zero address', async () => {
      try {
        await contract.unlockAmount(ADDRESS_ZERO, accounts[2], 10, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: unlock from the zero address'),
          true
        )
      }
    })

    it('unlockAmount should fail when spender is zero address', async () => {
      try {
        await contract.unlockAmount(accounts[1], ADDRESS_ZERO, 10, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: only spender can unlock funds'),
          true
        )
      }
    })

    it('unlockAmount should fail when amount exceeds total locked balance', async () => {
      try {
        await contract.unlockAmount(accounts[1], accounts[2], 1000, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: unlock amount exceeds locked total balance'),
          true
        )
      }
    })

    it('unlockAmount should fail when amount exceeds total locked balance for spender', async () => {
      try {
        await contract.unlockAmount(accounts[1], accounts[2], 70, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: unlock amount exceeds locked spender balance'),
          true
        )
      }
    })

    it('unlockAmount should decrease existing locked balances', async () => {
      await contract.unlockAmount(accounts[1], accounts[2], 15, { from: accounts[2] })
      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 70)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
    })

    it('unlockAmount should emit UnlockedFunds event with amount specified in args', async () => {
      const res = await contract.unlockAmount(accounts[1], accounts[3], 5, { from: accounts[3] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'UnlockedFunds')
      assert.strictEqual(txLog.args.owner, accounts[1])
      assert.strictEqual(txLog.args.spender, accounts[3])
      assert.strictEqual(txLog.args.amount.toNumber(), 5)

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 65)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 15)
    })

    it('transfer should fail if it includes total locked balance', async () => {
      try {
        await contract.transfer(accounts[0], 936, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'),
          true
        )
      }
    })

    it('transferFrom should fail if it includes total locked balance', async () => {
      const totalBalance = await contract.balanceOf.call(accounts[1])
      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalBalance.toNumber(), 1000)
      assert.strictEqual(totalLockedBalance.toNumber(), 65)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 15)

      try {
        await contract.approve(accounts[2], 1000, { from: accounts[1] })
        // acc 2 can transfer at most 1000 - 65 + 50 - 985
        await contract.transferFrom(accounts[1], accounts[3], 986, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'),
          true
        )
      }
    })

    it('withdraw should fail if it includes total locked balance', async () => {
      try {
        await contract.withdraw(936, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'),
          true
        )
      }
    })

    it('deposit should work always', async () => {
      await contract.deposit(accounts[1], web3.eth.abi.encodeParameter('uint256', 100), { from: accounts[0] })

      const balance = await contract.balanceOf.call(accounts[1])
      const lockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      assert.strictEqual(balance.toNumber(), 1100)
      assert.strictEqual(lockedBalance.toNumber(), 65)
    })

    it('transfer should work when it does not include locked balance', async () => {
      await contract.transfer(accounts[4], 100, { from: accounts[1] })

      const lockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc4 = await contract.balanceOf.call(accounts[4])

      assert.strictEqual(lockedBalance.toNumber(), 65)
      assert.strictEqual(balanceAcc1.toNumber(), 1000)
      assert.strictEqual(balanceAcc4.toNumber(), 100)
    })

    it('transferFrom should work when it does not include locked balance', async () => {
      await contract.approve(accounts[4], 100, { from: accounts[1] })
      await contract.transferFrom(accounts[1], accounts[4], 100, { from: accounts[4] })

      const lockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc4 = await contract.balanceOf.call(accounts[4])

      assert.strictEqual(lockedBalance.toNumber(), 65)
      assert.strictEqual(balanceAcc1.toNumber(), 900)
      assert.strictEqual(balanceAcc4.toNumber(), 200)
    })

    it('withdraw should work when it does not include locked balance', async () => {
      await contract.withdraw(100, { from: accounts[1] })

      const lockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const balance = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(lockedBalance.toNumber(), 65)
      assert.strictEqual(balance.toNumber(), 800)
    })

    it('transfer should reduce locked balance by reciever when sender has locked funds by receiver', async () => {
      await contract.transfer(accounts[2], 10, { from: accounts[1] })

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 55)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 40)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 15)
      assert.strictEqual(balanceAcc1.toNumber(), 790)
      assert.strictEqual(balanceAcc2.toNumber(), 1010)
      assert.strictEqual(balanceAcc3.toNumber(), 0)
    })

    it('transfer should clear locked balance by spender when amount exceeds locked balance by spender', async () => {
      await contract.transfer(accounts[3], 30, { from: accounts[1] })

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 40)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 40)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 0)
      assert.strictEqual(balanceAcc1.toNumber(), 760)
      assert.strictEqual(balanceAcc2.toNumber(), 1010)
      assert.strictEqual(balanceAcc3.toNumber(), 30)
    })

    it('transferFrom should reduce locked balance by caller and not spender', async () => {
      await contract.lockAmount(accounts[1], accounts[3], 20, { from: accounts[1] })
      await contract.transferFrom(accounts[1], accounts[3], 10, { from: accounts[2] })

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 30)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
      assert.strictEqual(balanceAcc1.toNumber(), 750)
      assert.strictEqual(balanceAcc2.toNumber(), 1010)
      assert.strictEqual(balanceAcc3.toNumber(), 40)
    })

    it('transferFrom should clear locked balance by caller when amount exceeds locked balance by caller', async () => {
      await contract.transferFrom(accounts[1], accounts[3], 40, { from: accounts[2] })

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 20)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
      assert.strictEqual(balanceAcc1.toNumber(), 710)
      assert.strictEqual(balanceAcc2.toNumber(), 1010)
      assert.strictEqual(balanceAcc3.toNumber(), 80)
    })

    it('transfer should clear total locked balance when amount exceeds the total locked balance', async () => {
      await contract.transfer(accounts[3], 30, { from: accounts[1] })

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 0)
      assert.strictEqual(balanceAcc1.toNumber(), 680)
      assert.strictEqual(balanceAcc2.toNumber(), 1010)
      assert.strictEqual(balanceAcc3.toNumber(), 110)
    })

    it('transferFrom should clear total locked balance when amount exceeds the total locked balance', async () => {
      await contract.lockAmount(accounts[1], accounts[2], 5, { from: accounts[1] })

      let totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      let lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      let lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 5)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 5)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 0)

      await contract.transferFrom(accounts[1], accounts[2], 10, { from: accounts[2] })

      totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      const balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 0)
      assert.strictEqual(balanceAcc1.toNumber(), 670)
      assert.strictEqual(balanceAcc2.toNumber(), 1020)
      assert.strictEqual(balanceAcc3.toNumber(), 110)
    })

    it('transfer should work with amount equal to balance + locked by spender - total locked', async () => {
      await contract.lockAmount(accounts[1], accounts[2], 50, { from: accounts[1] })
      await contract.lockAmount(accounts[1], accounts[3], 20, { from: accounts[1] })

      let balanceAcc1 = await contract.balanceOf(accounts[1])
      let totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      let lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      let lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(balanceAcc1.toNumber(), 670)
      assert.strictEqual(totalLockedBalance.toNumber(), 70)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)

      await contract.transfer(accounts[2], 650, { from: accounts[1] })

      totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 20)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
      assert.strictEqual(balanceAcc1.toNumber(), 20)
      assert.strictEqual(balanceAcc2.toNumber(), 1670)
      assert.strictEqual(balanceAcc3.toNumber(), 110)
    })

    it('transferFrom should work with amount equal to balance + locked by spender - total locked', async () => {
      await contract.transfer(accounts[1], 300, { from: accounts[0] })
      await contract.lockAmount(accounts[1], accounts[2], 50, { from: accounts[1] })

      let balanceAcc1 = await contract.balanceOf(accounts[1])
      let totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      let lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      let lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(balanceAcc1.toNumber(), 320)
      assert.strictEqual(totalLockedBalance.toNumber(), 70)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)

      await contract.transferFrom(accounts[1], accounts[3], 300, { from: accounts[2] })

      totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 20)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 0)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
      assert.strictEqual(balanceAcc1.toNumber(), 20)
      assert.strictEqual(balanceAcc2.toNumber(), 1670)
      assert.strictEqual(balanceAcc3.toNumber(), 410)
    })

    it('burn should work with amount equal to balance - total locked', async () => {
      await contract.transfer(accounts[1], 80, { from: accounts[0] })
      await contract.lockAmount(accounts[1], accounts[2], 50, { from: accounts[1] })

      let balanceAcc1 = await contract.balanceOf(accounts[1])
      let totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      let lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      let lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(balanceAcc1.toNumber(), 100)
      assert.strictEqual(totalLockedBalance.toNumber(), 70)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)

      await contract.withdraw(30, { from: accounts[1] })

      totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])
      balanceAcc1 = await contract.balanceOf.call(accounts[1])
      const balanceAcc2 = await contract.balanceOf.call(accounts[2])
      const balanceAcc3 = await contract.balanceOf.call(accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 70)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 50)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 20)
      assert.strictEqual(balanceAcc1.toNumber(), 70)
      assert.strictEqual(balanceAcc2.toNumber(), 1670)
      assert.strictEqual(balanceAcc3.toNumber(), 410)
    })

    it('when locked funds are spent ClaimedLockedFunds event is emitted', async () => {
      const res = await contract.transfer(accounts[3], 20, { from: accounts[1] })
      const txLogs = res.logs

      assert.strictEqual(txLogs[0].event, 'ClaimedLockedFunds')
      assert.strictEqual(txLogs[0].args.owner, accounts[1])
      assert.strictEqual(txLogs[0].args.spender, accounts[3])
      assert.strictEqual(txLogs[0].args.amount.toNumber(), 20)

      assert.strictEqual(txLogs[1].event, 'Transfer')
      assert.strictEqual(txLogs[1].args.from, accounts[1])
      assert.strictEqual(txLogs[1].args.to, accounts[3])
      assert.strictEqual(txLogs[1].args.value.toNumber(), 20)
    })

    it('lockAmountFrom should fail caller is not spender', async () => {
      try {
        await contract.approve(accounts[2], 0, { from: accounts[1] })
        await contract.lockAmountFrom(accounts[1], accounts[2], 916, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: only spender can request lock'),
          true
        )
      }
    })

    it('lockAmountFrom should fail when amount exceeds allowance', async () => {
      try {
        await contract.approve(accounts[2], 0, { from: accounts[1] })
        await contract.lockAmountFrom(accounts[1], accounts[2], 5, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: lock amount exceeds allowance'),
          true
        )
      }
    })

    it('lockAmountFrom should lock funds if amount does not exceeds allowance', async () => {
      await contract.transfer(accounts[1], 50, { from: accounts[0] })
      await contract.lockAmount(accounts[1], accounts[3], 15, { from: accounts[1] })
      await contract.unlockAmount(accounts[1], accounts[2], 50, { from: accounts[2] })
      await contract.approve(accounts[2], 5, { from: accounts[1] })

      const res = await contract.lockAmountFrom(accounts[1], accounts[2], 5, { from: accounts[2] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'LockedFunds')
      assert.strictEqual(txLog.args.owner, accounts[1])
      assert.strictEqual(txLog.args.spender, accounts[2])
      assert.strictEqual(txLog.args.amount.toNumber(), 5)

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 20)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 5)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 15)
    })

    it('lockAmountFrom should calculate already locked funds + allowance', async () => {
      await contract.approve(accounts[2], 7, { from: accounts[1] })

      try {
        await contract.lockAmountFrom(accounts[1], accounts[2], 3, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: lock amount exceeds allowance'),
          true
        )
      }
      await contract.lockAmountFrom(accounts[1], accounts[2], 2, { from: accounts[2] })

      const totalLockedBalance = await contract.lockedBalanceOf.call(accounts[1])
      const lockedBalancePerAccount2 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[2])
      const lockedBalancePerAccount3 = await contract.lockedBalancePerAccount.call(accounts[1], accounts[3])

      assert.strictEqual(totalLockedBalance.toNumber(), 22)
      assert.strictEqual(lockedBalancePerAccount2.toNumber(), 7)
      assert.strictEqual(lockedBalancePerAccount3.toNumber(), 15)
    })
  })
})
