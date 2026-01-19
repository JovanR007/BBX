import { ToastProvider } from "@/components/ui/toaster";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/lib/stack";
import "./globals.css";
import { Inter } from "next/font/google"; // Using Inter for clean premium look
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BBX Tournament System",
  description: "Advanced Beyblade X Tournament Manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "min-h-screen bg-background text-foreground antialiased")}>
        <StackProvider app={stackServerApp}>
          <StackTheme>
            <ToastProvider>
              <div className="relative flex min-h-screen flex-col">
                <main className="flex-1">{children}</main>
              </div>
            </ToastProvider>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
