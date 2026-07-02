import axios from "axios";

async function checkUrl(url: string) {
  try {
    const res = await axios.head(url);
    console.log(`[SUCCESS] ${url} -> Status: ${res.status}`);
  } catch (err: any) {
    console.log(`[FAILED]  ${url} -> Error: ${err.message}`);
  }
}

async function main() {
  const ids = [134629, 10094683, 223984];
  const paths = [
    (id: number) => `https://txline-dev.txodds.com/images/players/${id}.png`,
    (id: number) => `https://txline.txodds.com/images/players/${id}.png`,
    (id: number) => `https://txodds.github.io/tx-on-chain/assets/players/${id}.png`,
    (id: number) => `https://txodds.github.io/tx-on-chain/images/players/${id}.png`,
    (id: number) => `https://txodds.github.io/tx-on-chain/assets/images/players/${id}.png`,
    (id: number) => `https://txline-dev.txodds.com/assets/players/${id}.png`,
    (id: number) => `https://txline.txodds.com/assets/players/${id}.png`,
  ];

  for (const id of ids) {
    console.log(`\nTesting paths for Player ID: ${id}`);
    for (const pathFn of paths) {
      await checkUrl(pathFn(id));
    }
  }
}

main();
