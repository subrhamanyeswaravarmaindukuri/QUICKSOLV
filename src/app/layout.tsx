import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickSolv — Advanced AI Study Platform",
  description: "Snap it. Understand it. Remember it. An AI-powered study tutor that explains concepts step-by-step with formulas, examples, quizzes, and research.",
  keywords: ["study tutor", "AI homework helper", "math solver", "physics tutor", "quiz generator", "patent research", "academic help"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-darkBg text-foreground flex flex-col">
        {children}
      </body>
    </html>
  );
}
