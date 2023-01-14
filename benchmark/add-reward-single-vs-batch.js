'use strict'

const _ = require('lodash')
const { nBN } = require('@bitfinex/lib-js-util-math')
const { web3Utils } = require('@thrivecoin/web3-utils')
const yargs = require('yargs')
  .option('samples', { alias: 's', default: 10, demandOption: true })
  .option('batch-size', { alias: 'b', default: 50, demandOption: true })
  .option('verbose', { alias: 'v', default: false, type: 'boolean', demandOption: false })

const { bootNode, deployContract, etherscanLastPrice, etherscanGasPrice } = require('./helper')
const { api_keys: { etherscan: etherscanApiKey } } = require('../truffle-config')

const main = async () => {
  const argv = yargs.argv
  const ganacheSrv = await bootNode({
    accountCount: argv.samples
  })
  const web3 = web3Utils.getProvider(ganacheSrv.provider)
  const accounts = await web3.eth.getAccounts()
  const [account] = accounts

  const contractJson = require('../build/contracts/ThriveCoinRewardSeason.json')
  const contracts = []
  for (let i = 0; i < 2; i++) {
    const contract = await deployContract(web3, contractJson, {
      defaultDestination: account,
      closeDate: Math.floor(Date.now() / 1000) + 43200,
      claimCloseDate: Math.floor(Date.now() / 1000) + 86400
    }, account)

    contracts.push(contract)
  }
  const [ethPrice, gasPriceGwei] = await Promise.all([
    etherscanLastPrice({ apiKey: etherscanApiKey, network: 'ethereum' }),
    etherscanGasPrice({ apiKey: etherscanApiKey, network: 'ethereum' })
  ])
  const gasPriceEth = web3.utils.fromWei(web3.utils.toWei(gasPriceGwei, 'Gwei'), 'ether')

  const sampleTests = accounts.map(account => ({ owner: account, destination: account, amount: '5' }))
  const sampleTestsBatch = _.chunk(sampleTests, argv.batchSize)

  let addRewardGas = 0
  let i = 0
  for (const userReward of sampleTests) {
    if (argv.verbose) {
      i++
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write('processing single entry ' + i)
    }
    const res = await contracts[0].methods.addReward(userReward).send({ from: account, gas: 5606000 })
    addRewardGas += res.gasUsed
  }

  let addRewardBatchGas = 0
  i = 0
  for (const userRewardBatch of sampleTestsBatch) {
    if (argv.verbose) {
      i++
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write('processing batch entry ' + i)
    }
    const res = await contracts[1].methods.addRewardBatch(userRewardBatch).send({ from: account, gas: 5606000 })
    addRewardBatchGas += res.gasUsed
  }

  const addRewardGasAvg = nBN(addRewardGas).div(sampleTests.length).dp(0).toNumber()
  const addRewardBatchGasAvg = nBN(addRewardBatchGas).div(sampleTestsBatch.length).dp(0).toNumber()

  const addRewardGasEth = nBN(gasPriceEth).times(addRewardGas).toNumber()
  const addRewardBatchGasEth = nBN(gasPriceEth).times(addRewardBatchGas).toNumber()
  const addRewardGasAvgEth = nBN(gasPriceEth).times(addRewardGasAvg).toNumber()
  const addRewardBatchGasAvgEth = nBN(gasPriceEth).times(addRewardBatchGasAvg).toNumber()

  const addRewardGasUsd = nBN(ethPrice).times(addRewardGasEth).toNumber()
  const addRewardBatchGasUsd = nBN(ethPrice).times(addRewardBatchGasEth).toNumber()
  const addRewardGasAvgUsd = nBN(ethPrice).times(addRewardGasAvgEth).toNumber()
  const addRewardBatchGasAvgUsd = nBN(ethPrice).times(addRewardBatchGasAvgEth).toNumber()

  if (argv.verbose) {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
  }
  console.log('----')
  console.log('samples', argv.samples)
  console.log('batch size', argv.batchSize)
  console.log('gas avg price (eth)', gasPriceEth)
  console.log('eth last price (usd)', ethPrice)
  console.log('----')
  console.log('addReward gas', addRewardGas)
  console.log('addRewardBatch gas', addRewardBatchGas)
  console.log('difference addReward - addRewardBatch', addRewardGas - addRewardBatchGas)
  console.log('addReward avg gas', addRewardGasAvg)
  console.log('addRewardBatch avg gas', addRewardBatchGasAvg)
  console.log('----')
  console.log('addReward cost (eth)', addRewardGasEth)
  console.log('addRewardBatch cost (eth)', addRewardBatchGasEth)
  console.log('difference addReward - addRewardBatch (eth)', addRewardGasEth - addRewardBatchGasEth)
  console.log('addReward avg gas (eth)', addRewardGasAvg)
  console.log('addRewardBatch avg gas (eth)', addRewardBatchGasAvg)
  console.log('----')
  console.log('addReward cost (usd)', addRewardGasUsd)
  console.log('addRewardBatch cost (usd)', addRewardBatchGasUsd)
  console.log('difference addReward - addRewardBatch (usd)', addRewardGasUsd - addRewardBatchGasUsd)
  console.log('addReward avg gas (usd)', addRewardGasAvgUsd)
  console.log('addRewardBatch avg gas (usd)', addRewardBatchGasAvgUsd)
  console.log('----')

  await ganacheSrv.closeAsync()
}

main().catch(console.error)
