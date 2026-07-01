import axios from "axios";

async function testMainnetGuest() {
  console.log("Testing Mainnet guest API access...");
  try {
    const authRes = await axios.post("https://txline.txodds.com/auth/guest/start");
    const jwt = authRes.data.token;
    console.log("Mainnet Guest JWT:", jwt ? "Retrieved successfully" : "Failed");

    console.log("Fetching fixtures with guest JWT from Mainnet...");
    const res = await axios.get("https://txline.txodds.com/api/fixtures/snapshot", {
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "X-Api-Token": jwt
      }
    });
    console.log("Success! Status:", res.status);
    console.log("Fixtures count:", res.data?.length);
    if (res.data && res.data.length > 0) {
      console.log("First fixture:", res.data[0]);
    }
  } catch (e: any) {
    console.error("Failed:", e.response?.status, e.response?.data || e.message);
  }
}

testMainnetGuest();
