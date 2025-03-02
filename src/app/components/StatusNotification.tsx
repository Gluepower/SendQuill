"use client";

import { useState, useEffect } from 'react';

interface StatusNotificationProps {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  showConfirmButton?: boolean;
  confirmText?: string;
  cancelText?: string;
  autoCloseDelay?: number;
}

export default function StatusNotification({
  title,
  message,
  type = 'success',
  isOpen,
  onClose,
  onConfirm,
  showConfirmButton = false,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  autoCloseDelay = 5000
}: StatusNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Add debug log to track when this component opens
      console.log('StatusNotification opened:', { title, message, type });
      setIsVisible(true);
      
      // Auto close after delay if specified and it's not a confirmation dialog
      if (autoCloseDelay > 0 && !showConfirmButton) {
        const timer = setTimeout(() => {
          console.log('StatusNotification auto-closing:', { title });
          onClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseDelay, onClose, showConfirmButton, title, message, type]);

  if (!isOpen && !isVisible) return null;

  const typeStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-800 dark:text-green-200',
      border: 'border-green-500',
      button: 'bg-green-500 hover:bg-green-600 text-white',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-800 dark:text-red-200',
      border: 'border-red-500',
      button: 'bg-red-500 hover:bg-red-600 text-white',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-500',
      button: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-800 dark:text-blue-200',
      border: 'border-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  const style = typeStyles[type];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={!showConfirmButton ? onClose : undefined} />
      
      <div 
        className={`relative w-full max-w-md ${style.bg} ${style.text} rounded-xl border ${style.border} shadow-2xl transform transition-all ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="flex flex-col items-center p-6 text-center">
          <div className={`mb-4 ${style.text}`}>
            {style.icon}
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            {title}
          </h3>
          
          {message && (
            <p className="mb-6 text-sm opacity-80">
              {message}
            </p>
          )}
          
          {showConfirmButton ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full font-medium bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-5 py-2 rounded-full font-medium transition-colors ${style.button}`}
              >
                {confirmText}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-full font-medium transition-colors ${style.button}`}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 