import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/parcours/${id}/pdf`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    return NextResponse.json({ error: "Impossible de contacter le serveur" }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "Erreur inconnue");
    return NextResponse.json({ error: detail }, { status: res.status });
  }

  const pdfBytes = await res.arrayBuffer();
  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="parcours-${id}.pdf"`,
    },
  });
}
