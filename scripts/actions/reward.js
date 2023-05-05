require("dotenv").config();
const algotxn = require("../helpers/algorand");
const algosdk = require("algosdk");

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

(async () => {
  const appId = Number(process.env.APP_ID);

  const creator = algosdk.mnemonicToSecretKey(process.env.CREATOR_MNEMONIC);

  // read app global state
  const appGS = await algotxn.readGlobalState(appId);
  console.log(appGS);

  // get mvp details
  const mvp = appGS.get("Mvp");
  const amountBefore = (await algotxn.accountInfo(mvp)).amount;
  console.log("MVP is:", mvp);

  const accounts = [mvp];

  // call the app to update global state
  const appArgs = [new Uint8Array(Buffer.from("Reward"))];

  // creator pays for inner txn fee
  let suggestedParams = await algodClient.getTransactionParams().do();
  suggestedParams.fee = 2000;

  await algotxn.callApp(creator, appId, appArgs, accounts, suggestedParams);

  // check mvp balance
  const amountAfter = (await algotxn.accountInfo(mvp)).amount;
  console.log("Mvp reward:", amountAfter - amountBefore);
})();
