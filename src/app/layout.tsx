import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "~/components/providers";

export const metadata: Metadata = {
  title: "Service Requests — Take-Home",
  description: "Take-home assignment starter",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
