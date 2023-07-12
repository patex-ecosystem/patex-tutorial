#! /usr/local/bin/node

// Withdraw FeeVault ETH from L2 to L1 using the Patex SDK

const ethers = require("ethers")
const patexSDK = require("@eth-patex/sdk")
require('dotenv').config()

// Chains URL's
const l1Url = process.env.L1_SEPOLIA_URL
const l2Url = process.env.L2_PATEX_SEPOLIA_URL

// Global variable because we need them almost everywhere
let crossChainMessenger

const getSigners = async () => {
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url)

    const privateKey = process.env.FEE_WITHDRAWAL_PRIVKEY
    const l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)
    const l2Wallet = new ethers.Wallet(privateKey, l2RpcProvider)

    return [l1Wallet, l2Wallet]
}   // getSigners

const setup = async() => {
  const [l1Signer, l2Signer] = await getSigners()
  crossChainMessenger = new patexSDK.CrossChainMessenger({
      l1ChainId: 11155111,
      l2ChainId: 471100,
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

  console.log("Waiting for status to be READY_TO_PROVE")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(hash,
    patexSDK.MessageStatus.READY_TO_PROVE)
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)  
  await crossChainMessenger.proveMessage(hash)

  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.finalizeMessage(hash)

  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  console.log(`withdrawETH took ${(new Date()-start)/1000} seconds\n\n\n`)  
}     // withdrawFeeVaultETH()


const main = async () => {
    await setup()
    await withdrawFeeVaultETH("0xb25b1db39a6f3849bc9b019c48b9e2a64cfa53e3d232de7d15a094e55e308449")
}  // main



main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





