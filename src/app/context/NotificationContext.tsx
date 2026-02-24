import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { notificationService, MTFNotification } from '@/lib/notification';

interface NotificationContextType {
    unreadCount: number;
    notifications: MTFNotification[];
    lastEvent: any;
    refreshUnreadCount: () => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<MTFNotification[]>([]);
    const [lastEvent, setLastEvent] = useState<any>(null);

    const refreshUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const count = await notificationService.getUnreadCount(user.id);
            setUnreadCount(count || 0);
        } catch (error) {
            console.error('Error refreshing unread count:', error);
        }
    }, [user]);

    const refreshNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await notificationService.getNotifications({ limit: 10 });
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error('Error refreshing notifications list:', error);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            setNotifications([]);
            setLastEvent(null);
            return;
        }

        // Initial fetch
        refreshUnreadCount();
        refreshNotifications();

        // Subscribe to changes (Single subscription for the entire app)
        const subscription = notificationService.subscribeToNotifications(user.id, (payload) => {
            setLastEvent(payload);
            
            // Handle updates automatically
            if (payload.eventType === 'INSERT') {
                refreshUnreadCount();
                refreshNotifications();
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                refreshUnreadCount();
                refreshNotifications();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user, refreshUnreadCount, refreshNotifications]);

    return (
        <NotificationContext.Provider value={{ 
            unreadCount, 
            notifications, 
            lastEvent,
            refreshUnreadCount, 
            refreshNotifications 
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}
