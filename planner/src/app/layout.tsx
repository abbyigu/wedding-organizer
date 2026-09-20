import type { Metadata } from "next";
import { Caveat, Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import ConfirmProvider from "@/components/ConfirmProvider";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "500", "600"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Our Wedding Room",
  description: "Planning workspace for Ariel & Fred's wedding.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ConfirmProvider>{children}</ConfirmProvider></body>
    </html>
  );
}
