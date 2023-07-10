# Estimate the costs of an Patex (L2) transaction

This tutorial teaches you how to use the Patex SDK to estimate the gas costs of L2 transactions. 
This calculation is complicated by the fact that the major cost is the cost of writing the transaction on L1, it doesn't work to just multiply the gas used by the transaction by the gas price, the same way you would on L1. 

## Prerequisites

[The node script](./gas.js) makes these assumptions:

- You have [Node.js](https://nodejs.org/en/) running on your computer, as well as [yarn](https://classic.yarnpkg.com/lang/en/).
- There is network connectivity to a provider on the Patex Sepolia L2 network, and to the npm package registry.


## Running the script

1. Use `yarn` to download the packages you need

   ```sh
   yarn
   ```

1. Copy `.env.example` to `.env` and modify the parameters:

   - `MNEMONIC` is the mnemonic to an account that has enough ETH to pay for the transaction.

   - `PATEX_SEPOLIA_URL` is the URL for Patex Sepolia

1. Use Node to run the script

   ```sh
   node gas.js --network sepolia
   ```

   The command line options are:

   - `--network`: The network to estimate gas on:
     - `sepolia`: The Patex testnet on Sepolia

   - `--verify`: Run the transaction to verify the estimate

   

### Results

Here is an example of results from the main Patex blockchain:


```
ori@Oris-MBP sdk-estimate-gas % ./gas.js --network sepolia --verify
ori@Oris-MacBook-Pro sdk-estimate-gas % ./gas.js --network sepolia --verify
About to get estimates
About to create the transaction
Transaction created and submitted
Transaction processed
Estimates:
   Total gas cost:       58819800030256 wei
      L1 gas cost:       58787232030256 wei
      L2 gas cost:          32568000000 wei

Real values:
   Total gas cost:       58819786030272 wei
      L1 gas cost:       58787232030256 wei
      L2 gas cost:          32554000016 wei

L1 Gas:
      Estimate:       4276
          Real:       4276
    Difference:          0

L2 Gas:
      Estimate:      32568
          Real:      32554
    Difference:        -14
```

The L1 gas cost is over a thousand times the L2 gas cost.
This is typical in Patex transactions, because of the cost ratio between L1 gas and L2 gas.

## Conclusion

Using the Patex SDK you can show users how much a transaction would cost before they submit it.
This is a useful feature in decentralized apps, because it lets people decide if the transaction is worth doing or not.
