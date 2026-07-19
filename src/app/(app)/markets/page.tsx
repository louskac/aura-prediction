import { db, initDb } from "@/db/db";
import { 
  markets as marketsTable, 
  orders as ordersTable, 
  trades as tradesTable, 
  fixtures as fixturesTable,
  shares as sharesTable
} from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { txline } from "@/services/txline";
import { solanaMarketService } from "@/services/solana-market-service";
import SolanaMarketsClient from "./SolanaMarketsClient";

async function getMarketsData(selectedId: number | null, userWallet: string) {
  initDb();
  
  // Seed special micro-markets for Aura Limit Order Book if missing
  const specialSeeded = db.select().from(marketsTable).where(eq(marketsTable.type, "special_micro")).all();
  if (specialSeeded.length === 0) {
    const liveFixture = db.select().from(fixturesTable).where(eq(fixturesTable.status, "InPlay")).get();
    const fixtureId = liveFixture ? liveFixture.fixtureId : 18257739;
    
    const specialMarkets = [
      {
        name: "[SPECIAL] Next Goalscorer (Messi vs Yamal)",
        description: "Aura Limit Order Book market: Will Lionel Messi score the next goal in the match? YES pays out 100¢ if Messi scores next, NO pays if Lamine Yamal scores next.",
        type: "special_micro",
        fixtureId,
        targetValue: "Messi",
        yesPrice: 45,
        noPrice: 55,
        status: "Active",
        createdAt: Date.now()
      },
      {
        name: "[SPECIAL] Expected Threat Transition Success (xT)",
        description: "Aura Limit Order Book market: Will the current possession transition entering the final third result in a shot? YES pays out 100¢ if a shot is taken, NO pays if possession is lost.",
        type: "special_micro",
        fixtureId,
        targetValue: "Shot taken",
        yesPrice: 62,
        noPrice: 38,
        status: "Active",
        createdAt: Date.now()
      },
      {
        name: "[SPECIAL] Next Card / Foul (Romero vs Laporte)",
        description: "Aura Limit Order Book market: Will Cristian Romero commit the next cardable foul? YES pays out 100¢ if Romero gets carded/fouls, NO pays if Laporte does.",
        type: "special_micro",
        fixtureId,
        targetValue: "Romero",
        yesPrice: 35,
        noPrice: 65,
        status: "Active",
        createdAt: Date.now()
      }
    ];

    for (const sm of specialMarkets) {
      db.insert(marketsTable).values(sm).run();
    }
  }
  
  // 1. Fetch all traditional simulated markets
  const list = db.select().from(marketsTable).all();
  
  // Sort so special_micro is at the top, then newest first
  list.sort((a, b) => {
    const isSpecialA = a.type === "special_micro";
    const isSpecialB = b.type === "special_micro";
    if (isSpecialA && !isSpecialB) return -1;
    if (!isSpecialA && isSpecialB) return 1;
    return b.id - a.id;
  });

  // Set default selection
  const activeId = selectedId || list[0]?.id || null;
  
  let selectedMarket = null;
  let openOrdersList: any[] = [];
  let tradesList: any[] = [];

  if (activeId) {
    selectedMarket = db.select().from(marketsTable).where(eq(marketsTable.id, activeId)).get() || null;
    openOrdersList = db.select().from(ordersTable).where(sql`market_id = ${activeId} AND status = 'Open'`).all();
    tradesList = db.select().from(tradesTable).where(sql`market_id = ${activeId}`).orderBy(sql`timestamp DESC`).all();
  }

  // 2. Fetch fixtures from DB for Solana AMM prediction markets
  const fixturesList = db.select().from(fixturesTable).orderBy(fixturesTable.startTime).all();

  // 3. Fetch user shares balances
  const userShares = db.select().from(sharesTable).where(eq(sharesTable.walletAddress, userWallet)).all();

  // 4. Get or create Solana wallet state for CASH/SOL balances
  const solWallet = solanaMarketService.getOrCreateWallet(userWallet);

  return {
    traditionalMarkets: list,
    openOrders: openOrdersList,
    trades: tradesList,
    activeId,
    fixtures: fixturesList,
    userShares,
    solWallet
  };
}

// Server action for placing a traditional limit order book trade
async function placeTrade(formData: FormData) {
  "use server";
  
  const status = await txline.getStatus();
  const walletAddress = status.walletAddress;
  const marketId = Number(formData.get("marketId"));
  const orderType = String(formData.get("orderType")); // 'BuyYes' or 'BuyNo'
  const price = Number(formData.get("price"));
  const sharesCount = Number(formData.get("sharesCount"));

  // Send request to our trade API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${baseUrl}/api/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, marketId, orderType, price, sharesCount })
    });
    const data = await res.json();
    console.log("Trade placed:", data);
  } catch (e) {
    console.error("Trade submit failed:", e);
  }

  redirect(`/markets?marketId=${marketId}&success=true`);
}

export default async function MarketsPage({ searchParams }: { searchParams: { marketId?: string, success?: string } }) {
  const status = await txline.getStatus();
  const userWallet = status.walletAddress;

  const selectedId = searchParams.marketId ? Number(searchParams.marketId) : null;
  const { 
    traditionalMarkets, 
    openOrders, 
    trades, 
    activeId, 
    fixtures, 
    userShares,
    solWallet 
  } = await getMarketsData(selectedId, userWallet);

  return (
    <SolanaMarketsClient
      walletAddress={userWallet}
      initialWallet={solWallet}
      fixtures={fixtures}
      traditionalMarkets={traditionalMarkets}
      initialShares={userShares.map(s => ({
        marketId: s.marketId,
        yesShares: s.yesShares,
        noShares: s.noShares
      }))}
      submitTradeAction={placeTrade}
      openOrders={openOrders}
      executedTrades={trades}
      activeTraditionalId={activeId}
    />
  );
}

export const revalidate = 0;
