import SubscriptionForm from "@/components/subscription-form";
export default function Home() {
  return <main className="page-shell"><section className="subscription-card"><div className="eyebrow">MIS VISLUMBRES</div><h1>Un espacio para la reflexión</h1><p className="intro">Videos, meditaciones y reflexiones para acompañar tu camino interior.</p><div className="price"><strong>$3.000</strong><span>ARS / mes</span></div><div className="rule" /><h2>Activá tu suscripción</h2><p className="muted">El pago se procesa de forma segura mediante Mercado Pago. Los datos de tu tarjeta no pasan por nuestros servidores.</p><SubscriptionForm /><p className="footnote">Suscripción mensual recurrente. Podés gestionar la cancelación desde Mercado Pago.</p></section></main>;
}
