import fs from "fs";
import crypto from "crypto";
import path from "path";
import os from "os";
import axios from "axios";
import nacl from "tweetnacl";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const TOKEN_CACHE_FILE = path.join(process.cwd(), "txline_token_cache.json");

// Devnet addresses as default for free tier
const DEVNET_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");
const DEVNET_TXL_MINT = new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG");
const DEVNET_API_ENDPOINT = "https://txline-dev.txodds.com";

// Mainnet addresses
const MAINNET_PROGRAM_ID = new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA");
const MAINNET_TXL_MINT = new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL");
const MAINNET_API_ENDPOINT = "https://txline.txodds.com";

export interface TxlineConfig {
  network: "devnet" | "mainnet";
  apiEndpoint: string;
  programId: PublicKey;
  txlMint: PublicKey;
  rpcUrl: string;
}

export class TxlineClient {
  private config: TxlineConfig;
  private apiToken: string | null = null;
  private jwt: string | null = null;

  constructor() {
    const network = (process.env.TXLINE_NETWORK || "devnet") as "devnet" | "mainnet";
    const isMainnet = network === "mainnet";
    
    this.config = {
      network,
      apiEndpoint: isMainnet ? MAINNET_API_ENDPOINT : DEVNET_API_ENDPOINT,
      programId: isMainnet ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID,
      txlMint: isMainnet ? MAINNET_TXL_MINT : DEVNET_TXL_MINT,
      rpcUrl: process.env.SOLANA_RPC_URL || (isMainnet ? "https://api.mainnet-beta.solana.com" : "https://api.devnet.solana.com"),
    };

    // Load from environment variables if present
    this.apiToken = process.env.TXLINE_API_TOKEN || null;
    this.jwt = process.env.TXLINE_JWT || null;

    // Load active cached credentials
    this.loadCache();
  }

  // Get active connection status
  public async getStatus() {
    this.loadCache();
    let walletAddress = "No wallet found";
    let walletBalance = 0;
    let txlBalance = 0;
    let walletExists = false;

    try {
      const wallet = this.loadLocalWallet();
      if (wallet) {
        walletExists = true;
        walletAddress = wallet.publicKey.toBase58();
        const connection = new Connection(this.config.rpcUrl, "confirmed");
        walletBalance = await connection.getBalance(wallet.publicKey) / 1e9;

        try {
          const userTokenAccount = getAssociatedTokenAddressSync(
            this.config.txlMint,
            wallet.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID
          );
          const account = await getAccount(connection, userTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
          txlBalance = Number(account.amount) / 1e9;
        } catch (e) {
          txlBalance = 0;
        }
      }
    } catch (e) {}

    return {
      network: this.config.network,
      apiEndpoint: this.config.apiEndpoint,
      authenticated: !!this.apiToken,
      hasCachedToken: fs.existsSync(TOKEN_CACHE_FILE),
      walletAddress,
      walletBalance,
      txlBalance,
      walletExists,
      jwt: this.jwt,
      apiToken: this.apiToken
    };
  }

  // Load the Solana keypair from the local config
  private loadLocalWallet(): Keypair | null {
    try {
      const walletPath = process.env.SOLANA_KEYPAIR_PATH || path.join(os.homedir(), ".config/solana/id.json");
      if (fs.existsSync(walletPath)) {
        const raw = fs.readFileSync(walletPath, "utf-8");
        const secretKey = Uint8Array.from(JSON.parse(raw));
        return Keypair.fromSecretKey(secretKey);
      }
    } catch (e) {
      console.error("Failed to load local Solana wallet:", e);
    }
    return null;
  }

  // Ensure client is authenticated, loading from cache or triggering subscription/activation
  public async ensureAuthenticated() {
    // If already set in memory, we are good
    if (this.apiToken && this.jwt) return;

    // Try loading from environment variables again
    if (process.env.TXLINE_API_TOKEN && process.env.TXLINE_JWT) {
      this.apiToken = process.env.TXLINE_API_TOKEN;
      this.jwt = process.env.TXLINE_JWT;
      return;
    }

    // Try loading from local file cache
    this.loadCache();
    if (this.apiToken && this.jwt) return;

    // Fallback: Perform authentication and on-chain subscription/activation
    console.log("No cached TxLINE credentials. Starting authentication flow...");
    const wallet = this.loadLocalWallet();
    if (!wallet) {
      throw new Error("No TxLINE credentials configured, and no local Solana wallet found to perform on-chain activation.");
    }

    try {
      const connection = new Connection(this.config.rpcUrl, "confirmed");
      const balance = await connection.getBalance(wallet.publicKey);
      console.log(`Wallet address: ${wallet.publicKey.toBase58()}, Balance: ${balance / 1e9} SOL`);

      // 1. Get Guest Auth JWT
      console.log("Requesting guest JWT...");
      const authRes = await axios.post(`${this.config.apiEndpoint}/auth/guest/start`);
      const jwt = authRes.data.token;
      if (!jwt) throw new Error("Failed to retrieve guest JWT from TxLINE auth endpoint.");

      // 2. Derive treasury PDAs for the Anchor subscription method
      const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_treasury_v2")],
        this.config.programId
      );
      const tokenTreasuryVault = getAssociatedTokenAddressSync(
        this.config.txlMint,
        tokenTreasuryPda,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pricing_matrix")],
        this.config.programId
      );

      // Check if wallet has SPL token account for TxL. If not, derive it.
      const userTokenAccount = getAssociatedTokenAddressSync(
        this.config.txlMint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // 3. Register on-chain subscription (World Cup Free Tier Service Level 12)
      const SERVICE_LEVEL_ID = 1; // Real-time World Cup Free Tier (requires 0 TxL on devnet)
      const DURATION_WEEKS = 4;
      
      console.log(`Subscribing to Free Tier (Service Level ${SERVICE_LEVEL_ID}) on-chain...`);
      
      // We dynamically load the program since we have the IDL metadata
      // The instruction is: subscribe(service_level_id, duration_weeks)
      // Since we don't have the full typescript workspace compiled, we can write standard Solana instruction or use Anchor coder
      // For simplicity, we can invoke the program method using Anchor client
      // IDL is fetched dynamically from the endpoints or hardcoded.
      // Since we parsed the IDL, the coder is defined.
      // Let's perform a simple anchor transaction.
      // Wait! If the user balance is 0 SOL, this transaction will fail.
      // Let's check balance before sending:
      if (balance === 0) {
        console.warn("Wallet has 0 SOL. On-chain subscription transaction cannot be sent. Using guest session JWT only.");
        // Save just the guest JWT (some endpoints might work, or it will let the user know they need to fund wallet)
        this.jwt = jwt;
        this.apiToken = jwt; // Fallback
        return;
      }

      // If they have SOL, send the transaction:
      const discriminator = Buffer.from([254, 28, 191, 138, 156, 179, 183, 53]);
      const data = Buffer.concat([
        discriminator,
        Buffer.from([SERVICE_LEVEL_ID & 0xff, (SERVICE_LEVEL_ID >> 8) & 0xff]), // u16 little-endian
        Buffer.from([DURATION_WEEKS]) // u8 (weeks)
      ]);

      const instruction = new anchor.web3.TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: pricingMatrixPda, isSigner: false, isWritable: false },
          { pubkey: this.config.txlMint, isSigner: false, isWritable: false },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
          { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
          { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: this.config.programId,
        data: data
      });

      // Check if Associated Token Account (ATA) exists
      let userTokenAccountExists = false;
      try {
        await getAccount(connection, userTokenAccount, "confirmed", TOKEN_2022_PROGRAM_ID);
        userTokenAccountExists = true;
      } catch (e) {}

      const transaction = new anchor.web3.Transaction();
      if (!userTokenAccountExists) {
        console.log("ATA does not exist. Adding instruction to create ATA for TxL token...");
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            userTokenAccount,
            wallet.publicKey,
            this.config.txlMint,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }
      transaction.add(instruction);
      transaction.feePayer = wallet.publicKey;
      
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.sign(wallet);
      
      const txSig = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(txSig, "confirmed");
      console.log("On-chain subscription successful! Tx:", txSig);

      // 4. Activate Token
      console.log("Signing activation message...");
      const SELECTED_LEAGUES: number[] = [];
      const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
      const message = new TextEncoder().encode(messageString);
      const signatureBytes = nacl.sign.detached(message, wallet.secretKey);
      const walletSignature = Buffer.from(signatureBytes).toString("base64");

      console.log("Calling activation endpoint...");
      const activateRes = await axios.post(
        `${this.config.apiEndpoint}/api/token/activate`,
        {
          txSig,
          walletSignature,
          leagues: SELECTED_LEAGUES,
        },
        {
          headers: { Authorization: `Bearer ${jwt}` }
        }
      );

      const apiToken = activateRes.data.token || activateRes.data;
      if (!apiToken) throw new Error("Failed to activate API token.");

      // Cache token
      this.apiToken = apiToken;
      this.jwt = jwt;

      fs.writeFileSync(
        TOKEN_CACHE_FILE,
        JSON.stringify({
          apiToken,
          jwt,
          network: this.config.network,
          timestamp: Date.now()
        }, null, 2)
      );

      console.log("TxLINE credentials activated and cached successfully");
    } catch (err: any) {
      console.error("Failed in subscription/activation flow:", err.response?.data || err.message, err.stack);
      // Try guest JWT as fallback
      throw new Error(`TxLINE API activation failed: ${err.message}`);
    }
  }

