import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Nunito_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: "800",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mootz-red.vercel.app"),
  applicationName: "Mootz",
  title: { default: "Mootz", template: "%s · Mootz" },
  description: "Share your day. Meet in person. Keep a record together.",
  openGraph: {
    type: "website",
    siteName: "Mootz",
    title: "Mootz — Share your day. Meet in person.",
    description: "A social Map + Feed with shared memories on Monad.",
    images: [{ url: "/brand/mootz-social.png", width: 1200, height: 630, alt: "Mootz — Share your day. Meet in person." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mootz — Share your day. Meet in person.",
    description: "A social Map + Feed with shared memories on Monad.",
    images: ["/brand/mootz-social.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#6D28D9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Keeps sticky composers above the on-screen keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlowCondensed.variable} ${nunitoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
