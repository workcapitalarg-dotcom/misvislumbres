import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Mis Vislumbres | Suscripción", description: "Suscripción mensual a Mis Vislumbres." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body>{children}</body></html>; }
