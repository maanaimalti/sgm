import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pdfurl = searchParams.get("pdfurl") as string;
    await axios.get(pdfurl, {
      headers: {
        "Content-Type": "application/pdf"
      }
    });
    return NextResponse.json({ok: true});
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return NextResponse.json({ok: false});
  }
}