const hre = require("hardhat");
const fs = require("fs");

async function main() {

    const fname = "node_modules/@eth-patex/contracts-bedrock/artifacts/contracts/universal/PatexMintableERC20Factory.sol/PatexMintableERC20Factory.json"
    
    const ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
    
    const patexMintableERC20FactoryData = JSON.parse(ftext)

    const patexMintableERC20Factory = new ethers.Contract(
        "0x4200000000000000000000000000000000000012", 
        patexMintableERC20FactoryData.abi, 
        await hre.ethers.getSigner()
    )
    
    const deployTx = await patexMintableERC20Factory.createStandardL2Token(
        process.env.L1_TOKEN_ADDRESS,
        "PatexUselessToken-1", 
        "PUT-1"
    )

    await deployTx.wait()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
