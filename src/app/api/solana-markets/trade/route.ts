import { NextRequest, NextResponse } from "next/server";
import { solanaMarketService } from "@/services/solana-market-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, fixtureId, outcome, tradeType, amount } = body;
    if (!walletAddress || !fixtureId || !outcome || !tradeType || !amount) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }
    const result = solanaMarketService.executeTrade({
      walletAddress,
      fixtureId: Number(fixtureId),
      outcome,
      tradeType,
      amount: Number(amount)
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
