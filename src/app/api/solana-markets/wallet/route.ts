import { NextRequest, NextResponse } from "next/server";
import { solanaMarketService } from "@/services/solana-market-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");
    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Missing walletAddress" }, { status: 400 });
    }
    const wallet = solanaMarketService.getOrCreateWallet(walletAddress);
    return NextResponse.json({ success: true, wallet });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
