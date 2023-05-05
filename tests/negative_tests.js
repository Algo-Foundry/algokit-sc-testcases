const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const algosdk = require("algosdk");
const algotxn = require("../scripts/helpers/algorand");

// use chai-as-promise library
chai.use(chaiAsPromised);
const assert = chai.assert;
const expect = chai.expect;

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

  it("Initialize monster with < 5 Health fails", async () => {
    await expect(algotxn.deployGame(creator, 1)).to.be.rejectedWith(Error);
  });

  it("Attacks monster successfully", async () => {
    await algotxn.optIntoApp(player, appId);

    // attack 3 times
    const appArgs = [new Uint8Array(Buffer.from("Attack"))];
    for (let i = 0; i < 3; i++) {
      await algotxn.callApp(player, appId, appArgs);
    }

    // attack fails
    await expect(algotxn.callApp(player, appId, appArgs)).to.be.rejectedWith(
      Error
    );
  });

  it("Reward player when monster is alive", async () => {
    await algotxn.optIntoApp(player, appId);

    // attack once
    const appArgs = [new Uint8Array(Buffer.from("Attack"))];
    await algotxn.callApp(player, appId, appArgs);

    // attempt to reward player
    const algodClient = algotxn.getAlgodClient();
    let suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE * 2;
    const gameGS = await algotxn.readGlobalState(appId);
    const mvp = gameGS.get("Mvp");
    const appArgs2 = [new Uint8Array(Buffer.from("Reward"))];
    const accounts = [mvp];
    await expect(
      algotxn.callApp(creator, appId, appArgs2, accounts, suggestedParams)
    ).to.be.rejectedWith(Error);
  });

  it("Reward player fails when address is accounts is different from global state", async () => {
    await algotxn.optIntoApp(player, appId);

    // attack 3 times
    const appArgs = [new Uint8Array(Buffer.from("Attack"))];
    for (let i = 0; i < 3; i++) {
      await algotxn.callApp(player, appId, appArgs);
    }

    // reward player
    const player2 = algosdk.generateAccount();
    const algodClient = algotxn.getAlgodClient();
    let suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE * 2;
    const appArgs2 = [new Uint8Array(Buffer.from("Reward"))];
    const accounts = [player2.addr];
    await expect(
      algotxn.callApp(creator, appId, appArgs2, accounts, suggestedParams)
    ).to.be.rejectedWith(Error);
  });

  it("Reward player fails when called by non-creator", async () => {
    await algotxn.optIntoApp(player, appId);

    // attack 3 times
    const appArgs = [new Uint8Array(Buffer.from("Attack"))];
    for (let i = 0; i < 3; i++) {
      await algotxn.callApp(player, appId, appArgs);
    }

    // player decides to reward himself
    const algodClient = algotxn.getAlgodClient();
    let suggestedParams = await algodClient.getTransactionParams().do();
    suggestedParams.fee = algosdk.ALGORAND_MIN_TX_FEE * 2;
    const gameGS = await algotxn.readGlobalState(appId);
    const mvp = gameGS.get("Mvp");
    const appArgs2 = [new Uint8Array(Buffer.from("Reward"))];
    const accounts = [mvp];
    await expect(
      algotxn.callApp(player, appId, appArgs2, accounts, suggestedParams)
    ).to.be.rejectedWith(Error);
  });
});
