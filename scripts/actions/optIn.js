require("dotenv").config();
const algotxn = require("../helpers/algorand");
const algosdk = require("algosdk");

(async () => {
  const appId = Number(process.env.APP_ID);
  const acc1 = algosdk.mnemonicToSecretKey(process.env.ACC1_MNEMONIC);

  // opt into application
  await algotxn.optIntoApp(acc1, appId);

  // read initial local state
  let appLS = await algotxn.readLocalState(acc1.addr, appId);
  console.log(appLS);
})();
