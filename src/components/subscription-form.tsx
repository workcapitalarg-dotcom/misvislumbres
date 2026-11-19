"use client";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    MercadoPago?: new (key: string, options?: { locale?: string }) => {
      cardForm: (options: Record<string, unknown>) => { getCardFormData: () => Record<string, unknown>; unmount?: () => void };
    };
  }
}

export default function SubscriptionForm() {
  const [session, setSession] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Verificando el enlace de suscripción…");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("session");
    if (!token) { setMessage("Enlace inválido. Volvé al bot de Telegram y solicitá uno nuevo."); return; }
    fetch("/api/checkout/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: token }) })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Enlace inválido"); return d; })
      .then(d => { setSession(token); setEmail(d.email); setMessage(""); setReady(true); })
      .catch(e => setMessage(e instanceof Error ? e.message : "No se pudo validar el enlace."));
  }, []);

  useEffect(() => {
    if (!ready) return;
    let form: { getCardFormData: () => Record<string, unknown>; unmount?: () => void } | undefined;
    let cancelled = false;
    async function mount() {
      const key = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
      if (!key) { setMessage("Falta configurar la clave pública de Mercado Pago en Vercel."); return; }
      if (!window.MercadoPago) await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script"); s.src = "https://sdk.mercadopago.com/js/v2"; s.async = true;
        s.onload = () => resolve(); s.onerror = () => reject(new Error("No se pudo cargar Mercado Pago.")); document.head.appendChild(s);
      });
      if (cancelled || !window.MercadoPago) return;
      const mp = new window.MercadoPago(key, { locale: "es-AR" });
      form = mp.cardForm({
        amount: "3000", iframe: true,
        form: {
          id: "form-checkout",
          cardholderName: { id: "form-checkout__cardholderName" },
          cardholderEmail: { id: "form-checkout__cardholderEmail" },
          cardNumber: { id: "form-checkout__cardNumber" },
          expirationDate: { id: "form-checkout__expirationDate" },
          securityCode: { id: "form-checkout__securityCode" },
          installments: { id: "form-checkout__installments" },
          identificationType: { id: "form-checkout__identificationType" },
          identificationNumber: { id: "form-checkout__identificationNumber" },
          issuer: { id: "form-checkout__issuer" }
        },
        callbacks: {
          onFormMounted: (error: unknown) => { if (error) setMessage("No se pudo inicializar el formulario de pago."); },
          onSubmit: async (event: Event) => {
            event.preventDefault(); setBusy(true); setMessage("Procesando la autorización…");
            try {
              const data = form?.getCardFormData();
              if (!data?.token || typeof data.token !== "string") throw new Error("Mercado Pago no generó el token de la tarjeta.");
              const response = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, card_token_id: data.token }) });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error || "Mercado Pago no pudo crear la suscripción.");
              setMessage("Suscripción autorizada. Volvé al bot de Telegram para continuar.");
            } catch (e) { setMessage(e instanceof Error ? e.message : "Ocurrió un error al procesar el pago."); }
            finally { setBusy(false); }
          }
        }
      });
    }
    mount().catch(e => setMessage(e instanceof Error ? e.message : "Error al iniciar el formulario."));
    return () => { cancelled = true; form?.unmount?.(); };
  }, [ready, session]);

  return <div>
    {!ready && <p className="notice" role="status">{message}</p>}
    {ready && <form id="form-checkout" className="payment-form">
      <label>Nombre del titular<input id="form-checkout__cardholderName" autoComplete="cc-name" /></label>
      <label>Email del pagador<input id="form-checkout__cardholderEmail" type="email" defaultValue={email} autoComplete="email" /></label>
      <label>Número de tarjeta<div id="form-checkout__cardNumber" className="mp-field" /></label>
      <div className="two-cols"><label>Vencimiento<div id="form-checkout__expirationDate" className="mp-field" /></label><label>Código de seguridad<div id="form-checkout__securityCode" className="mp-field" /></label></div>
      <label>Tipo de documento<select id="form-checkout__identificationType" /></label>
      <label>Número de documento<input id="form-checkout__identificationNumber" inputMode="numeric" /></label>
      <label className="hidden-field">Emisor<select id="form-checkout__issuer" /></label>
      <label className="hidden-field">Cuotas<select id="form-checkout__installments" /></label>
      <button type="submit" disabled={busy}>{busy ? "Procesando…" : "Autorizar suscripción mensual"}</button>
    </form>}
    {ready && message && <p className="notice" role="status">{message}</p>}
  </div>;
}
