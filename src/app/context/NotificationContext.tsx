import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { notificationService } from '@/lib/notification';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const refreshUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const count = await notificationService.getUnreadCount(user.id);
            setUnreadCount(count || 0);
        } catch (error) {
            console.error('Error refreshing unread count:', error);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        // Initial fetch
        refreshUnreadCount();

        // Subscribe to changes
        const subscription = notificationService.subscribeToNotifications(user.id, () => {
            // Refetch count on any change (INSERT/UPDATE/DELETE)
            refreshUnreadCount();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user, refreshUnreadCount]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
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
