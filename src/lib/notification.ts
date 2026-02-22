import { supabase } from "./supabase";

export interface MTFNotification {
    id: string;
    user_id: string;
    type: 'transaction' | 'loan' | 'plan' | 'help' | 'profile' | 'reminder';
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

export interface NotificationSettings {
    user_id: string;
    email_enabled: boolean;
    in_app_enabled: boolean;
    marketing_enabled: boolean;
    reminder_frequency: 'daily' | 'weekly' | 'monthly';
}

export const notificationService = {
    /**
     * Fetch notifications for the current user with pagination and filtering
     */
    async getNotifications(options: {
        page?: number;
        limit?: number;
        type?: string;
        search?: string;
        startDate?: Date;
        endDate?: Date;
    } = {}) {
        const { page = 1, limit = 25, type, search, startDate, endDate } = options;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (type && type !== 'all') {
            query = query.eq('type', type);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`);
        }

        if (startDate) {
            query = query.gte('created_at', startDate.toISOString());
        }

        if (endDate) {
            query = query.lte('created_at', endDate.toISOString());
        }

        const { data, count, error } = await query;

        if (error) throw error;
        return {
            notifications: data as MTFNotification[],
            totalCount: count || 0,
            hasMore: count ? (from + (data?.length || 0) < count) : false
        };
    },

    /**
     * Get count of unread notifications
     */
    async getUnreadCount() {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    },

    /**
     * Mark a specific notification as read
     */
    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Mark all notifications as read for current user
     */
    async markAllAsRead() {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userData.user.id)
            .eq('is_read', false);

        if (error) throw error;
    },

    /**
     * Delete a notification
     */
    async deleteNotification(id: string) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Fetch user notification settings
     */
    async getSettings() {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;

        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', userData.user.id)
            .maybeSingle();

        if (error) {
            console.error('Error fetching notification settings:', error);
            // Don't throw if it's just a database issue, return defaults
            return {
                user_id: userData.user.id,
                email_enabled: true,
                in_app_enabled: true,
                marketing_enabled: false,
                reminder_frequency: 'daily'
            } as NotificationSettings;
        }

        if (!data) {
            return {
                user_id: userData.user.id,
                email_enabled: true,
                in_app_enabled: true,
                marketing_enabled: false,
                reminder_frequency: 'daily'
            } as NotificationSettings;
        }

        return data as NotificationSettings;
    },

    /**
     * Update user notification settings
     */
    async updateSettings(settings: Partial<NotificationSettings>) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { error } = await supabase
            .from('notification_settings')
            .update(settings)
            .eq('user_id', userData.user.id);

        if (error) throw error;
    },

    /**
     * Subscribe to real-time notifications
     */
    subscribeToNotifications(userId: string, callback: (payload: any) => void) {
        return supabase
            .channel(`public:notifications:user:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => callback(payload)
            )
            .subscribe();
    }
};
