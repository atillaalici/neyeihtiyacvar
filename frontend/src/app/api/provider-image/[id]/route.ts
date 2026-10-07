import { NextRequest, NextResponse } from "next/server";

const backendBaseUrl =
  process.env.INTERNAL_API_BASE_URL?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://127.0.0.1:5155";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

  const response = await fetch(
    `${backendBaseUrl}/api/providers/${encodeURIComponent(id)}/image`,
    { cache: "no-store" },
  );

  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
