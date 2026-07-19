import { NextRequest, NextResponse } from "next/server";
import { solanaMarketService } from "@/services/solana-market-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress } = body;
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Missing walletAddress" }, { status: 400 });
    }
    const result = solanaMarketService.claimFaucet(walletAddress);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
