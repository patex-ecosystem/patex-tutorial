#! /usr/local/bin/node

// Withdraw FeeVault ETH from L2 to L1 using the Patex SDK

const ethers = require("ethers")
const patexSDK = require("@eth-patex/sdk")
require('dotenv').config()

// Loading network constants from .env
const L1_PATEX_URL= process.env.NETWORK === 'mainnet' ? process.env.L1_MAINNET_URL : process.env.L1_SEPOLIA_URL;
const L2_PATEX_URL = process.env.NETWORK === 'mainnet' ? process.env.L2_MAINNET_URL : process.env.L2_SEPOLIA_URL;
const FEE_WITHDRAWAL_PRIVKEY = process.env.NETWORK === 'mainnet' ? process.env.MAINNET_FEE_WITHDRAWAL_PRIVKEY : process.env.SEPOLIA_FEE_WITHDRAWAL_PRIVKEY;
const L1_CHAIN_ID = process.env.NETWORK === 'mainnet' ? process.env.L1_MAINNET_CHAIN_ID : process.env.L1_SEPOLIA_CHAIN_ID;
const L2_CHAIN_ID = process.env.NETWORK === 'mainnet' ? process.env.L2_MAINNET_CHAIN_ID : process.env.L2_SEPOLIA_CHAIN_ID;

// Global variable because we need them almost everywhere
let crossChainMessenger

const getSigners = async () => {
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(L1_PATEX_URL)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(L2_PATEX_URL)

    const privateKey = FEE_WITHDRAWAL_PRIVKEY
    const l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
    const l2Wallet = new ethers.Wallet(privateKey, l2RpcProvider)

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

/**
 * hash
 * @type {string}
 * Transaction hash of withdraw() call from FeeVault's based contracts:
 * 1.L1FeeVault
 * Address: 0x420000000000000000000000000000000000001a
 *
 * 2.BaseFeeVault
 * Address: 0x4200000000000000000000000000000000000019
 *
 * 3.SequencerFeeVault
 * Address: 0x4200000000000000000000000000000000000011
 */
const withdrawFeeVaultETH = async (hash) => {
  
  console.log("Withdraw FeeVault ETH")
  console.log("Withdraw prove hash: ", hash)
  const start = new Date()

  /*console.log("Waiting for status to be READY_TO_PROVE")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(hash,
    patexSDK.MessageStatus.READY_TO_PROVE)
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)  
  await crossChainMessenger.proveMessage(hash)*/

  console.log("In the challenge period, waiting for status READY_FOR_RELAY")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(hash,
        patexSDK.MessageStatus.READY_FOR_RELAY)

    console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.finalizeMessage(hash)

  const tx = await crossChainMessenger.finalizeMessage(hash)
  const receipt = await tx.wait()
  console.log(receipt)

  console.log(`withdrawETH took ${(new Date()-start)/1000} seconds\n\n\n`)  
}     // withdrawFeeVaultETH()


const main = async () => {
    await setup()
    await withdrawFeeVaultETH("0xeff855504ae75e04b069b9485ffa5846a04f33413948ccc1fe550552366f1836")
}  // main



main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





