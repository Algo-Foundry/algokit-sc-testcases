const algosdk = require("algosdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const algodClient = new algosdk.Algodv2(
  process.env.ALGOD_TOKEN,
  process.env.ALGOD_SERVER,
  process.env.ALGOD_PORT
);

const getAlgodClient = () => {
  return algodClient;
};

const submitToNetwork = async (signedTxns) => {
  // send txn
  const response = await algodClient.sendRawTransaction(signedTxns).do();

  // Wait for transaction to be confirmed
  const confirmation = await algosdk.waitForConfirmation(
    algodClient,
    response.txId,
    4
  );

  return {
    response,
    confirmation,
  };
};

const getBasicProgramBytes = async (relativeFilePath) => {
  // Read file for Teal code
  const filePath = path.join(__dirname, relativeFilePath);
  const data = fs.readFileSync(filePath);

  // use algod to compile the program
  const compiledProgram = await algodClient.compile(data).do();
  return new Uint8Array(Buffer.from(compiledProgram.result, "base64"));
};

const readGlobalState = async (appId) => {
  const app = await algodClient.getApplicationByID(appId).do();

  const gsMap = new Map();

  // global state is a key value array
  const globalState = app.params["global-state"];
  globalState.forEach((item) => {
    // decode from base64 and utf8
    const formattedKey = decodeURIComponent(Buffer.from(item.key, "base64"));

    let formattedValue;
    if (item.value.type === 1) {
      // handle addresses like MVP
      if (formattedKey !== "Mvp") {
        formattedValue = decodeURIComponent(
          Buffer.from(item.value.bytes, "base64")
        );
      } else {
        formattedValue = algosdk.encodeAddress(
          Buffer.from(item.value.bytes, "base64")
        );
      }
    } else {
      formattedValue = item.value.uint;
    }

    gsMap.set(formattedKey, formattedValue);
  });

  return gsMap;
};

const readLocalState = async (account, appId) => {
  const acc = await algodClient.accountInformation(account).do();
  const localStates = acc["apps-local-state"];

  const appLocalState = localStates.find((ls) => {
    return ls.id === appId;
  });

  if (appLocalState === undefined)
    throw new Error("Account has not opted into the app.");

  const lsMap = new Map();

  // global state is a key value array
  appLocalState["key-value"].forEach((item) => {
    // decode from base64 and utf8
    const formattedKey = decodeURIComponent(Buffer.from(item.key, "base64"));

    let formattedValue;
    if (item.value.type === 1) {
      formattedValue = decodeURIComponent(
        Buffer.from(item.value.bytes, "base64")
      );
    } else {
      formattedValue = item.value.uint;
    }

    lsMap.set(formattedKey, formattedValue);
  });

  return lsMap;
};

const deployGame = async (fromAccount, monsterHealth) => {
  const suggestedParams = await algodClient.getTransactionParams().do();

  // programs
  const approvalProgram = await getBasicProgramBytes(
    "../../artifacts/game_approval.teal"
  );
  const clearProgram = await getBasicProgramBytes(
    "../../artifacts/game_clearstate.teal"
  );

  // global ints - Health, MaxDamage
  // global bytes - Mvp
  // local ints - Damage
  const numGlobalInts = 2;
  const numGlobalByteSlices = 1;
  const numLocalInts = 1;
  const numLocalByteSlices = 0;

  // app args
  const appArgs = [algosdk.encodeUint64(monsterHealth)];

  const txn = algosdk.makeApplicationCreateTxnFromObject({
    from: fromAccount.addr,
    suggestedParams,
    approvalProgram,
    clearProgram,
    numGlobalInts,
    numGlobalByteSlices,
    numLocalInts,
    numLocalByteSlices,
    appArgs,
  });

  const signedTxn = txn.signTxn(fromAccount.sk);
  return await submitToNetwork(signedTxn);
};

const fundAccount = async (fromAccount, to, amount) => {
  let suggestedParams = await algodClient.getTransactionParams().do();

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: fromAccount.addr,
    to,
    amount,
    suggestedParams,
  });

  const signedTxn = txn.signTxn(fromAccount.sk);
  return await submitToNetwork(signedTxn);
};

const callApp = async (
  fromAccount,
  appIndex,
  appArgs,
  accounts,
  suggestedParams
) => {
  if (suggestedParams === undefined) {
    // get suggested params
    suggestedParams = await algodClient.getTransactionParams().do();
  }

  // call the created application
  const txn = algosdk.makeApplicationNoOpTxnFromObject({
    from: fromAccount.addr,
    suggestedParams,
    appIndex,
    appArgs,
    accounts,
  });

  const signedTxn = txn.signTxn(fromAccount.sk);
  return await submitToNetwork(signedTxn);
};

const optIntoApp = async (fromAccount, appIndex) => {
  const acc = await algodClient.accountInformation(fromAccount.addr).do();
  const localStates = acc["apps-local-state"];

  const appLocalState = localStates.find((ls) => {
    return ls.id === appIndex;
  });

  // account has already opted into app
  if (appLocalState !== undefined) return;

  // get suggested params
  const suggestedParams = await algodClient.getTransactionParams().do();

  // call the created application
  const txn = algosdk.makeApplicationOptInTxnFromObject({
    from: fromAccount.addr,
    suggestedParams,
    appIndex,
  });

  const signedTxn = txn.signTxn(fromAccount.sk);
  return await submitToNetwork(signedTxn);
};

const accountInfo = async (addr) => {
  return await algodClient.accountInformation(addr).do();
};

module.exports = {
  getAlgodClient,
  deployGame,
  fundAccount,
  readGlobalState,
  readLocalState,
  callApp,
  optIntoApp,
  submitToNetwork,
  accountInfo,
};
