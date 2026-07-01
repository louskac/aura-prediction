import { Connection, PublicKey } from "@solana/web3.js";

async function testAirdrop() {
  const walletPubkey = new PublicKey("GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE");
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Try different airdrop amounts: 0.1, 0.05, 0.01, 1.0
  const amounts = [1e8, 5e7, 1e7, 1e9]; // 0.1, 0.05, 0.01, 1 SOL

  for (const amt of amounts) {
    console.log(`Requesting ${amt / 1e9} SOL...`);
    try {
      const sig = await connection.requestAirdrop(walletPubkey, amt);
      await connection.confirmTransaction(sig, "confirmed");
      console.log(`Success! TxSig: ${sig}`);
      break;
    } catch (e: any) {
      console.error(`Failed: ${e.message}`);
    }
  }
}

testAirdrop();
