'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20Token', () => {
  contract('burn tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20Token.deployed()
      await contract.transfer(accounts[1], 2000, { from: accounts[0] })
    })

    it('burn should reduce balance and total supply', async () => {
      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceBefore = await contract.balanceOf.call(accounts[0])

      await contract.burn(2500, { from: accounts[0] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAfter = await contract.balanceOf.call(accounts[0])

      assert.strictEqual(totalSupplyBefore.toNumber() - totalSupplyAfter.toNumber(), 2500)
      assert.strictEqual(balanceBefore.toNumber() - balanceAfter.toNumber(), 2500)
    })

    it('burn emit Transfer event', async () => {
      const res = await contract.burn(300, { from: accounts[1] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[1])
      assert.strictEqual(txLog.args.to, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.value.toNumber(), 300)
    })

    it('burn should not fail when amount is zero', async () => {
      const res = await contract.burn(0, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.to, ADDRESS_ZERO)
      assert.strictEqual(txLog.args.value.toNumber(), 0)
    })

    it('burn should fail when amount is greater than balance', async () => {
      try {
        await contract.burn(2500, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'),
          true
        )
      }
    })

    it('burn should fail when amount is negative', async () => {
      try {
        await contract.burn(-2500, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'),
          true
        )
      }
    })

    it('burnFrom should burn from target account and decrease allowance', async () => {
      await contract.approve(accounts[1], 5000, { from: accounts[0] })

      const totalSupplyBefore = await contract.totalSupply.call()
      const balanceAcc0Before = await contract.balanceOf.call(accounts[0])
      const balanceAcc1Before = await contract.balanceOf.call(accounts[1])
      const allowanceBefore = await contract.allowance.call(accounts[0], accounts[1])

      await contract.burnFrom(accounts[0], 2000, { from: accounts[1] })

      const totalSupplyAfter = await contract.totalSupply.call()
      const balanceAcc0After = await contract.balanceOf.call(accounts[0])
      const balanceAcc1After = await contract.balanceOf.call(accounts[1])
      const allowanceAfter = await contract.allowance.call(accounts[0], accounts[1])

      assert.strictEqual(totalSupplyBefore.toNumber() - totalSupplyAfter.toNumber(), 2000)
      assert.strictEqual(balanceAcc0Before.toNumber() - balanceAcc0After.toNumber(), 2000)
      assert.strictEqual(balanceAcc1Before.toNumber() - balanceAcc1After.toNumber(), 0)
      assert.strictEqual(allowanceBefore.toNumber() - allowanceAfter.toNumber(), 2000) // 5000 - 3000
    })

    it('burnFrom should emit Transfer and Approve events', async () => {
      const res = await contract.burnFrom(accounts[0], 1000, { from: accounts[1] })
      const txLogs = res.logs

      assert.strictEqual(txLogs[0].event, 'Approval')
      assert.strictEqual(txLogs[0].args.owner, accounts[0])
      assert.strictEqual(txLogs[0].args.spender, accounts[1])
      assert.strictEqual(txLogs[0].args.value.toNumber(), 2000)

      assert.strictEqual(txLogs[1].event, 'Transfer')
      assert.strictEqual(txLogs[1].args.from, accounts[0])
      assert.strictEqual(txLogs[1].args.to, ADDRESS_ZERO)
      assert.strictEqual(txLogs[1].args.value.toNumber(), 1000)
    })

    it('burnFrom should fail when allowance is lower than amount', async () => {
      try {
        await contract.burnFrom(accounts[0], 3000, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20: burn amount exceeds allowance'),
          true
        )
      }
    })

    it('burnFrom should not fail when amount is zero', async () => {
      const res = await contract.burnFrom(accounts[0], 0, { from: accounts[1] })
      const txLogs = res.logs

      assert.strictEqual(txLogs[0].event, 'Approval')
      assert.strictEqual(txLogs[0].args.owner, accounts[0])
      assert.strictEqual(txLogs[0].args.spender, accounts[1])
      assert.strictEqual(txLogs[0].args.value.toNumber(), 2000)

      assert.strictEqual(txLogs[1].event, 'Transfer')
      assert.strictEqual(txLogs[1].args.from, accounts[0])
      assert.strictEqual(txLogs[1].args.to, ADDRESS_ZERO)
      assert.strictEqual(txLogs[1].args.value.toNumber(), 0)
    })

    it('burnFrom should fail when amount is negative', async () => {
      try {
        await contract.burnFrom(accounts[0], -30, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'),
          true
        )
      }
    })

    it('burnFrom should fail when amount is greater than allowance but not greater than balance', async () => {
      try {
        await contract.transfer(accounts[3], 300, { from: accounts[0] })
        await contract.approve(accounts[2], 300, { from: accounts[3] })
        await contract.transfer(accounts[0], 200, { from: accounts[3] })
        await contract.burnFrom(accounts[3], 200, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'),
          true
        )
      }
    })

    it('burnFrom should fail when amount is greater than balance but not greater than allowance', async () => {
      try {
        await contract.transfer(accounts[3], 100, { from: accounts[0] })
        await contract.approve(accounts[2], 20, { from: accounts[3] })
        await contract.burnFrom(accounts[3], 200, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20: burn amount exceeds allowance'),
          true
        )
      }
    })
  })
})
