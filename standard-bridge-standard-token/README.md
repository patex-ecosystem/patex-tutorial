# Bridging your Standard ERC20 token to Patex using the Standard Bridge


For an L1/L2 token pair to work on the Standard Bridge the L2 token contract must implement
[`IL2StandardERC20`](https://github.com/ethereum-patex/patex/blob/develop/packages/contracts/contracts/standards/IL2StandardERC20.sol) interface. 

If you do not need any special processing on L2, just the ability to deposit, transfer, and withdraw tokens, you can use [`PatexMintableERC20Factory`](https://github.com/ethereum-patex/patex/blob/186e46a47647a51a658e699e9ff047d39444c2de/packages/contracts-bedrock/contracts/universal/PatexMintableERC20Factory.sol).


## Deploying the token

1. Download the necessary packages.

   ```sh
   yarn
   ```

1. Copy `.env.example` to `.env`.

   ```sh
   cp .env.example .env
   ```

1. Edit `.env` to set the deployment parameters:

   - `MNEMONIC`, the mnemonic for an account that has enough ETH for the deployment.
   - `L1_ALCHEMY_KEY`, the key for the alchemy application for a Sepolia endpoint.   
   - `L1_TOKEN_ADDRESS`, the address of the L1 ERC20 which you want to bridge.

1. Open the hardhat console.

   ```sh
   yarn hardhat console --network patex-sepolia
   ```

1. Connect to `PatexMintableERC20Factory`. 

   ```js
   fname = "node_modules/@eth-patex/contracts-bedrock/artifacts/contracts/universal/PatexMintableERC20Factory.sol/PatexMintableERC20Factory.json"
   ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
   patexMintableERC20FactoryData = JSON.parse(ftext)
   patexMintableERC20Factory = new ethers.Contract(
      "0x4200000000000000000000000000000000000012", 
      patexMintableERC20FactoryData.abi, 
      await ethers.getSigner())
   ```


1. Deploy the contract.

   ```js
   deployTx = await patexMintableERC20Factory.createStandardL2Token(
      process.env.L1_TOKEN_ADDRESS,
      "Token Name on L2",
      "L2-SYMBOL"
   )
   deployRcpt = await deployTx.wait()
   ```

## Transferring tokens 

1. Get the token addresses.

   ```js
   l1Addr = process.env.L1_TOKEN_ADDRESS
   event = deployRcpt.events.filter(x => x.event == "PatexMintableERC20Created")[0]
   l2Addr = event.args.localToken
   ```

1. Get the data for `PatexMintableERC20`:

   ```js
   fname = "node_modules/@eth-patex/contracts-bedrock/artifacts/contracts/universal/PatexMintableERC20.sol/PatexMintableERC20.json"
   ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
   patexMintableERC20Data = JSON.parse(ftext)
   ```

1. Get the L2 contract.

   ```js
   l2Contract = new ethers.Contract(l2Addr, patexMintableERC20Data.abi, await ethers.getSigner())   
   ```

### Get setup for L1 (provider, wallet, tokens, etc)

1. Get the L1 wallet.

   ```js
   l1Url = process.env.L1_ALCHEMY_KEY
   l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
   hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC)
   privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey
   l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
   ```

1. Get the L1 contract.

   ```js
   l1Factory = await ethers.getContractFactory("PatexUselessToken")
   l1Contract = new ethers.Contract(process.env.L1_TOKEN_ADDRESS, l1Factory.interface, l1Wallet)
   ```

1. Get tokens on L1 (and verify the balance)

   ```js
   faucetTx = await l1Contract.faucet()
   faucetRcpt = await faucetTx.wait()
   await l1Contract.balanceOf(l1Wallet.address)
   ```


### Transfer tokens

Create and use [`CrossDomainMessenger`](https://sdk.patex.io/classes/crosschainmessenger) (the Patex SDK object used to bridge assets).

1. Import the Patex SDK.

   ```js
   patexSDK = require("@eth-patex/sdk")
   ```

1. Create the cross domain messenger.

   ```js
   l1ChainId = (await l1RpcProvider.getNetwork()).chainId
   l2ChainId = (await ethers.provider.getNetwork()).chainId
   l2Wallet = await ethers.provider.getSigner()
   crossChainMessenger = new patexSDK.CrossChainMessenger({
      l1ChainId: l1ChainId,
      l2ChainId: l2ChainId,
      l1SignerOrProvider: l1Wallet,
      l2SignerOrProvider: l2Wallet,
      bedrock: true
   })
   ```

#### Deposit (from L1 to Patex)

1. Give the L1 bridge an allowance to use the user's token.
   The L2 address is necessary to know which bridge is responsible and needs the allowance.

   ```js
   depositTx1 = await crossChainMessenger.approveERC20(l1Contract.address, l2Addr, 1e9)
   await depositTx1.wait()
   ```

1. Check your balances on L1 and L2.
   Note that `l1Wallet` and `l2Wallet` have the same address, so it doesn't matter which one we use.

   ```js
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2Contract.balanceOf(l1Wallet.address)
   ```   

1. Do the actual deposit

   ```js
   depositTx2 = await crossChainMessenger.depositERC20(l1Addr, l2Addr, 1e9)
   await depositTx2.wait()
   ```

1. Wait for the deposit to be relayed.

   ```js
   await crossChainMessenger.waitForMessageStatus(depositTx2.hash, patexSDK.MessageStatus.RELAYED)
   ```

1. Check your balances on L1 and L2.

   ```js
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2Contract.balanceOf(l1Wallet.address)
   ```

#### Withdrawal (from Patex to L1)

1. Initiate the withdrawal on L2

   ```js
   withdrawalTx1 = await crossChainMessenger.withdrawERC20(l1Addr, l2Addr, 1e9)
   await withdrawalTx1.wait()
   ```

1. Wait until the root state is published on L1, and then prove the withdrawal.
   This is likely to take less than 240 seconds.

   ```js
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, patexSDK.MessageStatus.READY_TO_PROVE)
   withdrawalTx2 = await crossChainMessenger.proveMessage(withdrawalTx1.hash)
   await withdrawalTx2.wait()
   ```

1. Wait the fault challenge period (a short period on Sepolia, seven days on the production network) and then finish the withdrawal.

   ```js
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, patexSDK.MessageStatus.READY_FOR_RELAY)
   withdrawalTx3 = await crossChainMessenger.finalizeMessage(withdrawalTx1.hash)
   await withdrawalTx3.wait()   
   ```


1. Check your balances on L1 and L2.
   The balance on L2 should be back to zero.

   ```js
   await l1Contract.balanceOf(l1Wallet.address) 
   await l2Contract.balanceOf(l1Wallet.address)
   ```
