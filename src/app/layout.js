import { Plus_Jakarta_Sans, Work_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import LayoutShell from "@/components/LayoutShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: 'swap',
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata = {
  title: "Practiiko App - Autogestión",
  description: "Panel de administración y autogestión de Practiiko.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${plusJakartaSans.variable} ${workSans.variable}`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=sync_alt" />
      </head>
      <body>
        <Providers>
          <LayoutShell>
            {children}
          </LayoutShell>
        </Providers>
      </body>
    </html>
  );
}
