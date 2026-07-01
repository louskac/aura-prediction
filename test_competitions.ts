import axios from "axios";

async function testCompetitions() {
  console.log("Requesting guest JWT...");
  const authRes = await axios.post("https://txline-dev.txodds.com/auth/guest/start");
  const jwt = authRes.data.token;
  console.log("Guest JWT obtained.");

  // We test the devnet endpoints with various competitionIds
  const competitionIds = [null, 11, 500005, 500001, 12, 13];
  
  for (const compId of competitionIds) {
    const url = "https://txline-dev.txodds.com/api/fixtures/snapshot";
    const params = compId ? { competitionId: compId } : {};
    
    console.log(`\nTesting with competitionId = ${compId}...`);
    try {
      const res = await axios.get(url, {
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "X-Api-Token": jwt
        },
        params
      });
      console.log(`- Success! Status: ${res.status}, Fixtures count: ${res.data?.length}`);
      if (res.data && res.data.length > 0) {
        console.log("Sample:", res.data[0]);
      }
    } catch (e: any) {
      console.error(`- Failed: ${e.response?.status} - ${e.response?.data?.message || e.response?.data || e.message}`);
    }
  }
}

testCompetitions();
