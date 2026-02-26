import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Revenue Calculator — AI Agency Institute",
  description: "Find out how much AI could add to your physio practice each month.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#fafafa" }}>{children}</body>
    </html>
  );
}
