"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/hooks/useAuth";
import QuillLogo from "./QuillLogo";

interface HeaderProps {
  showBackToDashboard?: boolean;
}

export default function Header({ showBackToDashboard = false }: HeaderProps) {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="border-b border-light-border bg-light-card px-6 py-4 shadow-sm dark:bg-dark-card dark:border-dark-accent">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          <Link href="/dashboard" className="flex items-center gap-2 hover:scale-105 transition-transform">
            <QuillLogo className="h-8 w-8 text-brand-primary dark:text-brand-primaryDark" />
            <span className="font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-brand-primaryDark dark:to-brand-secondaryDark">SendQuill</span>
          </Link>
        </h1>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {showBackToDashboard && (
            <Link
              href="/dashboard"
              className="text-sm text-light-muted hover:text-light-text dark:text-dark-muted dark:hover:text-dark-text"
            >
              Back to Dashboard
            </Link>
          )}

          {/* User profile dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 rounded-full hover:bg-light-bg p-1 dark:hover:bg-dark-accent/50"
              >
                <div className="h-8 w-8 rounded-full bg-brand-primary dark:bg-brand-primaryDark flex items-center justify-center text-white font-medium">
                  {user.email && user.email[0].toUpperCase()}
                </div>
                <span className="text-sm text-light-text dark:text-dark-muted">{user.email?.split('@')[0]}</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-accent z-50">
                  <div className="px-4 py-2 text-xs text-light-muted dark:text-dark-muted">
                    Signed in as
                    <div className="font-medium text-light-text dark:text-dark-text truncate">{user.email}</div>
                  </div>
                  <div className="border-t border-light-border dark:border-dark-accent"></div>
                  <button
                    onClick={() => { signOut(); setShowDropdown(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-light-text hover:bg-light-bg dark:text-dark-muted dark:hover:bg-dark-accent/70"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 