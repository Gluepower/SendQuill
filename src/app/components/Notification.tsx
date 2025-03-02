"use client";

import { useState, useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  message: string;
  autoCloseDelay?: number; // in milliseconds
}

export default function Notification({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  autoCloseDelay = 5000 // Default 5 seconds
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      
      // Auto close after delay if specified
      if (autoCloseDelay > 0) {
        const timer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen && !isVisible) return null;

  // Determine icon and colors based on type
  const typeStyles = {
    success: {
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-500',
      iconColor: 'text-green-500',
      buttonBg: 'bg-green-500 hover:bg-green-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-500',
      iconColor: 'text-red-500',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    warning: {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-500',
      buttonBg: 'bg-yellow-500 hover:bg-yellow-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-500',
      buttonBg: 'bg-blue-500 hover:bg-blue-600',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const style = typeStyles[type];

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/50" />
      
      <div 
        className={`relative w-full max-w-md ${style.bgColor} rounded-lg border-l-4 ${style.borderColor} p-6 shadow-lg transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${style.iconColor}`}>
            {style.icon}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-300">
              {message}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 inline-flex h-8 w-8 dark:text-gray-500 dark:hover:text-white"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
        
        {/* Added OK button for all notification types */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md ${style.buttonBg} px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
} 