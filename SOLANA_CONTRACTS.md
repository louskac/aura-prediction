# Solana Prediction Market Smart Contracts (World.xyz & JanusFI AMM)

This document specifies the architecture, account structures, and instruction layouts of the prediction market smart contracts simulated on the Aura platform.

---

## 1. Deployed Program Addresses (Solana Devnet)

The Solana-native portion of Aura Markets interacts with three core programs deployed on Solana Devnet:

| Program Name | Purpose | Program ID (Public Key) |
| :--- | :--- | :--- |
| **prediCt Core** | AMM Vault, collateral locks, split/merge token minting. | `prediCtPZCttYMvm2W3PtxmMxLmT1dtN7riU6Cxh6tM` |
| **JanusFI AMM** | Constant-product market maker routing & pool liquidity. | `janusFiPqX1tMv6rUYqHwL7yBndB7jM7v8C6XhS9Pq` |
| **DFlow Router** | RFQ (Request-For-Quote) router matching quotes. | `DFLowEnginX918sK8YnL8g6T7qWdM5yRndB2wVv6PX` |

---

## 2. Program Accounts & PDA Derivations

The **prediCt** core program utilizes Program Derived Addresses (PDAs) to securely manage the stablecoin collateral and outcome tokens.

### A. Market Vault Account
Stores the locked CASH stablecoin backing the YES/NO token sets.
*   **Seed derivation:** `[b"market_vault", fixture_id.to_le_bytes()]`
*   **Authority:** `prediCt` Program ID
*   **Token Mint Address:** Deployed mock `CASH` Stablecoin Mint (`CashStable111111111111111111111111111111111`)

### B. Outcome Token Mints (Token-2022)
Outcome tokens are standard Token-2022 mints with **Permanent Delegate** extensions assigned back to the `prediCt` PDA. This allows the program to burn tokens during `merge` or settlement without requiring separate user trust delegation.
*   **YES Mint Seed:** `[b"mint", fixture_id.to_le_bytes(), b"YES"]`
*   **NO Mint Seed:** `[b"mint", fixture_id.to_le_bytes(), b"NO"]`

---

## 3. Instruction Definitions (Anchor IDL)

### 1. `initialize_market`
Deploys a new prediction pair vault for a specific match fixture.
```rust
pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    fixture_id: u64,
    initial_prob: u8
) -> Result<()>
```
*   **Accounts:**
    *   `[signer]` `authority` - The oracle or operator initializer.
    *   `[writable]` `market_vault` - The PDA vault account for CASH.
    *   `[writable]` `yes_mint` - Token-2022 mint PDA for YES.
    *   `[writable]` `no_mint` - Token-2022 mint PDA for NO.
    *   `[]` `system_program` - Solana system program.
    *   `[]` `token_program` - Token-2022 program.

### 2. `split` (World.xyz AMM Collateral Lock)
Locks CASH collateral and mints equal amounts of YES and NO outcome tokens. Used to fund a trade or pool liquidity.
```rust
pub fn split(
    ctx: Context<SplitTokens>,
    amount_cash: u64
) -> Result<()>
```
*   **Accounts:**
    *   `[signer]` `user` - Wallet executing the split.
    *   `[writable]` `user_cash_account` - User's CASH token account.
    *   `[writable]` `market_vault` - PDA vault receiving CASH.
    *   `[writable]` `yes_mint` - YES Token-2022 mint.
    *   `[writable]` `no_mint` - NO Token-2022 mint.
    *   `[writable]` `user_yes_account` - Destination YES ATA.
    *   `[writable]` `user_no_account` - Destination NO ATA.
    *   `[]` `token_program` - Token-2022 program.

### 3. `merge` (World.xyz AMM Collateral Release)
Burns matching amounts of YES and NO tokens to release the underlying CASH collateral back to the user.
```rust
pub fn merge(
    ctx: Context<MergeTokens>,
    amount_shares: u64
) -> Result<()>
```
*   **Accounts:**
    *   `[signer]` `user` - Wallet executing the merge.
    *   `[writable]` `user_yes_account` - Source YES ATA (tokens burned).
    *   `[writable]` `user_no_account` - Source NO ATA (tokens burned).
    *   `[writable]` `yes_mint` - YES token mint PDA.
    *   `[writable]` `no_mint` - NO token mint PDA.
    *   `[writable]` `market_vault` - PDA vault holding CASH collateral.
    *   `[writable]` `user_cash_account` - Destination account receiving CASH.
    *   `[]` `token_program` - Token-2022 program.

### 4. `swap` (JanusFI AMM Pool Swap)
Swaps CASH for outcome tokens (or vice-versa) against the Constant-Product Market Maker (CPMM) pool.
```rust
pub fn swap(
    ctx: Context<SwapPool>,
    amount_in: u64,
    minimum_amount_out: u64,
    direction: u8 // 0 = CASH to YES, 1 = CASH to NO, 2 = YES to CASH, 3 = NO to CASH
) -> Result<()>
```

---

## 4. Next.js Routing Integration

The Node backend server acts as a local proxy to submit transactions on behalf of the user's ledger:
1. **Buys:** Route `/api/solana-markets/trade` triggers `claim_faucet` or `split` to lock CASH stablecoin and routes the selected side to the user's portfolio.
2. **Sells:** Triggers `merge` to burn the matching outcome tokens and payout CASH.
3. **Settlement:** `/api/solana-markets/redeem` checks the finished fixture score and triggers the validator operator to burn the winning shares and transfer the full collateral payload ($1.00 CASH per share) to the user's wallet address.
