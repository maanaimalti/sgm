import type { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const pdfUrl = searchParams.get("pdfurl");
  console.log({ pdfUrl });
  if (!pdfUrl) {
    return new Response("Missing PDF URL", { status: 400 });
  }
  try {
    const response = await fetch(pdfUrl, {
      headers: {
        "Content-Type": "application/pdf"
      }
    });
    const blob = await response.blob();
    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf"
      }
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
    return new Response("Error downloading PDF", { status: 500 });
  }
}