'use strict'

const Web3 = require('web3')
const conf = require('./config.json')
const thcConf = require('../build/contracts/ThriveCoinERC20Token.json')
const thcAbi = thcConf.abi
const thcAddress = thcConf.networks[conf.networkId].address

/**
 * @param {Web3.default} web3
 */
const main = async (web3) => {
  const thc = new web3.eth.Contract(thcAbi, thcAddress)

  const name = await thc.methods.name().call()
  const symbol = await thc.methods.symbol().call()
  const decimals = await thc.methods.decimals().call()
  const totalSupply = await thc.methods.totalSupply().call()
  const owner = await thc.methods.owner().call()
  const ownerBalance = await thc.methods.balanceOf(owner).call()

  console.log('name -', name)
  console.log('symbol -', symbol)
  console.log('decimals -', decimals)
  console.log('total supply -', totalSupply)
  console.log('owner -', owner)
  console.log('owner balance -', ownerBalance)
}

const web3 = new Web3(new Web3.providers.HttpProvider(conf.provider))
main(web3).catch(console.error)
