#! /usr/local/bin/node

// Withdraw FeeVault ETH from L2 to L1 using the Patex SDK

const ethers = require("ethers")
const patexSDK = require("@eth-patex/sdk")
const {BigNumber} = require("@ethersproject/bignumber");
require('dotenv').config()

// Withdrawal ABI for FeeVault contract
const withdrawalAbi = [
    {
        "inputs": [],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Loading network constants from .env
const L1_PATEX_URL= process.env.NETWORK === 'mainnet' ? process.env.L1_MAINNET_URL : process.env.L1_SEPOLIA_URL;
const L2_PATEX_URL = process.env.NETWORK === 'mainnet' ? process.env.L2_MAINNET_URL : process.env.L2_SEPOLIA_URL;
const FEE_WITHDRAWAL_PRIVKEY = process.env.NETWORK === 'mainnet' ? process.env.MAINNET_FEE_WITHDRAWAL_PRIVKEY : process.env.SEPOLIA_FEE_WITHDRAWAL_PRIVKEY;
const L1_CHAIN_ID = process.env.NETWORK === 'mainnet' ? process.env.L1_MAINNET_CHAIN_ID : process.env.L1_SEPOLIA_CHAIN_ID;
const L2_CHAIN_ID = process.env.NETWORK === 'mainnet' ? process.env.L2_MAINNET_CHAIN_ID : process.env.L2_SEPOLIA_CHAIN_ID;
const BATCHER_ADDRESS = process.env.NETWORK === 'mainnet' ? process.env.MAINNET_BATCHER_ADDRESS : process.env.SEPOLIA_BATCHER_ADDRESS;



// Chains providers
var L1Provider = new ethers.providers.JsonRpcProvider(L1_PATEX_URL);
var L2Provider = new ethers.providers.JsonRpcProvider(L2_PATEX_URL);
var balanceInEth = "";

// Global variable because we need them almost everywhere
let crossChainMessenger

const getSigners = async () => {

    const privateKey = FEE_WITHDRAWAL_PRIVKEY
    const l1Wallet = new ethers.Wallet(privateKey, L1Provider)
    const l2Wallet = new ethers.Wallet(privateKey, L2Provider)

    return [l1Wallet, l2Wallet]
}   // getSigners

const setup = async() => {
  const [l1Signer, l2Signer] = await getSigners()

  console.log(`Setting up patex SDK:`)
  console.log(`\tL1_CHAIN_ID = ${L1_CHAIN_ID}, L2_CHAIN_ID = ${L2_CHAIN_ID}`)
  console.log(`\tL1_PATEX_URL = ${L1_PATEX_URL}, L2_PATEX_URL = ${L2_PATEX_URL}`)
  console.log(`\tBATCHER_ADDRESS = ${BATCHER_ADDRESS}`)

  crossChainMessenger = new patexSDK.CrossChainMessenger({
      l1ChainId: L1_CHAIN_ID,
      l2ChainId: L2_CHAIN_ID,
      l1SignerOrProvider: l1Signer,
      l2SignerOrProvider: l2Signer,
      bedrock: true
  })
}    // setup
const getBalance = async(address) => {
    let balance = await L2Provider.getBalance(address)
    // convert a currency unit from wei to ether
    balanceInEth = ethers.utils.formatEther(balance)
    console.log(`balance: ${balanceInEth} ETH`)
    return balanceInEth
}
const withdrawPartL2 = async () => {
    console.log("Withdraw part L2")
    const wallet = new ethers.Wallet(FEE_WITHDRAWAL_PRIVKEY, L2Provider)
    const sender = await wallet.getAddress()
    const {gasPrice, ...feeData} = await L2Provider.getFeeData();
    const nonce = await L2Provider.getTransactionCount(sender, 'pending');

    const feeContractInstance = new ethers.Contract(
        process.env.FEE_VAULT_ADDRESS,
        withdrawalAbi,
        L2Provider,
    );
    const populated = await feeContractInstance.populateTransaction.withdraw()
    console.log(populated);
    const gasLimit = await L2Provider.estimateGas({ from: sender, ...populated });
    const transaction = {
        ...populated,
        ...feeData,
        type: 2,
        gasLimit,
        value: ethers.BigNumber.from('0').toHexString(),
        nonce,
        from: sender,
        to: process.env.FEE_VAULT_ADDRESS,
        chainId: ethers.BigNumber.from(L2_CHAIN_ID).toNumber(),
    };
    console.log(transaction)

    const signed = await wallet.signTransaction(transaction)
    const res = await L2Provider.sendTransaction(signed);
    const receipt = await res.wait()
    console.log("Receipt: ", receipt);

    return res.hash
} // withdrawPartL2

const withdrawPartL1 = async (txHash) => {
  
  console.log("Withdraw part L1")
  console.log("Withdraw L2 transaction hash: ", txHash)
  const start = new Date()

  console.log("Waiting for status to be READY_TO_PROVE")
  const status = await crossChainMessenger.waitForMessageStatus(txHash, patexSDK.MessageStatus.READY_TO_PROVE)
  console.log(`Status: ${patexSDK.MessageStatus[status]}`)

  const proveTx = await crossChainMessenger.proveMessage(txHash)
  const proveReceipt = await proveTx.wait()
  console.log('Prove receipt', proveReceipt)

  // log status every hour
  const finalizeInterval = setInterval(async () => {
            const currentStatus = await crossChainMessenger.getMessageStatus(txHash)
            console.log(`Message status: ${patexSDK.MessageStatus[currentStatus]}`)
        }, 60*60*1000)

  try {
      await crossChainMessenger.waitForMessageStatus(
          txHash,
          patexSDK.MessageStatus.READY_FOR_RELAY
      )
  } finally {
      clearInterval(finalizeInterval)
  }

  //After READY_FOR_RELAY status finalizeMessage raise an error on testnet: proven withdrawal finalization period has not elapsed.
  // So wait additional 5 minutes and finalize...
  await new Promise(resolve => setTimeout(resolve, 5*60*1000));

  const tx = await crossChainMessenger.finalizeMessage(txHash)
  const receipt = await tx.wait()
  console.log('Finalize receipt', receipt)
  console.log('Finalized withdrawal')

} // withdrawPartL1

const transferToBatcher = async()=> {
    // Create a wallet instance
    let wallet = new ethers.Wallet(FEE_WITHDRAWAL_PRIVKEY, L1Provider)

    // Create a transaction object
    let transaction = {
        to: BATCHER_ADDRESS,
        // Convert currency unit from ether to wei
        value: ethers.utils.parseEther(balanceInEth)
    }

    // Send a transaction
    const res = await wallet.sendTransaction(transaction)
    console.log(res);
    console.log(`Transferred to Batcher address ${BATCHER_ADDRESS}, amount ${balanceInEth} ETH.`)
} //transferToBatcher

const main = async () => {
    await setup()

    while (true) {
        console.log("Checking balance")
        let balance = await getBalance(process.env.FEE_VAULT_ADDRESS)
        if (balance > process.env.WITHDRAW_THRESHOLD) {
            console.log("Have coins for withdraw: ", balance)

            let txHash = await withdrawPartL2()
            console.log("Completed part L2 of withdrawal, hash:", txHash)

            await withdrawPartL1(txHash)
            console.log("Completed part L1 of withdrawal")

            await transferToBatcher()
            console.log("Withdraw and transfer completed! \n\n\n")
        }

        // Waiting... and check balance again
        console.log("Waiting checking balance period (ms):", process.env.CHECKING_BALANCE_PERIOD)
        await new Promise(resolve => setTimeout(resolve, process.env.CHECKING_BALANCE_PERIOD));
    }

}  // main



main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





