import "./globals.css";
import { Bricolage_Grotesque } from "next/font/google";
const f = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font" });
export const metadata = { title: "TuneConvert", description: "Your music. Your format." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={`${f.variable} font-sans antialiased`}>{children}</body></html>;
}
