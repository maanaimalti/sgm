import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pdfurl = searchParams.get("pdfurl") as string;
    redirect(pdfurl);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return NextResponse.json({ok: false});
  }
}