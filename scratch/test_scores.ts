import { txline } from "../src/services/txline";

async function main() {
  // Let's query scores for Netherlands vs Morocco (18172280) and Germany vs Paraguay (18175983)
  const ids = [18172280, 18175983, 18172379, 18175981];
  for (const id of ids) {
    console.log(`Fetching scores for fixture ${id}...`);
    try {
      const scores = await txline.getScores(id);
      console.log(`Response for ${id}:`, JSON.stringify(scores, null, 2));
    } catch (e: any) {
      console.error(`Error for ${id}:`, e.message);
    }
  }
}

main();
