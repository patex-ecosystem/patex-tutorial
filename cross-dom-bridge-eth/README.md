# Bridging ETH with the Patex SDK

This tutorial teaches you how to use the [Patex SDK](https://sdk.patex.io/) to transfer ETH between Layer 1 (Ethereum) and Layer 2 (Patex).

## Setup

1. Ensure your computer has:
   - [`git`](https://git-scm.com/downloads)
   - [`node`](https://nodejs.org/en/)
   - [`yarn`](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)

1. Clone this repository and enter it.

   ```sh
   git clone https://github.com/patex-ecosystem/patex-tutorial.git
   cd patex-tutorial/cross-dom-bridge-eth
   ```

1. Install the necessary packages.

   ```sh
   yarn
   ```

1. Go to [Alchemy](https://www.alchemy.com/) and create two applications:

   - An application on Sepolia
   - An application on Patex Sepolia

   Keep a copy of the two keys.

1. Copy `.env.example` to `.env` and edit it

## Run the sample code

The sample code is in `index.js`, execute it.
After you execute it, wait. It is not unusual for each operation to take minutes on Sepolia.
On the production network the withdrawals take around a week each.

### Expected output

When running on Sepolia, the output from the script should be similar to:

```
Deposit ETH
On L1:410251220 Gwei    On L2:29020983 Gwei
Transaction hash (on L1): 0x4c057d3aaec665c1123d2dec1d8d82c64e567681f7c48fc1aadd007961bf5f02
Waiting for status to change to RELAYED
Time so far 14.79 seconds
On L1:410078008 Gwei    On L2:29021983 Gwei
depositETH took 43.088 seconds


Withdraw ETH
On L1:410078008 Gwei    On L2:29021983 Gwei
Transaction hash (on L2): 0x18ec96d32811a684dab28350d7935f1fdd86533840a53f272aa7870724ae2a9c
Waiting for status to be READY_TO_PROVE
Time so far 7.197 seconds
Time so far 290.453 seconds
In the challenge period, waiting for status READY_FOR_RELAY
Time so far 294.328 seconds
Ready for relay, finalizing message now
Time so far 331.383 seconds
Waiting for status to change to RELAYED
Time so far 333.753 seconds
On L1:419369936 Gwei    On L2:18842420 Gwei
withdrawETH took 342.143 seconds

```

As you can see, the total running time is about twenty minutes.
