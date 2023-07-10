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

const getProviders = async () => {
    const l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
    const l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url)

    return [l1RpcProvider, l2RpcProvider]
}   // getProviders

const setup = async() => {
  const [l1Provider, l2Provider] = await getProviders()
  crossChainMessenger = new patexSDK.CrossChainMessenger({
      l1ChainId: 11155111,
      l2ChainId: 471100,
      l1SignerOrProvider: l1Provider,
      l2SignerOrProvider: l2Provider,
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

  console.log("In the challenge period, waiting for status READY_FOR_RELAY") 
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  await crossChainMessenger.waitForMessageStatus(hash,
                                                patexSDK.MessageStatus.READY_FOR_RELAY) 
  console.log("Ready for relay, finalizing message now")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)  
  await crossChainMessenger.finalizeMessage(hash)

  console.log("Waiting for status to change to RELAYED")
  console.log(`Time so far ${(new Date()-start)/1000} seconds`)
  console.log(`withdrawETH took ${(new Date()-start)/1000} seconds\n\n\n`)  
}     // withdrawFeeVaultETH()


const main = async () => {
    await setup()
    await withdrawFeeVaultETH("withdraw_trx_hash")
}  // main



main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })





