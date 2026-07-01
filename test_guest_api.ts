import axios from "axios";

async function testGuestApi() {
  console.log("Testing guest API access...");
  try {
    const authRes = await axios.post("https://txline-dev.txodds.com/auth/guest/start");
    const jwt = authRes.data.token;
    console.log("Guest JWT:", jwt ? "Retrieved successfully" : "Failed");

    // Fetch fixtures with only Authorization header
    console.log("Fetching fixtures with guest JWT...");
    const res = await axios.get("https://txline-dev.txodds.com/api/fixtures/snapshot", {
      headers: {
        "Authorization": `Bearer ${jwt}`
      }
    });
    console.log("Success! Fixtures count:", res.data?.length);
    console.log("First fixture:", res.data?.[0]);
  } catch (e: any) {
    console.error("Failed:", e.response?.status, e.response?.data || e.message);
  }
}

testGuestApi();
