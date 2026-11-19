# Mis Vislumbres – Checkout

Aplicación Next.js para tokenizar tarjetas con Mercado Pago.js y crear suscripciones individuales asociadas al Telegram ID.

## Variables de entorno
- NEXT_PUBLIC_MP_PUBLIC_KEY: clave pública de Mercado Pago.
- MP_ACCESS_TOKEN: Access Token privado, solo servidor.
- MP_PREAPPROVAL_PLAN_ID: ID del plan mensual.
- CHECKOUT_SIGNING_SECRET: secreto compartido para firmar JWT HS256 desde n8n.

La página espera un parámetro ?session=<JWT>. El JWT debe usar HS256, issuer misvislumbres-n8n, audience misvislumbres-checkout, y claims telegram_id, email, iat y exp. No se aceptan identificadores sin firma.
