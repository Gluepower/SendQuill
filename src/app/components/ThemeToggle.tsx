"use client";

import { useTheme } from "@/lib/contexts/ThemeContext";
import { useState, useEffect } from "react";
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Debug theme status
  useEffect(() => {
    if (mounted) {
      console.log("ThemeToggle - Current theme:", theme);
      console.log("ThemeToggle - Resolved theme:", resolvedTheme);
      console.log("ThemeToggle - Dark mode class on HTML:", document.documentElement.classList.contains('dark'));
    }
  }, [theme, resolvedTheme, mounted]);

  // Avoid hydration mismatch by only rendering after component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to directly toggle between light and dark
  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    console.log(`Directly toggling theme to ${newTheme}`);
    setTheme(newTheme);
  };

  if (!mounted) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Quick toggle for easy testing */}
      <button 
        onClick={toggleTheme}
        className="flex items-center gap-1 text-sm bg-brand-primary/10 dark:bg-brand-primaryDark/20 rounded-md px-2 py-1 text-light-text dark:text-dark-text"
        aria-label="Toggle theme"
      >
        {resolvedTheme === 'dark' ? '☀️' : '🌙'}
        <span className="hidden sm:inline">Toggle</span>
      </button>
      
      {/* Detailed theme menu */}
      <Menu as="div" className="relative">
        <Menu.Button
          className="flex items-center gap-2 rounded-md px-3 py-2 font-medium transition-colors hover:bg-light-bg dark:text-dark-muted dark:hover:bg-dark-accent dark:hover:text-dark-text"
          aria-label="Theme options"
        >
          {resolvedTheme === "light" ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
              <span className="hidden md:block">Theme</span>
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
              <span className="hidden md:block">Theme</span>
            </>
          )}
        </Menu.Button>
        
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-light-card dark:bg-dark-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setTheme("light")}
                    className={`${
                      active ? 'bg-light-bg dark:bg-dark-accent' : ''
                    } ${
                      theme === "light" ? 'bg-light-bg dark:bg-dark-accent' : ''
                    } flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-light-text dark:text-dark-muted`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                      />
                    </svg>
                    Light
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setTheme("dark")}
                    className={`${
                      active ? 'bg-light-bg dark:bg-dark-accent' : ''
                    } ${
                      theme === "dark" ? 'bg-light-bg dark:bg-dark-accent' : ''
                    } flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-light-text dark:text-dark-muted`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                      />
                    </svg>
                    Dark
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => setTheme("system")}
                    className={`${
                      active ? 'bg-light-bg dark:bg-dark-accent' : ''
                    } ${
                      theme === "system" ? 'bg-light-bg dark:bg-dark-accent' : ''
                    } flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-light-text dark:text-dark-muted`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                      />
                    </svg>
                    System
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
} 