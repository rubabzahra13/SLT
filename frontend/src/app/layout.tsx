import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { AppStateProvider } from "@/context/AppStateContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm",
  preload: true,
});

export const metadata: Metadata = {
  title: "Sounds Like That | Admin",
  description: "Admin portal for Sounds Like That music production",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body className={`${dmSans.className} min-h-screen antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <AppStateProvider>
            <SidebarProvider>
              <AppShell>{children}</AppShell>
            </SidebarProvider>
          </AppStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
