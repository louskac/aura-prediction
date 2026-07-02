import { NextResponse } from "next/server";
import { syncFixtures } from "@/services/txline";

export async function GET() {
  try {
    const result = await syncFixtures();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("Failed to sync database with TxLINE:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
