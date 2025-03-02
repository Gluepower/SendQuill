"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Notification, { NotificationType } from '@/app/components/Notification';

interface NotificationContextProps {
  showNotification: (type: NotificationType, title: string, message: string, autoCloseDelay?: number) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextProps>({
  showNotification: () => {},
  hideNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationProps, setNotificationProps] = useState({
    type: 'info' as NotificationType,
    title: '',
    message: '',
    autoCloseDelay: 5000,
  });

  const showNotification = (
    type: NotificationType,
    title: string,
    message: string,
    autoCloseDelay = 5000
  ) => {
    setNotificationProps({ type, title, message, autoCloseDelay });
    setIsOpen(true);
  };

  const hideNotification = () => {
    setIsOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      <Notification
        isOpen={isOpen}
        onClose={hideNotification}
        type={notificationProps.type}
        title={notificationProps.title}
        message={notificationProps.message}
        autoCloseDelay={notificationProps.autoCloseDelay}
      />
    </NotificationContext.Provider>
  );
} 