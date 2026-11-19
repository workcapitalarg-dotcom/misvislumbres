import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { session } = await request.json();
    const secretValue = process.env.CHECKOUT_SIGNING_SECRET;
    if (typeof session !== "string" || !secretValue) return NextResponse.json({ error: "Enlace inválido." }, { status: 400 });
    const { payload } = await jwtVerify(session, new TextEncoder().encode(secretValue), { algorithms: ["HS256"], issuer: "misvislumbres-n8n", audience: "misvislumbres-checkout" });
    if (typeof payload.email !== "string" || typeof payload.telegram_id !== "string") return NextResponse.json({ error: "El enlace no contiene los datos requeridos." }, { status: 400 });
    return NextResponse.json({ email: payload.email });
  } catch { return NextResponse.json({ error: "El enlace venció o no es válido. Solicitá uno nuevo en Telegram." }, { status: 401 }); }
}
