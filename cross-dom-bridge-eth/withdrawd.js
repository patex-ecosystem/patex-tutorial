#! /usr/local/bin/node

// Withdraw FeeVault ETH from L2 to L1 using the Patex SDK

const ethers = require("ethers")
const patexSDK = require("@eth-patex/sdk")
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



// Chains providers
var L1Provider = new ethers.providers.JsonRpcProvider(L1_PATEX_URL);
var L2Provider = new ethers.providers.JsonRpcProvider(L2_PATEX_URL);

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
  crossChainMessenger = new patexSDK.CrossChainMessenger({
      l1ChainId: L1_CHAIN_ID,
      l2ChainId: L2_CHAIN_ID,
      l1SignerOrProvider: l1Signer,
      l2SignerOrProvider: l2Signer,
      bedrock: true
  })
}    // setup
const getBalance = async(address) => {
    balance = await L2Provider.getBalance(address)
    // convert a currency unit from wei to ether
    const balanceInEth = ethers.utils.formatEther(balance)
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
        process.env.FEE_VAUL_ADDRESS,
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
        to: process.env.FEE_VAUL_ADDRESS,
        chainId: ethers.BigNumber.from(L2_CHAIN_ID).toNumber(),
    };
    console.log(transaction)

    const  signed = await wallet.signTransaction(transaction);
    const res = await L2Provider.sendTransaction(signed);
    console.log(res);

    return res.hash
} // withdrawPartL2

const withdrawPartL1 = async (hash) => {
  
  console.log("Withdraw part L1")
  console.log("Withdraw prove hash: ", hash)
  const start = new Date()

  console.log("Waiting for status to be READY_TO_PROVE")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(hash,
    patexSDK.MessageStatus.READY_TO_PROVE)
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)  
  await crossChainMessenger.proveMessage(hash)

  //waiting for complete finalization period
  await new Promise(resolve => setTimeout(resolve, process.env.FINALIZATION_PERIOD));

  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.finalizeMessage(hash)

  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  console.log(`withdrawETH took ${(new Date()-start)/1000} seconds\n\n\n`)  
}     // withdrawFeeVaultETH()

const transferToBatcher = async()=> {

}

const main = async () => {
    await setup()

    while (true) {
        console.log("Checking balance")
        let balance = await getBalance(process.env.FEE_VAUL_ADDRESS)
        if (balance > process.env.WITHDRAW_THRESHOLD) {
            console.log("Have coins for withdraw: ", balance)
            // if we've more than 1 ETH then process withdrawal
            hash = await withdrawPartL2()

            // Waiting while pt-proposer send proving transaction
            await new Promise(resolve => setTimeout(resolve, process.env.PT_PROPOSER_PERIOD));

            await withdrawPartL1(hash)
            await transferToBatcher()
            console.log("Withdraw completed! \n\n\n")
        }

        // Waiting... and check balance again
        await new Promise(resolve => setTimeout(resolve, process.env.CHECKING_BALANCE_PERIOD));
    }

}  // main



main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





