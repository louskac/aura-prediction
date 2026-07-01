import { NextResponse } from "next/server";
import { db, initDb } from "@/db/db";
import { orders, shares, trades, markets } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    initDb();
    const body = await request.json();
    const { walletAddress, marketId, orderType, price, sharesCount } = body;

    if (!walletAddress || !marketId || !orderType || !price || !sharesCount) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    const intPrice = Number(price);
    const intShares = Number(sharesCount);

    if (intPrice <= 0 || intPrice >= 100) {
      return NextResponse.json({ success: false, error: "Price must be between 1 and 99" }, { status: 400 });
    }

    // 1. Fetch the market
    const market = db.select().from(markets).where(sql`id = ${marketId}`).get();
    if (!market || market.status !== "Active") {
      return NextResponse.json({ success: false, error: "Market is not active or does not exist" }, { status: 400 });
    }

    // 2. Create the incoming order in memory
    let remainingShares = intShares;
    const newOrderVal = {
      walletAddress,
      marketId,
      orderType,
      price: intPrice,
      sharesCount: intShares,
      sharesRemaining: intShares,
      status: "Open",
      createdAt: Date.now(),
    };

    // 3. Try matching orders
    // We match BuyYes at P with BuyNo at 100-P (or lower, i.e., complementary), or SellYes at P (or lower)
    let oppositeType = "";
    let matchCondition = "";

    if (orderType === "BuyYes") {
      oppositeType = "BuyNo";
      // We match if BuyNo price is >= 100 - P
      // E.g. BuyYes at 60 can match with BuyNo at 40 (or higher, like 45)
      // The total is >= 100, which is fully backed.
      // We sort by price descending to match the best offers first
      const matchingOpponents = db.select()
        .from(orders)
        .where(sql`market_id = ${marketId} AND order_type = ${oppositeType} AND price >= ${100 - intPrice} AND status = 'Open'`)
        .orderBy(sql`price DESC`)
        .all();

      for (const opp of matchingOpponents) {
        if (remainingShares <= 0) break;

        const oppRemaining = opp.sharesRemaining;
        const matchQty = Math.min(remainingShares, oppRemaining);

        // Execute match
        remainingShares -= matchQty;

        // Update opposite order
        const newOppRemaining = oppRemaining - matchQty;
        db.update(orders)
          .set({
            sharesRemaining: newOppRemaining,
            status: newOppRemaining === 0 ? "Filled" : "Open"
          })
          .where(sql`id = ${opp.id}`)
          .run();

        // Create trade
        db.insert(trades).values({
          marketId,
          buyer: walletAddress,
          seller: opp.walletAddress,
          sharesCount: matchQty,
          price: intPrice,
          timestamp: Date.now()
        }).run();

        // Distribute shares: Buyer gets YES shares, Seller gets NO shares
        // In prediction markets, if a BuyYes matches with a BuyNo, it mints a complete contract (YES + NO)
        // because the total price paid is 100 cents (or P + (100-P)).
        // Buyer of Yes gets matchQty of YES. Seller of No gets matchQty of NO.
        updateShares(walletAddress, marketId, matchQty, 0);
        updateShares(opp.walletAddress, marketId, 0, matchQty);
      }
    } else if (orderType === "BuyNo") {
      oppositeType = "BuyYes";
      const matchingOpponents = db.select()
        .from(orders)
        .where(sql`market_id = ${marketId} AND order_type = ${oppositeType} AND price >= ${100 - intPrice} AND status = 'Open'`)
        .orderBy(sql`price DESC`)
        .all();

      for (const opp of matchingOpponents) {
        if (remainingShares <= 0) break;

        const oppRemaining = opp.sharesRemaining;
        const matchQty = Math.min(remainingShares, oppRemaining);

        remainingShares -= matchQty;

        // Update opposite
        const newOppRemaining = oppRemaining - matchQty;
        db.update(orders)
          .set({
            sharesRemaining: newOppRemaining,
            status: newOppRemaining === 0 ? "Filled" : "Open"
          })
          .where(sql`id = ${opp.id}`)
          .run();

        // Create trade
        db.insert(trades).values({
          marketId,
          buyer: opp.walletAddress,
          seller: walletAddress,
          sharesCount: matchQty,
          price: opp.price,
          timestamp: Date.now()
        }).run();

        // Distribute: Opp gets YES, Caller gets NO
        updateShares(opp.walletAddress, marketId, matchQty, 0);
        updateShares(walletAddress, marketId, 0, matchQty);
      }
    }

    // 4. Save remaining as open order or filled
    newOrderVal.sharesRemaining = remainingShares;
    newOrderVal.status = remainingShares === 0 ? "Filled" : "Open";
    
    db.insert(orders).values(newOrderVal).run();

    // 5. Update market price estimates based on last matched or order price
    const lastPrice = orderType === "BuyYes" ? intPrice : 100 - intPrice;
    db.update(markets).set({
      yesPrice: lastPrice,
      noPrice: 100 - lastPrice
    }).where(sql`id = ${marketId}`).run();

    return NextResponse.json({
      success: true,
      remainingShares,
      status: newOrderVal.status
    });
  } catch (err: any) {
    console.error("Trade transaction failed:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Helper to update share balances in database
function updateShares(walletAddress: string, marketId: number, yesAdd: number, noAdd: number) {
  const existing = db.select().from(shares).where(sql`wallet_address = ${walletAddress} AND market_id = ${marketId}`).get();
  if (existing) {
    db.update(shares).set({
      yesShares: existing.yesShares + yesAdd,
      noShares: existing.noShares + noAdd
    }).where(sql`id = ${existing.id}`).run();
  } else {
    db.insert(shares).values({
      walletAddress,
      marketId,
      yesShares: yesAdd,
      noShares: noAdd
    }).run();
  }
}
