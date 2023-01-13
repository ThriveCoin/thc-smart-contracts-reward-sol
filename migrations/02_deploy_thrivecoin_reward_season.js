'use strict'

const ThriveCoinRewardSeason = artifacts.require('ThriveCoinRewardSeason')

module.exports = async function (deployer, network, accounts) {
  if (['development', 'test'].includes(network)) {
    const owner = accounts[0]

    const config = {
      _seasonCloseDate: Math.floor(Date.now() / 1000) + 86400
    }
    await deployer.deploy(ThriveCoinRewardSeason, ...Object.values(config), { from: owner })
  }
}
