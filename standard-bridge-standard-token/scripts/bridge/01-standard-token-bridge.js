const hre = require("hardhat");
const fs = require("fs");
const patexSDK = require("@eth-patex/sdk")

async function main() {

    const fname = "node_modules/@eth-patex/contracts-bedrock/artifacts/contracts/universal/PatexMintableERC20.sol/PatexMintableERC20.json"
    
    const ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
    
    const patexMintableERC20Data = JSON.parse(ftext)

    const l2Addr = "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2"

    const l2Contract = new hre.ethers.Contract(l2Addr, patexMintableERC20Data.abi, await ethers.getSigner())   

    const l1Url = process.env.L1_RPC_URL
    const l1RpcProvider = new hre.ethers.providers.JsonRpcProvider(l1Url)
    const hdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC)
    const privateKey = hdNode.derivePath(ethers.utils.defaultPath).privateKey
    const l1Wallet = new ethers.Wallet(privateKey, l1RpcProvider)

    const l1Factory = await ethers.getContractFactory("PatexUselessToken")
    const l1Contract = new ethers.Contract(process.env.L1_TOKEN_ADDRESS, l1Factory.interface, l1Wallet)

    const faucetTx = await l1Contract.faucet()
    const faucetRcpt = await faucetTx.wait()
    console.log(await l1Contract.balanceOf(l1Wallet.address))

    const l1ChainId = (await l1RpcProvider.getNetwork()).chainId
    const l2ChainId = (await ethers.provider.getNetwork()).chainId
    const l2Wallet = await ethers.provider.getSigner()

    const crossChainMessenger = new patexSDK.CrossChainMessenger({
       l1ChainId: l1ChainId,
       l2ChainId: l2ChainId,
       l1SignerOrProvider: l1Wallet,
       l2SignerOrProvider: l2Wallet,
       bedrock: true
    })

    const depositTx1 = await crossChainMessenger.approveERC20(l1Contract.address, l2Addr, 1e9)
    await depositTx1.wait()

    console.log(await l1Contract.balanceOf(l1Wallet.address))
    console.log(await l2Contract.balanceOf(l1Wallet.address))

    const l1Addr = process.env.L1_TOKEN_ADDRESS
    
    const depositTx2 = await crossChainMessenger.depositERC20(l1Addr, l2Addr, 1e9)
    await depositTx2.wait()
    await crossChainMessenger.waitForMessageStatus(depositTx2.hash, patexSDK.MessageStatus.RELAYED)

    console.log(await l1Contract.balanceOf(l1Wallet.address))
    console.log(await l2Contract.balanceOf(l1Wallet.address))

    const withdrawalTx1 = await crossChainMessenger.withdrawERC20(l1Addr, l2Addr, 1e9)
    await withdrawalTx1.wait()

    await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, patexSDK.MessageStatus.READY_TO_PROVE)
    const withdrawalTx2 = await crossChainMessenger.proveMessage(withdrawalTx1.hash)
    await withdrawalTx2.wait()

    await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, patexSDK.MessageStatus.READY_FOR_RELAY)
    const withdrawalTx3 = await crossChainMessenger.finalizeMessage(withdrawalTx1.hash)
    await withdrawalTx3.wait()   

    console.log(await l1Contract.balanceOf(l1Wallet.address))
    console.log(await l2Contract.balanceOf(l1Wallet.address))

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
