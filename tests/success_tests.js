const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const algosdk = require("algosdk");
const algotxn = require("../scripts/helpers/algorand");

// use chai-as-promise library
chai.use(chaiAsPromised);
let assert = chai.assert;

describe("Stateful Smart Contract Positive Tests", function () {
  let appId, appAddress, player;
  const creator = algosdk.mnemonicToSecretKey(process.env.CREATOR_MNEMONIC);

  this.beforeEach(async () => {
    // deploy app
    const { confirmation } = await algotxn.deployGame(creator, 5);
    appId = confirmation["application-index"];

    // fund contract with 1.1 Algos
    appAddress = algosdk.getApplicationAddress(appId);
    await algotxn.fundAccount(creator, appAddress, 1e6 + 1e5);

    // create player
    player = algosdk.generateAccount();
    await algotxn.fundAccount(creator, player.addr, 2e6);
  });

  it("Deploys game contract successfully", async () => {
    // write your code here
  });

  it("Account opts in successfully", async () => {
    // write your code here
  });

  it("Attacks monster successfully", async () => {
    // write your code here
  });

  it("Reward player successfully", async () => {
    // write your code here
  });
});
