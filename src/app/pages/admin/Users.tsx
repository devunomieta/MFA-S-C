import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { Search, Trash2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";

export function AdminUsers() {
    const { isAdmin, isSuperadmin } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch users");
            console.error(error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }

    const filteredUsers = users.filter(user =>
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">View registered users.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Users</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search users..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Joined</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No users found.</td></tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                            onClick={() => {
                                                const slug = user.full_name
                                                    ? user.full_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                                                    : 'user';
                                                window.location.href = `/admin/users/${slug}-${user.id}`;
                                            }}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                        {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900 group-hover:text-emerald-600 transition-colors">{user.full_name || 'No Name'}</div>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 items-center">
                                                    {user.is_superadmin && (
                                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Superadmin</Badge>
                                                    )}
                                                    {user.is_admin && !user.is_superadmin && (
                                                        <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                                                    )}
                                                    {!user.is_admin && (
                                                        <Badge variant="outline" className="text-slate-600">User</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Active</Badge>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <AdminWipePanel />
        </div>
    );
}

function AdminWipePanel() {
    const { isSuperadmin } = useAuth();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [wiping, setWiping] = useState(false);
    const [scope, setScope] = useState<'non-admin' | 'all-except-super'>('non-admin');
    const [dataOnly, setDataOnly] = useState(true);
    const [confirmText, setConfirmText] = useState("");

    const handleWipe = async () => {
        const expectedText = `PERMANENTLY DELETE ${scope === 'non-admin' ? 'NON-ADMINS' : 'ALL EXCEPT SUPER'}`;
        if (confirmText !== expectedText) {
            return toast.error(`Please type "${expectedText}" exactly.`);
        }

        setWiping(true);
        try {
            console.log("Invoking Edge Function with raw fetch: system-purge-handler");
            
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session found. Please log in again.");

            const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-purge-handler`;
            console.log("Fetching URL:", functionUrl);

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ scope, dataOnly })
            });

            const result = await response.json();
            console.log("Fetch Result:", result);

            if (!response.ok) {
                const errorMsg = result.error || result.message || `Server returned ${response.status}`;
                throw new Error(errorMsg);
            }
            
            toast.success(`Wipe successful: ${result.count} users cleared.`);
            setIsConfirmOpen(false);
            window.location.reload();
        } catch (error: any) {
            console.error("Full Catch Error:", error);
            
            let errorMessage = "Wipe failed: " + (error.message || "Unknown error");
            
            if (error?.message?.includes("Failed to send a request") || error?.message?.includes("Failed to fetch")) {
                errorMessage = "Network Error: Could not reach the Edge Function. This usually means an adblocker or a network proxy is blocking the request to Supabase.";
            }

            toast.error(errorMessage);
        } finally {
            setWiping(false);
        }
    };

    return (
        <Card className="border-red-200 bg-red-50/30">
            <CardHeader>
                <div className="flex items-center gap-2 text-red-600">
                    <ShieldAlert className="w-5 h-5" />
                    <CardTitle className="text-lg">Danger Zone: Advanced Data Wipe</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-slate-700">Wipe Scope</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 p-3 border rounded bg-white cursor-pointer hover:border-red-300">
                                <input type="radio" checked={scope === 'non-admin'} onChange={() => setScope('non-admin')} />
                                <div>
                                    <div className="text-sm font-medium">Non-Admin Users</div>
                                    <div className="text-xs text-slate-500">Only removes users without admin privileges.</div>
                                </div>
                            </label>
                            <label className={`flex items-center gap-2 p-3 border rounded bg-white cursor-pointer hover:border-red-300 ${!isSuperadmin ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                <input type="radio" checked={scope === 'all-except-super'} onChange={() => setScope('all-except-super')} disabled={!isSuperadmin} />
                                <div>
                                    <div className="text-sm font-medium">All except Superadmin</div>
                                    <div className="text-xs text-slate-500 text-red-600">Removes everyone, including other Admins.</div>
                                    {!isSuperadmin && <div className="text-[10px] text-amber-600">Requires Superadmin status.</div>}
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-semibold text-slate-700">Deletion Depth</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 p-3 border rounded bg-white cursor-pointer hover:border-red-300">
                                <input type="radio" checked={dataOnly} onChange={() => setDataOnly(true)} />
                                <div>
                                    <div className="text-sm font-medium">Data & Profiles Only</div>
                                    <div className="text-xs text-slate-500">Auth credentials remain. Users can still log in but see a fresh account.</div>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 p-3 border rounded bg-white cursor-pointer hover:border-red-300">
                                <input type="radio" checked={!dataOnly} onChange={() => setDataOnly(false)} />
                                <div>
                                    <div className="text-sm font-medium text-red-600 font-bold">Complete Auth Removal</div>
                                    <div className="text-xs text-slate-500">Wipes everything, including the ability to log in. Users must register again.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-red-100">
                    <Button
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
                            setConfirmText("");
                            setIsConfirmOpen(true);
                        }}
                    >
                        <Trash2 className="w-4 h-4" />
                        Execute Selected Wipe
                    </Button>
                </div>
            </CardContent>

            <ActionConfirmModal
                isOpen={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={handleWipe}
                isLoading={wiping}
                title="CRITICAL: Confirm System Wipe"
                description={`You are about to perform a ${dataOnly ? 'DATA ONLY' : 'COMPLETE AUTH'} wipe for ${scope === 'non-admin' ? 'NON-ADMIN USERS' : 'ALL USERS EXCEPT SUPERADMIN'}.

This action is permanent. To proceed, please type the following exactly:
"PERMANENTLY DELETE ${scope === 'non-admin' ? 'NON-ADMINS' : 'ALL EXCEPT SUPER'}"`}
                confirmText="EXECUTE WIPE"
                variant="destructive"
            >
                <Input
                    placeholder="Type confirmation here..."
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    className="border-red-300 focus-visible:ring-red-400"
                />
            </ActionConfirmModal>
        </Card>
    );
}
