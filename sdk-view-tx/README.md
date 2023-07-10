# View transactions between layers

This tutorial teaches you how to use [the Patex SDK](https://sdk.patex.io/) to view the transactions passed between L1 (Ethereum) and L2 (Patex) by an address.




## Prerequisites

[The node script](./index.js) makes these assumptions:

1. You have [Node.js](https://nodejs.org/en/) running on your computer, as well as [yarn](https://classic.yarnpkg.com/lang/en/).
1. Access to L1 (Ethereum mainnet) and L2 (Patex) providers.


## Running the script

1. Use `yarn` to download the packages the script needs.

   ```sh
   yarn
   ```

1. Copy `.env.example` to `.env` and specify the URLs for L1 and L2.

1. Use Node to run the script

   ```sh
   node view-tx.js
   ```

### Results

Here are the expected results. 
Note that by the time you read this there might be additional transactions reported.

```
Deposits by address 0xBCf86Fd70a0183433763ab0c14E7a760194f3a9F
tx:0xa35a3085e025e2addd59c5ef2a2e5529be5141522c3cce78a1b137f2eb992d19
	Amount: 0.01 ETH
	Relayed: true



Withdrawals by address 0xBCf86Fd70a0183433763ab0c14E7a760194f3a9F
tx:0x7826399958c6bb3831ef0b02b658e7e3e69f334e20e27a3c14d7caae545c3d0d
	Amount: 1 DAI
	Relayed: false
tx:0xd9fd11fd12a58d9115afa2ad677745b1f7f5bbafab2142ae2cede61f80e90e8a
	Amount: 0.001 ETH
	Relayed: true
```

## Conclusion

You should now know how to identify all the deposits and/or withdrawals done by a specific address.
There are some additional tracing functions in [`CrossChainMessenger`](https://sdk.patex.io/classes/crosschainmessenger), but they are very similar in operation.
