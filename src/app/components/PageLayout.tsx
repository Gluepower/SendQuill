"use client";

import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface PageLayoutProps {
  children: React.ReactNode;
  showBackToDashboard?: boolean;
}

export default function PageLayout({
  children,
  showBackToDashboard = false,
}: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <Header showBackToDashboard={showBackToDashboard} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
} 