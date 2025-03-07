"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItemProps {
  href: string;
  label: string;
  isActive?: boolean;
}

function NavItem({ href, label, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-brand-primary/20 text-brand-primary dark:bg-brand-primaryDark/20 dark:text-brand-primaryDark"
          : "text-light-text hover:bg-light-bg hover:text-light-text dark:text-dark-muted dark:hover:bg-dark-accent dark:hover:text-dark-text"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <aside className="w-64 border-r border-light-border bg-light-card p-5 dark:bg-dark-card dark:border-dark-accent">
      <nav className="space-y-2">
        <NavItem 
          href="/dashboard" 
          label="Dashboard" 
          isActive={pathname === "/dashboard"} 
        />
        <NavItem 
          href="/contacts" 
          label="Contacts" 
          isActive={pathname === "/contacts" || pathname.startsWith("/contacts/")} 
        />
        <NavItem 
          href="/templates" 
          label="Templates" 
          isActive={pathname === "/templates" || pathname.startsWith("/templates/")} 
        />
        <NavItem 
          href="/campaigns" 
          label="Campaigns" 
          isActive={pathname === "/campaigns" || pathname.startsWith("/campaigns/")} 
        />
        <NavItem 
          href="/ai-prompt-studio" 
          label="AI Prompt Studio" 
          isActive={pathname === "/ai-prompt-studio" || pathname.startsWith("/ai-prompt-studio/")} 
        />
        <NavItem 
          href="/analytics" 
          label="Analytics" 
          isActive={pathname === "/analytics"} 
        />
      </nav>
    </aside>
  );
} 