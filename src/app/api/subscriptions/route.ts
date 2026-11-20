import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type MercadoPagoPlan = {
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number | string;
    currency_id?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = body?.session;
    const cardTokenId = body?.card_token_id;
    const signingSecret = process.env.CHECKOUT_SIGNING_SECRET;
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const planId = process.env.MP_PREAPPROVAL_PLAN_ID;

    if (
      typeof session !== "string" ||
      typeof cardTokenId !== "string" ||
      !cardTokenId.trim() ||
      !signingSecret
    ) {
      return NextResponse.json({ error: "Solicitud incompleta." }, { status: 400 });
    }

    const { payload } = await jwtVerify(
      session,
      new TextEncoder().encode(signingSecret),
      {
        algorithms: ["HS256"],
        issuer: "misvislumbres-n8n",
        audience: "misvislumbres-checkout",
      },
    );

    if (
      typeof payload.email !== "string" ||
      typeof payload.telegram_id !== "string" ||
      !payload.telegram_id.trim()
    ) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    if (!accessToken || !planId) {
      return NextResponse.json(
        { error: "Mercado Pago todavía no está configurado." },
        { status: 503 },
      );
    }

    // Confirm the configured plan still matches the agreed product:
    // ARS 3,000 billed every month.
    const planResponse = await fetch(
      `https://api.mercadopago.com/preapproval_plan/${encodeURIComponent(planId)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (!planResponse.ok) {
      return NextResponse.json(
        { error: "No se pudo verificar el plan de suscripción en Mercado Pago." },
        { status: 503 },
      );
    }

    const plan = (await planResponse.json()) as MercadoPagoPlan;
    const recurring = plan.auto_recurring;
    const amount = Number(recurring?.transaction_amount);

    if (
      amount !== 3000 ||
      recurring?.currency_id !== "ARS" ||
      recurring?.frequency !== 1 ||
      recurring?.frequency_type !== "months"
    ) {
      return NextResponse.json(
        { error: "El plan configurado no coincide con la suscripción mensual de ARS 3.000." },
        { status: 409 },
      );
    }

    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preapproval_plan_id: planId,
        payer_email: payload.email,
        external_reference: payload.telegram_id,
        card_token_id: cardTokenId,
        status: "authorized",
      }),
      cache: "no-store",
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return NextResponse.json(
        { error: data.message || "Mercado Pago rechazó la autorización." },
        { status: mpResponse.status },
      );
    }

    if (typeof data.id !== "string" || typeof data.status !== "string") {
      return NextResponse.json(
        { error: "Mercado Pago devolvió una respuesta incompleta." },
        { status: 502 },
      );
    }

    // Subscription authorization is not, by itself, proof that the first
    // recurring payment was approved. n8n grants Telegram access only after
    // verifying the corresponding Mercado Pago payment notification.
    return NextResponse.json(
      {
        id: data.id,
        status: data.status,
        access: "pending_payment_verification",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo validar la sesión o procesar la suscripción." },
      { status: 400 },
    );
  }
}