  // General GET client request helper
  private async get(path: string, params: any = {}) {
    await this.ensureAuthenticated();
    const headers: any = {
      "Content-Type": "application/json",
    };
    
    if (this.jwt) {
      headers["Authorization"] = `Bearer ${this.jwt}`;
    }
    if (this.apiToken) {
      headers["X-Api-Token"] = this.apiToken;
    }

    const res = await axios.get(`${this.config.apiEndpoint}${path}`, {
      headers,
      params,
      timeout: 15000,
    });
    return res.data;
  }

  // Get current fixtures
  public async getFixtures(competitionId?: number) {
    try {
      const params = competitionId ? { competitionId } : {};
      return await this.get("/api/fixtures/snapshot", params);
    } catch (e: any) {
      console.error("Failed to fetch fixtures from TxLINE:", e.message);
      return [];
    }
  }

  // Get live odds snapshot
  public async getOdds(fixtureId: number) {
    try {
      return await this.get(`/api/odds/snapshot/${fixtureId}`);
    } catch (e: any) {
      console.error(`Failed to fetch odds for fixture ${fixtureId}:`, e.message);
      return [];
    }
  }

  // Get live scores snapshot
  public async getScores(fixtureId: number) {
    try {
      return await this.get(`/api/scores/snapshot/${fixtureId}`);
    } catch (e: any) {
      console.error(`Failed to fetch scores for fixture ${fixtureId}:`, e.message);
      return [];
    }
  }

  // Load token cache from disk
  private loadCache() {
    if (this.apiToken && this.jwt) return;
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      try {
        const cache = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, "utf-8"));
        if (cache.apiToken && cache.jwt && cache.network === this.config.network) {
          this.apiToken = cache.apiToken;
          this.jwt = cache.jwt;
          console.log("Loaded TxLINE credentials from cache");
        }
      } catch (e) {
        console.error("Failed to read token cache:", e);
      }
    }
  }
}

// Singleton instance
export const txline = new TxlineClient();
