import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { RouteWarp } from "@/components/shell/RouteWarp";
import { SideNav } from "@/components/shell/SideNav";
import { StoreHydrator } from "@/components/shell/StoreHydrator";
import { TopBar } from "@/components/shell/TopBar";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Samajh: the tutor that listens to how you think",
  description: "Adaptive CBSE Class 10 Physics exam prep that grades your reasoning, not just your answer.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TooltipProvider delay={250}>
          <StoreHydrator />
          <RouteWarp />
          <TopBar />
          <div className="flex flex-1">
            <SideNav />
            <main className="min-w-0 flex-1 p-4">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
