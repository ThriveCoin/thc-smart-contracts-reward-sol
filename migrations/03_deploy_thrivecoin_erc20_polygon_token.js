'use strict'

const ThriveCoinERC20TokenPolygon = artifacts.require('ThriveCoinERC20TokenPolygon')

module.exports = async function (deployer, network, accounts) {
  if (['development', 'test'].includes(network)) {
    const owner = accounts[0]
    const config = {
      name_: 'ThriveCoin',
      symbol_: 'THRIVE',
      decimals_: 8,
      cap_: '1000000000',
      childChainManagerProxy_: owner
    }

    await deployer.deploy(ThriveCoinERC20TokenPolygon, ...Object.values(config), { from: owner })
  }

  if (network === 'private') {
    const owner = accounts[0]

    const config = {
      name_: 'ThriveCoin',
      symbol_: 'THRIVE',
      decimals_: 8,
      cap_: '100000000000000000',
      childChainManagerProxy_: owner
    }

    await deployer.deploy(ThriveCoinERC20TokenPolygon, ...Object.values(config), { from: owner })
  }

  if (network === 'mumbai') {
    const owner = accounts[0]

    const config = {
      name_: 'ThriveCoin',
      symbol_: 'THRIVE',
      decimals_: 8,
      cap_: '800000000000000000',
      childChainManagerProxy_: '0xb5505a6d998549090530911180f38aC5130101c6'
    }

    await deployer.deploy(ThriveCoinERC20TokenPolygon, ...Object.values(config), { from: owner })
  }
}
