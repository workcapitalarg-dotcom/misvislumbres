import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { session, card_token_id } = await request.json();
    const secretValue = process.env.CHECKOUT_SIGNING_SECRET;
    if (typeof session !== "string" || typeof card_token_id !== "string" || !card_token_id || !secretValue) return NextResponse.json({ error: "Solicitud incompleta." }, { status: 400 });
    const { payload } = await jwtVerify(session, new TextEncoder().encode(secretValue), { algorithms: ["HS256"], issuer: "misvislumbres-n8n", audience: "misvislumbres-checkout" });
    if (typeof payload.email !== "string" || typeof payload.telegram_id !== "string") return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const planId = process.env.MP_PREAPPROVAL_PLAN_ID;
    if (!accessToken || !planId) return NextResponse.json({ error: "Mercado Pago todavía no está configurado." }, { status: 503 });
    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ preapproval_plan_id: planId, payer_email: payload.email, external_reference: payload.telegram_id, card_token_id, status: "authorized" }),
      cache: "no-store"
    });
    const data = await mpResponse.json();
    if (!mpResponse.ok) return NextResponse.json({ error: data.message || "Mercado Pago rechazó la autorización.", causes: data.cause || [] }, { status: mpResponse.status });
    return NextResponse.json({ id: data.id, status: data.status });
  } catch { return NextResponse.json({ error: "No se pudo validar la sesión o procesar la suscripción." }, { status: 400 }); }
}
