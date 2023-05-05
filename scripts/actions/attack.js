require("dotenv").config();
const algotxn = require("../helpers/algorand");
const algosdk = require("algosdk");

(async () => {
  const appId = Number(process.env.APP_ID);

  const acc1 = algosdk.mnemonicToSecretKey(process.env.ACC1_MNEMONIC);

  // call the app to update global state
  const appArgs = [new Uint8Array(Buffer.from("Attack"))];

  await algotxn.callApp(acc1, appId, appArgs);

  // read app global state
  const appGS = await algotxn.readGlobalState(appId);
  console.log(appGS);

  // read player local state
  let appLS = await algotxn.readLocalState(acc1.addr, appId);
  console.log(appLS);
})();
