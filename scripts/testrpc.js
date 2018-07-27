const ganache = require("ganache-cli");
const config = require("../deploy-config.json");
const HDWalletProvider = require('truffle-hdwallet-provider')

const seedToPrivateKey = (seed) => {
  const provider = new HDWalletProvider(seed)
  const addr = provider.addresses[0];
  const private = provider.wallets[addr].getPrivateKeyString();

  console.log("---")
  console.log("SEED:", seed);
  console.log("ADDRESS:", addr);
  console.log("PRIVATE KEY:", private);
  console.log("---")

  return private;
}

const seedToAccountBalance = (seed) => ({
  secretKey: seedToPrivateKey(seed),
  balance: 1e30
})


const serverConf = {
  accounts: [
    seedToAccountBalance(config.testAccountSeed),
    seedToAccountBalance(config.providers.home.seed),
    seedToAccountBalance(config.providers.foreign.seed),
    ...config.validatorSeeds.map(seedToAccountBalance)
  ],
  logger: console
}

const server = ganache.server(serverConf);

server.listen(8545, function (err, blockchain) {
  if (err) {
    console.error(err);
  }
});