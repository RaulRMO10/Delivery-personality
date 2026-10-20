import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";
import { LOJA } from "@delivery/core";

export const metadata: Metadata = {
  title: { default: LOJA.nome, template: `%s · ${LOJA.nome}` },
};

export const viewport: Viewport = {
  themeColor: "#be2f66",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
