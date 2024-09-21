import axios from "axios";
import type { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pdfurl = searchParams.get("pdfurl") as string;
    await axios.get(pdfurl, {
      headers: {
        "Content-Type": "application/pdf"
      }
    });
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error("Error downloading PDF:", error);
  }
}