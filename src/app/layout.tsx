import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { AppStateProvider } from "@/context/AppStateContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppShell } from "@/components/layout/AppShell";
import { ToastStack } from "@/components/notifications/NotificationBell";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm",
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={dmSans.variable}>
      <body className={`${dmSans.className} min-h-screen antialiased`}>
        <AppStateProvider>
          <SidebarProvider>
            <AppShell>{children}</AppShell>
            <ToastStack />
          </SidebarProvider>
        </AppStateProvider>
      </body>
    </html>
  );
}
