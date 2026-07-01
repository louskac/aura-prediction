import { txline } from "./src/services/txline.js";

async function testConnection() {
  console.log("==========================================");
  console.log("TxLINE API Connection Diagnostic Test");
  console.log("==========================================");

  try {
    const statusBefore = await txline.getStatus();
    console.log("Initial Status Check:");
    console.log("--------------------");
    console.log(`- Network: ${statusBefore.network}`);
    console.log(`- API Endpoint: ${statusBefore.apiEndpoint}`);
    console.log(`- Local Wallet Path Exists: ${statusBefore.walletExists}`);
    console.log(`- Wallet Address: ${statusBefore.walletAddress}`);
    console.log(`- Wallet Balance: ${statusBefore.walletBalance} SOL`);
    console.log(`- Cached Token Exists: ${statusBefore.hasCachedToken}`);
    console.log("--------------------");

    console.log("Ensuring client is authenticated (guest login + signing fallback)...");
    await txline.ensureAuthenticated();
    
    const statusAfter = await txline.getStatus();
    console.log(`- Authenticated Successfully: ${statusAfter.authenticated}`);
    
    console.log("Fetching live fixtures snapshot...");
    const fixtures = await txline.getFixtures();
    console.log(`- Retrieved ${fixtures?.length || 0} fixtures from API`);

    if (fixtures && fixtures.length > 0) {
      console.log("\nSample Fixture details:");
      const f = fixtures[0];
      console.log(`- ID: ${f.FixtureId ?? f.fixtureId}`);
      console.log(`- Teams: ${f.Participant1 ?? f.participant1} vs ${f.Participant2 ?? f.participant2}`);
      console.log(`- Competition: ${f.Competition ?? f.competition}`);
      console.log(`- Start Time: ${f.StartTime ?? f.startTime}`);
    } else {
      console.warn("\nWarning: API returned 0 fixtures. Ensure your subscription is active or free tier is properly registered.");
    }
  } catch (err: any) {
    console.error("\n[ERROR] Connection test failed:", err.message);
  }
  console.log("==========================================");
}

testConnection();
