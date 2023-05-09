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
    const gameGS = await algotxn.readGlobalState(appId);

    // verify app created
    assert.isDefined(appId);
    assert.equal(gameGS.get("Health"), 5); // integer check
    assert.equal(gameGS.get("MaxDamage"), 0);

    // verify app funded
    const appAccount = await algotxn.accountInfo(appAddress);
    assert.equal(appAccount.amount, 1e6 + 1e5);
  });

  it("Account opts in successfully", async () => {
    await algotxn.optIntoApp(player, appId);

    // verify local state initialized
    const appLS = await algotxn.readLocalState(player.addr, appId);
    assert.equal(appLS.get("Damage"), 0);
  });

  it("Attacks monster successfully", async () => {
    await algotxn.optIntoApp(player, appId);

    const appArgs = [new Uint8Array(Buffer.from("Attack"))];
    await algotxn.callApp(player, appId, appArgs);

    // verify damage dealt
    const gameGS = await algotxn.readGlobalState(appId);
    assert.equal(gameGS.get("Health"), 3); // integer check
    assert.equal(gameGS.get("MaxDamage"), 2);

    // verify mvp
    const mvp = gameGS.get("Mvp");
    assert.equal(mvp, player.addr);
  });

  it("Reward player successfully", async () => {
    await algotxn.optIntoApp(player, appId);

    // attack 3 times
    const appArgs = [new Uint8Array(Buffer.from("Attack"))];
    for (let i = 0; i < 3; i++) {
      await algotxn.callApp(player, appId, appArgs);
    }

    // balance before
    const balanceBefore = (await algotxn.accountInfo(player.addr)).amount;

    // reward player
    const algodClient = algotxn.getAlgodClient();
    let suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE * 2;
    const gameGS = await algotxn.readGlobalState(appId);
    const mvp = gameGS.get("Mvp");
    const appArgs2 = [new Uint8Array(Buffer.from("Reward"))];
    const accounts = [mvp];
    await algotxn.callApp(creator, appId, appArgs2, accounts, suggestedParams);

    // balance after
    const balanceAfter = (await algotxn.accountInfo(player.addr)).amount;

    // player receives 1 Algo
    assert.equal(balanceAfter - balanceBefore, 1e6);
  });
});
