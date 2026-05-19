import "server-only";

const PUBLIC_BASE_URL = "https://pawject-patrol.d1bjfxqn6lx7l.amplifyapp.com";

function getBaseUrl(): string {
  return PUBLIC_BASE_URL;
}

function absoluteUrl(path: string): string {
  const base = getBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined" || id === "null") {
    return new Response("Missing animal id", { status: 400 });
  }
  const url = new URL(req.url);

  const sizeParam = url.searchParams.get("size");
  const size = Math.min(
    1024,
    Math.max(128, Number.parseInt(sizeParam || "300", 10) || 300)
  );

  // This is the *scan* destination.
  const scanUrl = absoluteUrl(`/qr/animal/${encodeURIComponent(id)}`);

  // External QR code provider: QuickChart
  const quickChartUrl = new URL("https://quickchart.io/qr");
  quickChartUrl.searchParams.set("text", scanUrl);
  quickChartUrl.searchParams.set("size", String(size));

  const qrRes = await fetch(quickChartUrl.toString(), {
    // Let Next/Vercel cache this response.
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!qrRes.ok) {
    return new Response("Failed to generate QR code", { status: 502 });
  }

  const contentType = qrRes.headers.get("content-type") || "image/png";
  const buffer = await qrRes.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      // Cache the generated QR for a day.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
