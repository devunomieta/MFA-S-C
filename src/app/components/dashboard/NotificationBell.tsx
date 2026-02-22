import { useState, useEffect } from 'react';
import { Bell, Inbox, ChevronRight } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/app/components/ui/popover";
import { Button } from "@/app/components/ui/button";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Badge } from "@/app/components/ui/badge";
import { notificationService, MTFNotification } from "@/lib/notification";
import { useAuth } from "@/app/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<MTFNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        const subscription = notificationService.subscribeToNotifications(user.id, (payload) => {
            if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new as MTFNotification, ...prev].slice(0, 50));
            }
            // Always refetch unread count to stay in sync
            notificationService.getUnreadCount().then(c => setUnreadCount(c || 0));

            // If it's an update or delete, we need to refresh the list to reflect accurate state
            if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                fetchNotifications();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const [notifsData, count] = await Promise.all([
                notificationService.getNotifications({ limit: 10 }),
                notificationService.getUnreadCount()
            ]);
            setNotifications(notifsData.notifications || []);
            setUnreadCount(count || 0);
        } catch (error) {
            console.error('Error fetching notifications in bell:', error);
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="relative p-2 text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0 mr-4 rounded-2xl overflow-hidden shadow-2xl border-gray-100 dark:border-gray-800" align="end">
                <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Inbox className="size-4 text-emerald-600" />
                        Notifications
                    </h3>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAllAsRead}
                                className="h-8 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2"
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>
                </div>
                <ScrollArea className="h-[400px]">
                    {notifications.length > 0 ? (
                        <div className="flex flex-col">
                            {notifications.slice(0, 10).map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                                    className={`relative flex flex-col gap-1 p-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b last:border-0 dark:border-gray-800 group ${!n.is_read ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}
                                >
                                    {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                                    <div className="flex justify-between items-start gap-2">
                                        <p className={`text-[13px] font-bold leading-tight ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-550 dark:text-gray-400'}`}>
                                            {n.title}
                                        </p>
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 rounded uppercase">
                                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed font-medium">
                                        {n.message}
                                    </p>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest bg-white dark:bg-gray-900 h-4 border-gray-100 dark:border-gray-800">
                                            {n.type}
                                        </Badge>
                                        <ChevronRight className="size-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
                            <div className="h-16 w-16 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4 border-2 border-dashed border-gray-200 dark:border-gray-800">
                                <Inbox className="size-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <p className="text-base font-bold text-gray-900 dark:text-white">Inbox Zero!</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">You're all caught up with your alerts.</p>
                        </div>
                    )}
                </ScrollArea>
                <div className="p-3 border-t dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <Button asChild variant="default" className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl" onClick={() => setIsOpen(false)}>
                        <Link to="/dashboard/notifications">Open Dashboard</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
