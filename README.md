# Mis Vislumbres – Checkout

Aplicación Next.js para tokenizar tarjetas con Mercado Pago.js y crear suscripciones individuales asociadas al Telegram ID.

## Variables de entorno en Vercel

- `NEXT_PUBLIC_MP_PUBLIC_KEY`: clave pública de Mercado Pago (publicable).
- `MP_ACCESS_TOKEN`: Access Token privado de Mercado Pago. Solo servidor.
- `MP_PREAPPROVAL_PLAN_ID`: ID del plan mensual configurado en Mercado Pago.
- `CHECKOUT_SIGNING_SECRET`: secreto compartido para validar JWT HS256 emitidos por n8n.

No guardes credenciales reales en GitHub ni en variables `NEXT_PUBLIC_`, excepto la clave pública.

## Sesión de checkout

La página espera `?session=<JWT>`. El JWT debe usar HS256, issuer `misvislumbres-n8n`, audience `misvislumbres-checkout`, y claims `telegram_id`, `email`, `iat` y `exp`. No se aceptan identificadores sin firma.

## Flujo de pago y acceso

1. n8n emite el JWT firmado y entrega el enlace de checkout al usuario por Telegram.
2. Next.js valida el JWT antes de mostrar el formulario.
3. Mercado Pago.js tokeniza los datos de tarjeta en el navegador. Los datos sensibles de tarjeta no pasan por el backend propio.
4. Next.js consulta el plan configurado y verifica que sea de ARS 3.000, con frecuencia de un mes.
5. Next.js crea la suscripción asociada al plan con `card_token_id`.
6. La respuesta de creación de suscripción no habilita por sí sola el acceso al canal.
7. El workflow de n8n debe verificar la notificación y el primer pago en Mercado Pago antes de activar al usuario y generar la invitación de Telegram.

## Plan de suscripción acordado

- Importe: ARS 3.000
- Frecuencia: mensual
- Renovación: automática

El endpoint consulta el plan indicado por `MP_PREAPPROVAL_PLAN_ID` antes de crear la suscripción y rechaza la operación si el importe, moneda o frecuencia no coinciden con este acuerdo.

## Webhooks y n8n

El workflow existente de n8n debe estar activo y utilizar su URL de producción (no la URL `webhook-test`). El webhook debe procesar las notificaciones de suscripción y pagos recurrentes, consultar el recurso correspondiente en la API de Mercado Pago y conceder acceso solo después de verificar el pago.

No habilitar el acceso basándose únicamente en el estado `authorized` de la suscripción.

## Desarrollo local

```bash
npm install
npm run dev
```

## Despliegue

Conectar este repositorio a Vercel y cargar las variables de entorno en el proyecto. Después de cada cambio en la rama conectada, Vercel ejecutará el build y el despliegue.
