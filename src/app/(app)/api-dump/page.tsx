import { txline } from "@/services/txline";
import axios from "axios";

export const revalidate = 0; // force dynamic rendering

export default async function ApiDumpPage() {
  const status = await txline.getStatus();
  
  let guestJwt = "None";
  let jwtError = "None";
  let apiResponse = null;
  let apiError = "None";

  // 1. Resolve Active Credentials
  const activeToken = status.apiToken;
  const activeJwt = status.jwt;
  
  if (activeToken && activeJwt) {
    console.log("Diagnosing snapshot query using active cached token...");
    try {
      const res = await axios.get(`${status.apiEndpoint}/api/fixtures/snapshot`, {
        headers: {
          "Authorization": `Bearer ${activeJwt}`,
          "X-Api-Token": activeToken
        },
        timeout: 10000
      });
      apiResponse = res.data;
    } catch (e: any) {
      apiError = `${e.response?.status} - ${JSON.stringify(e.response?.data) || e.message}`;
    }
  } else {
    // Request Guest JWT fallback
    try {
      const authRes = await axios.post(`${status.apiEndpoint}/auth/guest/start`);
      guestJwt = authRes.data.token || JSON.stringify(authRes.data);
    } catch (e: any) {
      jwtError = `${e.response?.status} - ${e.response?.data || e.message}`;
    }

    if (guestJwt !== "None") {
      try {
        const res = await axios.get(`${status.apiEndpoint}/api/fixtures/snapshot`, {
          headers: {
            "Authorization": `Bearer ${guestJwt}`,
            "X-Api-Token": guestJwt
          },
          timeout: 10000
        });
        apiResponse = res.data;
      } catch (e: any) {
        apiError = `${e.response?.status} - ${JSON.stringify(e.response?.data) || e.message}`;
      }
    }
  }

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "22px", fontWeight: 800 }}>TxLINE API Raw Data Dump</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Real-time diagnostics showing raw communication with the TxLINE sports oracle API.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "0px" }}>
        <h3 style={{ fontSize: "16px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", fontWeight: 800 }}>
          <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>1. Connection & Wallet Status
        </h3>
        <pre style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "0px", fontSize: "12px", overflowX: "auto" }}>
          {JSON.stringify({
            network: status.network,
            apiEndpoint: status.apiEndpoint,
            walletAddress: status.walletAddress,
            walletBalance: `${status.walletBalance} SOL`,
            walletExists: status.walletExists,
            hasCachedToken: status.hasCachedToken
          }, null, 2)}
        </pre>
      </div>

      <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "0px" }}>
        <h3 style={{ fontSize: "16px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", fontWeight: 800 }}>
          <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>2. Guest Authentication Flow
        </h3>
        <div style={{ fontSize: "13px" }}>
          <strong>Target Endpoint:</strong> <code>{status.apiEndpoint}/auth/guest/start</code>
        </div>
        <div>
          <strong>Guest JWT (Truncated):</strong>
          <pre style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "0px", fontSize: "12px", wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
            {guestJwt !== "None" ? `${guestJwt.substring(0, 100)}... [Length: ${guestJwt.length}]` : "None"}
          </pre>
        </div>
        {jwtError !== "None" && (
          <div style={{ color: "var(--color-danger)", fontSize: "13px" }}>
            <strong>Auth Error:</strong> {jwtError}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "0px" }}>
        <h3 style={{ fontSize: "16px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", fontWeight: 800 }}>
          <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>3. Raw Fixtures Snapshot Query
        </h3>
        <div style={{ fontSize: "13px" }}>
          <strong>Target Endpoint:</strong> <code>{status.apiEndpoint}/api/fixtures/snapshot</code>
        </div>
        {apiResponse ? (
          <div>
            <div style={{ color: "var(--color-success)", fontSize: "13px", marginBottom: "8px" }}>
              <strong>Status:</strong> 200 OK (Received {apiResponse.length} fixtures)
            </div>
            <pre style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "0px", fontSize: "12px", overflowX: "auto", maxHeight: "400px" }}>
              {JSON.stringify(apiResponse.slice(0, 5), null, 2)}
            </pre>
          </div>
        ) : (
          <div>
            <div style={{ color: "var(--color-danger)", fontSize: "13px", marginBottom: "8px" }}>
              <strong>Query Failed / Forbidden:</strong>
            </div>
            <pre style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "0px", fontSize: "12px", overflowX: "auto", color: "var(--color-danger)" }}>
              {apiError}
            </pre>
            <div style={{ fontSize: "13px", marginTop: "12px", color: "var(--color-text-muted)" }}>
              <blockquote>
                <strong>Note on 403 Forbidden:</strong> The TxLINE API requires the client wallet public key to have a registered on-chain subscription (World Cup Free Tier Service Level 12) before releasing sports data.
                Since the local Solana keypair contains 0 SOL, the subscription tx cannot be sent to activate the guest JWT.
              </blockquote>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
