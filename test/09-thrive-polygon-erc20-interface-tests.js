'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')
const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

describe('ThriveCoinERC20TokenPolygon', () => {
  contract('erc20 interface tests', (accounts) => {
    let contract = null

    before(async () => {
      contract = await ThriveCoinERC20TokenPolygon.deployed()
      await contract.deposit(
        accounts[0],
        web3.eth.abi.encodeParameter('uint256', '1000000000'),
        { from: accounts[0] }
      )
    })

    it('token info params should be accessible', async () => {
      const name = await contract.name.call()
      const symbol = await contract.symbol.call()
      const decimals = await contract.decimals.call()
      const totalSupply = await contract.totalSupply.call()

      assert.strictEqual(name, 'ThriveCoin')
      assert.strictEqual(symbol, 'THRIVE')
      assert.strictEqual(decimals.toNumber(), 8)
      assert.strictEqual(totalSupply.toNumber(), 1000000000)
    })

    it('balanceOf should return expected balances', async () => {
      const acc0Bal = await contract.balanceOf.call(accounts[0])
      const acc1Bal = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(acc0Bal.toNumber(), 1000000000)
      assert.strictEqual(acc1Bal.toNumber(), 0)
    })

    it('transfer should move funds from source to dest', async () => {
      let acc0Bal = await contract.balanceOf.call(accounts[0])
      let acc1Bal = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(acc0Bal.toNumber(), 1000000000)
      assert.strictEqual(acc1Bal.toNumber(), 0)

      await contract.transfer(accounts[1], 10, { from: accounts[0] })

      acc0Bal = await contract.balanceOf.call(accounts[0])
      acc1Bal = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(acc0Bal.toNumber(), 999999990)
      assert.strictEqual(acc1Bal.toNumber(), 10)
    })

    it('tranfer should fail when balance exceeds amount', async () => {
      const res = await contract.transfer(accounts[1], 5, { from: accounts[0] })
      const txLog = res.logs[0]

      const acc0Bal = await contract.balanceOf.call(accounts[0])
      const acc1Bal = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.to, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 5)
      assert.strictEqual(acc0Bal.toNumber(), 999999985)
      assert.strictEqual(acc1Bal.toNumber(), 15)
    })

    it('tranfer should fail when receiver is zero address', async () => {
      try {
        await contract.transfer(ADDRESS_ZERO, 50, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('ERC20: transfer to the zero address'), true)
      }
    })

    it('tranfer should not fail when amount is zero', async () => {
      const acc0BalBefore = await contract.balanceOf.call(accounts[0])
      const acc1BalBefore = await contract.balanceOf.call(accounts[1])

      const res = await contract.transfer(accounts[1], 0, { from: accounts[0] })
      const txLog = res.logs[0]

      const acc0BalAfter = await contract.balanceOf.call(accounts[0])
      const acc1BalAfter = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.to, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 0)
      assert.strictEqual(acc0BalBefore.toNumber(), acc0BalAfter.toNumber())
      assert.strictEqual(acc1BalBefore.toNumber(), acc1BalAfter.toNumber())
    })

    it('tranfer should fail when amount is negative', async () => {
      try {
        await contract.transfer(accounts[1], -100, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('value out-of-bounds'), true)
      }
    })

    it('allowance returns amount allowed by user to spend on behalf', async () => {
      await contract.approve(accounts[2], 50, { from: accounts[0] })

      const allowanceAcc1 = await contract.allowance.call(accounts[0], accounts[1])
      const allowanceAcc2 = await contract.allowance.call(accounts[0], accounts[2])

      assert.strictEqual(allowanceAcc1.toNumber(), 0)
      assert.strictEqual(allowanceAcc2.toNumber(), 50)
    })

    it('approve should set exact amount that will be allowed to spend on behalf', async () => {
      await contract.approve(accounts[2], 20, { from: accounts[0] })

      const allowance = await contract.allowance.call(accounts[0], accounts[2])
      assert.strictEqual(allowance.toNumber(), 20)
    })

    it('approve should emit approval event', async () => {
      const res = await contract.approve(accounts[2], 20, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Approval')
      assert.strictEqual(txLog.args.owner, accounts[0])
      assert.strictEqual(txLog.args.spender, accounts[2])
      assert.strictEqual(txLog.args.value.toNumber(), 20)

      const allowance = await contract.allowance.call(accounts[0], accounts[2])
      assert.strictEqual(allowance.toNumber(), 20)
    })

    it('approve should fail when spender is zero address', async () => {
      try {
        await contract.approve(ADDRESS_ZERO, 50, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('ERC20: approve to the zero address'), true)
      }
    })

    it('approve could be set to zero amount', async () => {
      await contract.approve(accounts[2], 0, { from: accounts[0] })

      const allowance = await contract.allowance.call(accounts[0], accounts[2])
      assert.strictEqual(allowance.toNumber(), 0)
    })

    it('approve should fail when amount is negative', async () => {
      try {
        await contract.approve(ADDRESS_ZERO, -50, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('value out-of-bounds'), true)
      }
    })

    it('transferFrom should move funds on behalf of the account', async () => {
      await contract.approve(accounts[1], 70, { from: accounts[0] })
      await contract.transferFrom(accounts[0], accounts[2], 30, { from: accounts[1] })

      const acc0Bal = await contract.balanceOf.call(accounts[0])
      const acc1Bal = await contract.balanceOf.call(accounts[1])
      const acc2Bal = await contract.balanceOf.call(accounts[2])

      assert.strictEqual(acc0Bal.toNumber(), 999999955)
      assert.strictEqual(acc1Bal.toNumber(), 15)
      assert.strictEqual(acc2Bal.toNumber(), 30)
    })

    it('transferFrom should emit transfer event', async () => {
      await contract.approve(accounts[1], 20, { from: accounts[0] })
      const res = await contract.transferFrom(accounts[0], accounts[1], 20, { from: accounts[1] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.to, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 20)

      const acc0Bal = await contract.balanceOf.call(accounts[0])
      const acc1Bal = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(acc0Bal.toNumber(), 999999935)
      assert.strictEqual(acc1Bal.toNumber(), 35)
    })

    it('transferFrom should fail when it exceeds allowance', async () => {
      try {
        await contract.approve(accounts[1], 20, { from: accounts[0] })
        await contract.transferFrom(accounts[0], accounts[1], 50, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        console.log(err.message)
        assert.strictEqual(err.message.includes('ERC20: transfer amount exceeds allowance'), true)
      }
    })

    it('transferFrom should fail when amount does not exceed allowance but exceeds balance', async () => {
      try {
        await contract.transfer(accounts[3], 300, { from: accounts[0] })
        await contract.approve(accounts[2], 300, { from: accounts[3] })
        await contract.transfer(accounts[0], 200, { from: accounts[3] })
        await contract.transferFrom(accounts[3], accounts[0], 200, { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('ERC20LockedFunds: amount exceeds balance allowed to be spent'), true)
      }
    })

    it('transferFrom should not fail when amount is zero', async () => {
      const acc0BalBefore = await contract.balanceOf.call(accounts[0])
      const acc1BalBefore = await contract.balanceOf.call(accounts[1])

      await contract.approve(accounts[1], 20, { from: accounts[0] })
      const res = await contract.transferFrom(accounts[0], accounts[1], 0, { from: accounts[1] })
      const txLog = res.logs[0]

      const acc0BalAfter = await contract.balanceOf.call(accounts[0])
      const acc1BalAfter = await contract.balanceOf.call(accounts[1])

      assert.strictEqual(txLog.event, 'Transfer')
      assert.strictEqual(txLog.args.from, accounts[0])
      assert.strictEqual(txLog.args.to, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 0)
      assert.strictEqual(acc0BalBefore.toNumber(), acc0BalAfter.toNumber())
      assert.strictEqual(acc1BalBefore.toNumber(), acc1BalAfter.toNumber())
    })

    it('transferFrom should fail when amount is negative', async () => {
      try {
        await contract.approve(accounts[1], 20, { from: accounts[0] })
        await contract.transferFrom(accounts[0], accounts[1], -30, { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('value out-of-bounds'), true)
      }
    })

    it('increaseAllowance should increase existing allowance', async () => {
      await contract.increaseAllowance(accounts[1], 35, { from: accounts[0] })

      const allowance = await contract.allowance.call(accounts[0], accounts[1])
      assert.strictEqual(allowance.toNumber(), 55)
    })

    it('increaseAllowance should emit approval event', async () => {
      const res = await contract.increaseAllowance(accounts[1], 5, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Approval')
      assert.strictEqual(txLog.args.owner, accounts[0])
      assert.strictEqual(txLog.args.spender, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 60)

      const allowance = await contract.allowance.call(accounts[0], accounts[1])
      assert.strictEqual(allowance.toNumber(), 60)
    })

    it('increaseAllowance should not fail when amount is zero', async () => {
      const res = await contract.increaseAllowance(accounts[1], 0, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Approval')
      assert.strictEqual(txLog.args.owner, accounts[0])
      assert.strictEqual(txLog.args.spender, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 60)
    })

    it('increaseAllowance should fail when amount is negative', async () => {
      try {
        await contract.increaseAllowance(accounts[1], -30, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(err.message.includes('value out-of-bounds'), true)
      }
    })

    it('decreaseAllowance should increase existing allowance', async () => {
      await contract.decreaseAllowance(accounts[1], 35, { from: accounts[0] })

      const allowance = await contract.allowance.call(accounts[0], accounts[1])
      assert.strictEqual(allowance.toNumber(), 25)
    })

    it('decreaseAllowance should emit approval event', async () => {
      const res = await contract.decreaseAllowance(accounts[1], 5, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Approval')
      assert.strictEqual(txLog.args.owner, accounts[0])
      assert.strictEqual(txLog.args.spender, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 20)

      const allowance = await contract.allowance.call(accounts[0], accounts[1])
      assert.strictEqual(allowance.toNumber(), 20)
    })

    it('decreaseAllowance should not fail when amount is zero', async () => {
      const res = await contract.decreaseAllowance(accounts[1], 0, { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'Approval')
      assert.strictEqual(txLog.args.owner, accounts[0])
      assert.strictEqual(txLog.args.spender, accounts[1])
      assert.strictEqual(txLog.args.value.toNumber(), 20)
    })

    it('decreaseAllowance should fail when amount is negative', async () => {
      try {
        await contract.decreaseAllowance(accounts[1], -30, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('value out-of-bounds'), true
        )
      }
    })

    it('decreaseAllowance should fail when amount exceeds allowance', async () => {
      try {
        await contract.decreaseAllowance(accounts[1], 50, { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('ERC20: decreased allowance below zero'), true
        )
      }
    })
  })
})
