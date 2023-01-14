'use strict'

const fetch = require('node-fetch')
const ganache = require('ganache-core')
const { promisify } = require('util')
const { web3Utils } = require('@thrivecoin/web3-utils')

const bootNode = async ({
  balance = 1000,
  chainId = 5777,
  mnemonic = 'excuse kind upper tray certain track inject lounge nice observe phrase moral',
  accountCount = 10,
  port = 7545
} = {}) => {
  const ganacheSrv = ganache.server({
    default_balance_ether: balance,
    network_id: chainId,
    _chainIdRpc: chainId,
    _chainId: chainId,
    mnemonic,
    total_accounts: accountCount
  })

  ganacheSrv.listenAsync = promisify(ganacheSrv.listen.bind(ganacheSrv))
  ganacheSrv.closeAsync = promisify(ganacheSrv.close.bind(ganacheSrv))

  await ganacheSrv.listenAsync(port)
  return ganacheSrv
}

const deployContract = async (web3, contractJson, contractArgs, caller) => {
  const contractDeployment = web3Utils.getContract(web3, contractJson.abi, '')
    .deploy({ data: contractJson.bytecode, arguments: Object.values(contractArgs) })
  const gas = await contractDeployment.estimateGas({ from: caller })
  const gasPrice = await web3.eth.getGasPrice()

  const res = await contractDeployment.send({ from: caller, gas, gasPrice })

  return web3Utils.getContract(web3, contractJson.abi, res.options.address)
}

const etherscanApi = async ({ apiKey, apiModule, apiAction, network }) => {
  // see https://docs.etherscan.io/api-endpoints/gas-tracker#get-gas-oracle
  let apiUrl = ''
  switch (network) {
    case 'ethereum':
      apiUrl = 'https://api.etherscan.io'
      break
    case 'goerli':
      apiUrl = 'https://api-goerli.etherscan.io'
      break
    case 'polygon':
      apiUrl = 'https://api.polygonscan.com'
      break
    case 'mumbai':
      apiUrl = 'https://api-testnet.polygonscan.com'
      break
    default:
      throw new Error('network not supported')
  }

  const qs = new URLSearchParams()
  qs.set('module', apiModule)
  qs.set('action', apiAction)
  qs.set('apikey', apiKey)

  const resp = await fetch(`${apiUrl}/api?${qs.toString()}`, { method: 'GET' })
  const json = await resp.json()
  return json
}

const etherscanLastPrice = async ({ apiKey, network }) => {
  const res = await etherscanApi({ apiKey, apiModule: 'stats', apiAction: 'ethprice', network })
  return res.result.ethusd
}
const etherscanGasPrice = async ({ apiKey, network }) => {
  const res = await etherscanApi({ apiKey, apiModule: 'gastracker', apiAction: 'gasoracle', network })
  return res.result.ProposeGasPrice
}

module.exports = {
  bootNode,
  deployContract,
  etherscanApi,
  etherscanLastPrice,
  etherscanGasPrice
}
