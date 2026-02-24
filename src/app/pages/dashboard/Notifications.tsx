import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Trash2,
    CheckCircle2,
    Settings,
    Clock,
    Search,
    Inbox,
    Loader2,
    Mail,
    Smartphone,
    ShieldAlert
} from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { notificationService, MTFNotification, NotificationSettings } from "@/lib/notification";
import { useNotifications } from "@/app/context/NotificationContext";
import { useAuth } from "@/app/context/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export function Notifications() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { refreshUnreadCount, lastEvent } = useNotifications();
    const [notifications, setNotifications] = useState<MTFNotification[]>([]);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        if (!user) return;
        fetchInitialData();
    }, [user, filter, searchQuery, dateRange, page]);

    useEffect(() => {
        if (!lastEvent) return;

        if (lastEvent.eventType === 'INSERT') {
            // If on first page and no filters, prepend. Otherwise refetch.
            if (page === 1 && !searchQuery && filter === 'all') {
                // Deduplicate to prevent double triggers
                setNotifications(prev => {
                    const exists = prev.some(n => n.id === lastEvent.new.id);
                    if (exists) return prev;
                    return [lastEvent.new as MTFNotification, ...prev].slice(0, 25);
                });
            } else {
                fetchInitialData();
            }
        } else if (lastEvent.eventType === 'UPDATE' || lastEvent.eventType === 'DELETE') {
            fetchInitialData();
        }
    }, [lastEvent]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [notifsData, sets] = await Promise.all([
                notificationService.getNotifications({
                    page: 1,
                    limit: 25,
                    type: filter,
                    search: searchQuery,
                    startDate: dateRange.start || undefined,
                    endDate: dateRange.end || undefined
                }),
                notificationService.getSettings()
            ]);
            setNotifications(notifsData.notifications);
            setHasMore(notifsData.hasMore);
            setSettings(sets);
            setPage(1);
        } catch (error: any) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        try {
            setLoadingMore(true);
            const nextPage = page + 1;
            const data = await notificationService.getNotifications({
                page: nextPage,
                limit: 25,
                type: filter,
                search: searchQuery,
                startDate: dateRange.start || undefined,
                endDate: dateRange.end || undefined
            });
            setNotifications(prev => [...prev, ...data.notifications]);
            setHasMore(data.hasMore);
            setPage(nextPage);
        } catch (error) {
            toast.error('Failed to load more notifications');
        } finally {
            setLoadingMore(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            await refreshUnreadCount();
            toast.success('Marked as read');
        } catch (error) {
            toast.error('Failed to update notification');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await notificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            await refreshUnreadCount();
            toast.success('Notification deleted');
        } catch (error) {
            toast.error('Failed to delete notification');
        }
    };

    const handleNotificationClick = async (notif: MTFNotification) => {
        if (!notif.is_read) {
            await handleMarkAsRead(notif.id);
        }

        switch (notif.type) {
            case 'plan':
                if (notif.data?.plan_id) {
                    navigate(`/dashboard/plans?view=${notif.data.plan_id}`);
                } else {
                    navigate('/dashboard/plans');
                }
                break;
            case 'transaction':
                navigate('/dashboard/wallet');
                break;
            case 'loan':
                if (notif.data?.loan_id) {
                    navigate(`/dashboard/loans?id=${notif.data.loan_id}`);
                } else {
                    navigate('/dashboard/loans');
                }
                break;
            case 'profile':
                navigate('/dashboard/profile');
                break;
            case 'help':
                navigate('/dashboard/help');
                break;
            default:
                break;
        }
    };

    const handleUpdateSettings = async (key: keyof NotificationSettings, value: any) => {
        if (!settings) return;
        try {
            const newSettings = { ...settings, [key]: value };
            setSettings(newSettings);
            await notificationService.updateSettings({ [key]: value });
            toast.success('Settings updated');
        } catch (error) {
            toast.error('Failed to update settings');
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setDateRange({ start: null, end: null });
        setFilter('all');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                        Notifications
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-lg leading-tight">
                        You have {notifications.filter(n => !n.is_read).length} unread alerts
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                            placeholder="Search alerts..."
                            className="pl-10 h-11 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-xl focus:border-emerald-500 focus:ring-0 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="h-11 font-bold border-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 dark:border-gray-800 text-emerald-600"
                        onClick={async () => {
                            await notificationService.markAllAsRead();
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                            await refreshUnreadCount();
                            toast.success('All marked as read');
                        }}
                    >
                        Mark all as read
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
                    <TabsTrigger value="all" className="rounded-lg px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-600">
                        All
                    </TabsTrigger>
                    <TabsTrigger value="unread" className="rounded-lg px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-600">
                        Unread
                        {notifications.some(n => !n.is_read) && (
                            <Badge className="ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                {notifications.filter(n => !n.is_read).length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="rounded-lg px-8 font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-emerald-600">
                        <Settings className="size-4 mr-2" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className="rounded-full font-bold h-9 bg-emerald-600">All</Button>
                            <Button variant={filter === 'transaction' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('transaction')} className="rounded-full font-bold h-9">Transactions</Button>
                            <Button variant={filter === 'loan' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('loan')} className="rounded-full font-bold h-9">Loans</Button>
                            <Button variant={filter === 'plan' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('plan')} className="rounded-full font-bold h-9">Plans</Button>
                            <Button variant={filter === 'help' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('help')} className="rounded-full font-bold h-9">Help</Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {(searchQuery || dateRange.start || filter !== 'all') && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-3 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full text-xs">
                                    Clear all
                                </Button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100 dark:bg-gray-800/50" />)}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <NotificationList
                                notifications={notifications}
                                onMarkRead={handleMarkAsRead}
                                onDelete={handleDelete}
                                onNotificationClick={handleNotificationClick}
                            />

                            {hasMore && (
                                <div className="flex justify-center pt-4">
                                    <Button
                                        variant="outline"
                                        className="rounded-xl font-bold border-2 border-gray-200 dark:border-gray-800 h-11 px-8 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-emerald-600 transition-all"
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="size-4 mr-2 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            'View more activities'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="settings">
                    <Card className="border-2 dark:border-gray-800 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                            <CardTitle className="text-xl font-black">Notification Preferences</CardTitle>
                            <CardDescription className="text-gray-500 font-medium font-medium">Control how and when you receive updates.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid gap-6">
                                <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800/30 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Mail className="size-5 text-emerald-600" />
                                            <Label className="text-lg font-bold">Email Notifications</Label>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">Receive transaction receipts and account alerts via email.</p>
                                    </div>
                                    <Switch
                                        checked={settings?.email_enabled}
                                        onCheckedChange={(val) => handleUpdateSettings('email_enabled', val)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800/30 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Smartphone className="size-5 text-emerald-600" />
                                            <Label className="text-lg font-bold">In-App Notifications</Label>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">Get instant alerts while browsing the MTF dashboard.</p>
                                    </div>
                                    <Switch
                                        checked={settings?.in_app_enabled}
                                        onCheckedChange={(val) => handleUpdateSettings('in_app_enabled', val)}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-6 bg-white dark:bg-gray-800/30 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-emerald-500/20 transition-all">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="size-5 text-emerald-600" />
                                            <Label className="text-lg font-bold">Marketing & Offers</Label>
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium">Stay updated with new saving plans and exclusive promos.</p>
                                    </div>
                                    <Switch
                                        checked={settings?.marketing_enabled}
                                        onCheckedChange={(val) => handleUpdateSettings('marketing_enabled', val)}
                                    />
                                </div>
                            </div>

                            <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/20">
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-300 mb-2">Reminder Frequency</h4>
                                <div className="flex gap-4">
                                    {['daily', 'weekly', 'monthly'].map((freq) => (
                                        <Button
                                            key={freq}
                                            variant={settings?.reminder_frequency === freq ? 'default' : 'outline'}
                                            size="sm"
                                            className="font-bold capitalize rounded-xl"
                                            onClick={() => handleUpdateSettings('reminder_frequency', freq as any)}
                                        >
                                            {freq}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function NotificationList({ notifications, onMarkRead, onDelete, onNotificationClick }: {
    notifications: MTFNotification[],
    onMarkRead: (id: string) => void,
    onDelete: (id: string) => void,
    onNotificationClick: (notif: MTFNotification) => void
}) {
    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-800/30 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                <div className="h-20 w-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                    <Inbox className="size-10 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Clean Slate!</h3>
                <p className="text-gray-500 font-medium text-center max-w-xs">No notifications match your active search or filters.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`group relative flex flex-col md:flex-row md:items-center gap-4 p-5 md:p-6 transition-all border-2 rounded-[1.5rem] cursor-pointer hover:border-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/5 ${!n.is_read ? 'bg-white dark:bg-gray-800/50 border-emerald-500/20 ring-1 ring-emerald-500/10' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-80 hover:opacity-100'}`}
                    onClick={() => onNotificationClick(n)}
                >
                    {!n.is_read && <div className="absolute left-0 top-6 bottom-6 w-1.5 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-3">
                                <h3 className={`text-lg font-bold leading-none ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {n.title}
                                </h3>
                                {!n.is_read && <Badge className="h-5 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[9px] font-black uppercase">Unread</Badge>}
                            </div>
                        </div>
                        <p className={`text-[15px] font-medium leading-relaxed mb-4 ${!n.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>
                            {n.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                <Clock className="size-3" />
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </div>
                            <div className="h-1 w-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                            <div className={`px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${n.type === 'plan' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' :
                                n.type === 'loan' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20' :
                                    n.type === 'transaction' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20' :
                                        'bg-gray-100 text-gray-600 dark:bg-gray-800'
                                }`}>
                                {n.type}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:pl-4 md:border-l dark:border-gray-800">
                        {!n.is_read && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onMarkRead(n.id);
                                }}
                                title="Mark as read"
                            >
                                <CheckCircle2 className="size-6" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDelete(n.id);
                            }}
                            title="Delete"
                        >
                            <Trash2 className="size-6" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
