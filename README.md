# thc-smart-contracts-sol

## Local env

Initialize configs:
```
bash setup-config.sh
```

Start a local node:
```
npm run local-node # or use Ganache GUI https://www.trufflesuite.com/ganache
```

Migrate contracts:
```
npm run migrate -- --network development
```

Run example:
```
node client/index.js
```

## Deployment and verificatioin

**Note! Use commands below carefully as they interact with test networks**

Migrate on Goerli:
```
npm run migrate -- --network goerli
```

Verify on Goerli:
```
npm run verify -- ThriveCoinERC20Token --network goerli
npm run verify -- ThriveCoinVestingSchedule --network goerli
```

Migrate on Mumbai:
```
npm run migrate -- --network mumbai
```

Verify on Mumbai:
```
npm run verify -- ThriveCoinERC20TokenPolygon --network mumbai
npm run verify -- ThriveCoinVestingSchedule --network mumbai
```

## Testing

```
npm run local-node
npm test
```

## Docs

Smart contract docs can be found in solidity files and also as markdown files
under [./docs/](./docs/) directory
