const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying CredentialNFT with service wallet:', deployer.address);

  const CredentialNFT = await hre.ethers.getContractFactory('CredentialNFT');
  const contract = await CredentialNFT.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('CredentialNFT deployed to:', address);
  console.log('Set CREDENTIAL_CONTRACT_ADDRESS =', address, 'in frontend/.env.local');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
