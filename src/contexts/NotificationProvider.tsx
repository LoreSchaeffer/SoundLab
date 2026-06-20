import {type PropsWithChildren, useCallback, useState} from 'react';
import {type NotificationConfig, NotificationContext} from './NotificationContext.ts';
import Notification from "../components/templates/Notification.tsx";

export const NotificationProvider = ({children}: PropsWithChildren) => {
    const [notifications, setNotifications] = useState<Required<NotificationConfig>[]>([]);

    const addNotification = useCallback((config: Omit<NotificationConfig, 'id'>) => {
        const id = crypto.randomUUID();

        const newNotification: Required<NotificationConfig> = {
            id,
            variant: config.variant || 'info',
            title: config.title || '',
            message: config.message,
            duration: config.duration !== undefined ? config.duration : 5000,
            closable: config.closable !== undefined ? config.closable : true,
        };

        setNotifications(prev => [...prev, newNotification]);
        return id;
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{addNotification, removeNotification}}>
            {children}

            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none',
                alignItems: 'flex-end'
            }}>
                {notifications.map(n => (
                    <Notification
                        key={n.id}
                        config={n}
                        onClose={() => removeNotification(n.id)}
                    />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};