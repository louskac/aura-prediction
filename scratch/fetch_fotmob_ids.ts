import axios from "axios";

async function getPlayerId(name: string) {
  try {
    const url = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(name)}&lang=en`;
    const res = await axios.get(url, { 
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const options = res.data.squadMemberSuggest?.[0]?.options || [];
    if (options.length > 0) {
      const pId = options[0].payload.id;
      console.log(`[FOUND] ${name} -> FotMob ID: ${pId}`);
      return pId;
    }
    console.log(`[NOT FOUND] ${name}`);
    return null;
  } catch (err: any) {
    console.log(`[ERROR] ${name} -> ${err.message}`);
    return null;
  }
}

async function main() {
  const testPlayers = [
    "Lionel Messi",
    "Kylian Mbappé",
    "Erling Haaland",
    "Jude Bellingham",
    "Sofyan Amrabat",
    "Alphonso Davies"
  ];

  for (const name of testPlayers) {
    const id = await getPlayerId(name);
    if (id) {
      // Check headshot URL
      const imgUrl = `https://images.fotmob.com/image_resources/playerimages/${id}.png`;
      try {
        const head = await axios.head(imgUrl);
        console.log(`  - Photo URL exists: ${imgUrl} (Status: ${head.status})`);
      } catch (e: any) {
        console.log(`  - Photo URL failed: ${imgUrl} (${e.message})`);
      }
    }
  }
}

main();
