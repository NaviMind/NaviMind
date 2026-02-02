import "./globals.css";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata = {
  title: "NaviMind",
  description: "Your AI Copilot for Maritime Operations",
  themeColor: "#0b1220",
  manifest: "/manifest.json",
  icons: {
    icon: "/branding/compass.png",
    apple: "/branding/compass.png",
  },
  appleWebApp: {
    capable: true,
    title: "NaviMind",
    statusBarStyle: "black",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="w-full max-w-[100vw] overflow-x-hidden">
      <head>
        {/* 👇 важные мета-теги для fullscreen и PWA */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0b1220" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="NaviMind" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
      </head>

      <body
  className={`${outfit.className} bg-[#0b1220] text-white w-full max-w-[100vw] overflow-x-hidden`}
  style={{ WebkitTapHighlightColor: "transparent" }}
>
        {children}
      </body>
    </html>
  );
}
