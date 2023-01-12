'use strict'

const ThriveCoinERC20Token = artifacts.require('ThriveCoinERC20Token')

module.exports = async function (deployer, network, accounts) {
  if (['development', 'test'].includes(network)) {
    const owner = accounts[0]
    const config = {
      name_: 'ThriveCoin',
      symbol_: 'THRIVE',
      decimals_: 8,
      totalSupply_: '1000000000',
      cap_: '1000000000'
    }

    await deployer.deploy(ThriveCoinERC20Token, ...Object.values(config), { from: owner })
  }

  if (network === 'private') {
    const owner = accounts[0]

    const config = {
      name_: 'ThriveCoin',
      symbol_: 'THRIVE',
      decimals_: 8,
      totalSupply_: '100000000000000000',
      cap_: '100000000000000000'
    }

    await deployer.deploy(ThriveCoinERC20Token, ...Object.values(config), { from: owner })
  }

  if (network === 'goerli') {
    const owner = accounts[0]

    const config = {
      name_: 'ThriveCoin',
      symbol_: 'THRIVE',
      decimals_: 8,
      totalSupply_: '800000000000000000',
      cap_: '800000000000000000'
    }

    await deployer.deploy(ThriveCoinERC20Token, ...Object.values(config), { from: owner })
  }
}
