import { NextResponse } from "next/server";
import { fantasyService } from "@/services/fantasy";

export const revalidate = 0; // force dynamic rendering

export async function GET() {
  try {
    console.log("Triggering fantasy points recalculation and pricing update...");
    await fantasyService.syncPoints();
    return NextResponse.json({
      success: true,
      message: "Fantasy player points and valuations synchronized successfully with TxLINE."
    });
  } catch (err: any) {
    console.error("Failed to sync fantasy statistics:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
