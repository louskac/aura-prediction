import { txline } from "../src/services/txline";

async function main() {
  const ids = [18172280, 18175983, 18172379, 18175981];
  for (const id of ids) {
    console.log(`Fetching odds for fixture ${id}...`);
    try {
      const odds = await txline.getOdds(id);
      console.log(`Odds for ${id}:`, JSON.stringify(odds, null, 2));
    } catch (e: any) {
      console.error(`Error for ${id}:`, e.message);
    }
  }
}

main();
