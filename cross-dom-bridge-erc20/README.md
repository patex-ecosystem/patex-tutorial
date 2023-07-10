# Bridging ERC-20 tokens with the Patex SDK

This tutorial teaches you how to use the [Patex SDK](https://sdk.patex.io/) to transfer ERC-20 tokens between Layer 1 (Ethereum) and Layer 2 (Patex).
While you *could* use the bridge contracts directly, a simple usage error can cause you to lock tokens in the bridge forever and lose their value. 
The SDK provides transparent safety rails to prevent that mistake.



**Warning:** The standard bridge does *not* support certain ERC-20 configurations:

- [Fee on transfer tokens](https://github.com/d-xo/weird-erc20#fee-on-transfer)
- [Tokens that modify balances without emitting a Transfer event](https://github.com/d-xo/weird-erc20#balance-modifications-outside-of-transfers-rebasingairdrops)

## Setup

1. Ensure your computer has:
   - [`git`](https://git-scm.com/downloads)
   - [`node`](https://nodejs.org/en/)
   - [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

1. Clone this repository and enter it.

   ```sh
   git https://github.com/patex-ecosystem/patex-tutorial.git
   cd patex-tutorial/cross-dom-bridge-erc20
   ```

1. Install the necessary packages.

   ```sh
   npm i
   ```

1. Go to [Alchemy](https://www.alchemy.com/) and create two applications:

   - An application on Sepolia

   Keep a copy of the two keys.

1. Copy `.env.example` to `.env` and edit it:

   1. Set `MNEMONIC` to point to an account that has ETH on the Sepolia test network and the Patex Sepolia test network.
   1. Set `L1_SEPOLIA_URL`
   1. Set `L2_PATEX_SEPOLIA_URL`

## Run the sample code

The sample code is in `index.js`, execute it.
After you execute it, wait. It is not unusual for each operation to take minutes on Sepolia.
On the production network the withdrawals take around a week each, because of the challenge period.

### Expected output

The output from the script should be similar to:

```
Deposit ERC20
OUTb on L1:     OUTb on L2:
You don't have enough OUTb on L1. Let's call the faucet to fix that
Faucet tx: 0xb155e17116d592846770ed12aa926467315bcd1ac23ba48317d365d8ee3d0605
New L1 OUTb balance: 1000
Allowance given by tx 0x4a2543271590ede5575bbb502949b97caa8a75aac43aa2c445091bdf057e7669
Time so far 15.968 seconds
Deposit transaction hash (on L1): 0x80da95d06cfe8504b11295c8b3926709ccd6614b23863cdad721acd5f53c9052
Waiting for status to change to RELAYED
Time so far 35.819 seconds
OUTb on L1:999     OUTb on L2:1
depositERC20 took 65.544 seconds


Withdraw ERC20
OUTb on L1:999     OUTb on L2:1
Transaction hash (on L2): 0x548f9eed01498e1b015aaf2f4b8c538f59a2ad9f450aa389bb0bde9b39f31053
Waiting for status to be READY_TO_PROVE
Time so far 8.03 seconds
Time so far 300.833 seconds
In the challenge period, waiting for status READY_FOR_RELAY
Time so far 304.811 seconds
Ready for relay, finalizing message now
Time so far 331.821 seconds
Waiting for status to change to RELAYED
Time so far 334.525 seconds
OUTb on L1:1000     OUTb on L2:
withdrawERC20 took 355.772 seconds
```

As you can see, the total running time is about six minutes.
It could be longer.

## Conclusion

You should now be able to write applications that use our SDK and bridge to transfer ERC-20 assets between layer 1 and layer 2. 