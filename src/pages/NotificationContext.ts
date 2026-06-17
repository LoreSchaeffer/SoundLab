import {createContext, type ReactNode, useContext} from 'react';

export type NotificationVariant = 'info' | 'success' | 'warning' | 'danger';

export type NotificationConfig = {
    id?: string;
    variant?: NotificationVariant;
    title?: string;
    message: ReactNode;
    duration?: number;
    closable?: boolean;
};

export type NotificationContextType = {
    addNotification: (config: Omit<NotificationConfig, 'id'>) => string;
    removeNotification: (id: string) => void;
};

export const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error("useNotification must be used within a NotificationProvider");
    return context;
};