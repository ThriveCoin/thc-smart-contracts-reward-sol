# thc-smart-contracts-reward-sol

ThriveCoin Reward Smart Contracts

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

## Deployment and verification

**Note! Use commands below carefully as they interact with test networks**

Migrate on Goerli:
```
npm run migrate -- --network goerli
```

Verify on Goerli:
```
npm run verify -- <Contract> --network goerli
```

Migrate on Mumbai:
```
npm run migrate -- --network mumbai
```

Verify on Mumbai:
```
npm run verify -- <Contract> --network mumbai
```

## Testing

```
npm run local-node
npm test
```

## Docs

Smart contract docs can be found in solidity files and also as markdown files
under [./docs/](./docs/) directory
