'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import PageLayout from '@/app/components/PageLayout';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function ThemeTestPage() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="p-8">Loading theme test...</div>;
  }
  
  return (
    <PageLayout>
      <div className="space-y-8">
        <div className="header-banner rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-2">Theme Testing Page</h1>
          <p className="mb-4">This page helps verify the theme implementation works correctly</p>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-white/20 dark:bg-black/20 p-4 rounded-lg">
              <p className="font-medium">Current Theme:</p>
              <p className="text-xl font-bold">{theme}</p>
              <p className="text-sm opacity-80">Resolved to: {resolvedTheme}</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setTheme('light')} 
                className="btn btn-primary"
              >
                Set Light Theme
              </button>
              <button 
                onClick={() => setTheme('dark')} 
                className="btn btn-primary"
              >
                Set Dark Theme
              </button>
              <button 
                onClick={() => setTheme('system')} 
                className="btn btn-primary"
              >
                Set System Theme
              </button>
            </div>
            
            <ThemeToggle />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-3">Color Palettes</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Background Colors</h3>
                <div className="flex gap-2 flex-wrap">
                  <ColorSwatch name="bg-light-bg dark:bg-dark-bg" className="bg-light-bg dark:bg-dark-bg" />
                  <ColorSwatch name="bg-light-card dark:bg-dark-card" className="bg-light-card dark:bg-dark-card" />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Text Colors</h3>
                <div className="flex gap-2 flex-wrap">
                  <ColorSwatch name="text-light-text dark:text-dark-text" className="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text" showText />
                  <ColorSwatch name="text-light-muted dark:text-dark-muted" className="bg-light-card dark:bg-dark-card text-light-muted dark:text-dark-muted" showText />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Brand Colors</h3>
                <div className="flex gap-2 flex-wrap">
                  <ColorSwatch name="brand-primary/Dark" className="bg-brand-primary dark:bg-brand-primaryDark" />
                  <ColorSwatch name="brand-secondary/Dark" className="bg-brand-secondary dark:bg-brand-secondaryDark" />
                  <ColorSwatch name="brand-success/Dark" className="bg-brand-success dark:bg-brand-successDark" />
                  <ColorSwatch name="brand-warning/Dark" className="bg-brand-warning dark:bg-brand-warningDark" />
                  <ColorSwatch name="brand-error/Dark" className="bg-brand-error dark:bg-brand-errorDark" />
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Brand Colors (Darker)</h3>
                <div className="flex gap-2 flex-wrap">
                  <ColorSwatch name="primaryDarker" className="bg-brand-primaryDarker" />
                  <ColorSwatch name="secondaryDarker" className="bg-brand-secondaryDarker" />
                  <ColorSwatch name="successDarker" className="bg-brand-successDarker" />
                  <ColorSwatch name="warningDarker" className="bg-brand-warningDarker" />
                  <ColorSwatch name="errorDarker" className="bg-brand-errorDarker" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-bold mb-3">UI Components</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Buttons</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-primary">Primary</button>
                  <button className="btn btn-secondary">Secondary</button>
                  <button className="btn btn-outline">Outline</button>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Status Badges</h3>
                <div className="flex flex-wrap gap-2">
                  <span className="status-badge status-success">Success</span>
                  <span className="status-badge status-warning">Warning</span>
                  <span className="status-badge status-error">Error</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Status Panels</h3>
                <div className="space-y-2">
                  <div className="status-panel status-panel-success">Success message panel</div>
                  <div className="status-panel status-panel-warning">Warning message panel</div>
                  <div className="status-panel status-panel-error">Error message panel</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Form Controls</h3>
                <div className="space-y-2">
                  <input type="text" placeholder="Text input" className="w-full" />
                  <select className="w-full">
                    <option>Select option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                  </select>
                  <textarea placeholder="Textarea" className="w-full" rows={2}></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <h2 className="text-xl font-bold mb-3">Table Example</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Campaign 1</td>
                <td><span className="status-badge status-success">Active</span></td>
                <td>2023-05-15</td>
                <td>
                  <button className="btn btn-outline">Edit</button>
                </td>
              </tr>
              <tr>
                <td>Campaign 2</td>
                <td><span className="status-badge status-warning">Draft</span></td>
                <td>2023-05-20</td>
                <td>
                  <button className="btn btn-outline">Edit</button>
                </td>
              </tr>
              <tr>
                <td>Campaign 3</td>
                <td><span className="status-badge status-error">Failed</span></td>
                <td>2023-05-25</td>
                <td>
                  <button className="btn btn-outline">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  );
}

// Color swatch component for displaying theme colors
interface ColorSwatchProps {
  name: string;
  className: string;
  showText?: boolean;
}

function ColorSwatch({ name, className, showText = false }: ColorSwatchProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={`h-12 w-24 rounded border ${className} flex items-center justify-center`}>
        {showText && <span>Text</span>}
      </div>
      <span className="text-xs mt-1 text-light-muted dark:text-dark-muted">{name}</span>
    </div>
  );
} 