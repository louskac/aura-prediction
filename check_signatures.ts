import { Connection, PublicKey } from "@solana/web3.js";

async function checkSignatures() {
  const walletPubkey = new PublicKey("GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE");
  
  const devnetConn = new Connection("https://api.devnet.solana.com", "confirmed");
  const mainnetConn = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

  console.log("Checking Devnet...");
  try {
    const devSigs = await devnetConn.getSignaturesForAddress(walletPubkey);
    console.log(`Devnet signatures found: ${devSigs.length}`);
    devSigs.forEach(s => {
      console.log(`- Signature: ${s.signature}, Slot: ${s.slot}, Error: ${s.err}`);
    });
  } catch (e: any) {
    console.error("Devnet check failed:", e.message);
  }

  console.log("\nChecking Mainnet...");
  try {
    const mainSigs = await mainnetConn.getSignaturesForAddress(walletPubkey);
    console.log(`Mainnet signatures found: ${mainSigs.length}`);
    mainSigs.forEach(s => {
      console.log(`- Signature: ${s.signature}, Slot: ${s.slot}, Error: ${s.err}`);
    });
  } catch (e: any) {
    console.error("Mainnet check failed:", e.message);
  }
}

checkSignatures();
