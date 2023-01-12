'use strict'

const ThriveCoinVestingSchedule = artifacts.require('ThriveCoinVestingSchedule')

module.exports = async function (deployer, network, accounts) {
  if (network === 'goerli') {
    const owner = accounts[0]
    const config = {
      token_: '0x2357cAA4E330678F819440e2555f62CB6E3Ae34D',
      beneficiary_: '0xeFd9434A2B1076D5C84D242b6f4AAb47270EcEAC',
      allocatedAmount_: 0,
      startTime: Math.floor(new Date().getTime() / 1000),
      duration_: 1,
      cliffDuration_: 1,
      interval_: 1,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: true,
      immutableBeneficiary_: true
    }

    await deployer.deploy(ThriveCoinVestingSchedule, ...Object.values(config), { from: owner })
  }

  if (network === 'mumbai') {
    const owner = accounts[0]
    const config = {
      token_: '0x7310E0195Ae639c1883c1B86ec49ae5def56E3d7',
      beneficiary_: '0xeFd9434A2B1076D5C84D242b6f4AAb47270EcEAC',
      allocatedAmount_: 0,
      startTime: Math.floor(new Date().getTime() / 1000),
      duration_: 1,
      cliffDuration_: 1,
      interval_: 1,
      claimed_: 0,
      claimLimit_: 0,
      revocable_: true,
      immutableBeneficiary_: true
    }

    await deployer.deploy(ThriveCoinVestingSchedule, ...Object.values(config), { from: owner })
  }
}
