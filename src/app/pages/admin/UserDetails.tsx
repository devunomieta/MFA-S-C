import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, CreditCard, Banknote, History } from "lucide-react";


export function AdminUserDetails() {
    const { id } = useParams<{ id: string }>();
    const [profile, setProfile] = useState<any>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchUserDetails();
    }, [id]);

    async function fetchUserDetails() {
        setLoading(true);
        try {
            // 1. Profile Lookup 
            // Strategy: Check if the string ENDS with a UUID (format: name-slug-uuid)
            // Or if it IS a UUID.
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const match = id?.match(uuidRegex);
            const extractedId = match ? match[0] : null;

            let profileData;

            if (extractedId) {
                // Reliable UUID lookup
                const { data, error } = await supabase.from('profiles').select('*').eq('id', extractedId).single();
                if (error) throw error;
                profileData = data;
            } else {
                // Fallback: Name-based fuzzy lookup (Fragile, but supports legacy/clean links if needed)
                const namePart = id?.replace(/-/g, ' ');
                // ... existing logic ...
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .ilike('full_name', `${namePart}`)
                    .limit(1)
                    .single();

                if (error) {
                    const { data: fuzzyData, error: fuzzyError } = await supabase
                        .from('profiles')
                        .select('*')
                        .ilike('full_name', `%${namePart}%`)
                        .limit(1)
                        .single();
                    if (fuzzyError) throw new Error("User not found by name");
                    profileData = fuzzyData;
                } else {
                    profileData = data;
                }
            }

            setProfile(profileData);
            // Now use the actual found UUID for related queries
            const targetUserId = profileData.id;

            // 2. Plans
            const { data: plansData } = await supabase
                .from('user_plans')
                .select('*, plan:plans(name)')

                .eq('user_id', targetUserId);
            setPlans(plansData || []);

            // 3. Loans
            const { data: loansData } = await supabase
                .from('loans')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false });
            setLoans(loansData || []);

            // 4. Transactions
            const { data: txData } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', targetUserId)
                .order('created_at', { ascending: false });
            setTransactions(txData || []);

            // 5. Bank Accounts
            const { data: bankData } = await supabase
                .from('bank_accounts')
                .select('*')
                .eq('user_id', targetUserId);
            setBankAccounts(bankData || []);

            // 6. Activity Logs
            try {
                const { data: logsData, error: logsError } = await supabase
                    .from('activity_logs')
                    .select('*')
                    .eq('user_id', targetUserId)
                    .order('created_at', { ascending: false });

                if (!logsError) {
                    setActivityLogs(logsData || []);
                }
            } catch (e) {
                console.warn("Could not load activity logs - table might be missing");
            }



        } catch (error: any) {
            toast.error("Failed to fetch user details: " + error.message);
        } finally {
            setLoading(false);
        }
    }



    if (loading) return <div className="p-8 text-center">Loading user details...</div>;
    if (!profile) return <div className="p-8 text-center text-red-500">User not found.</div>;

    const initials = (profile.full_name?.[0] || profile.email?.[0] || 'U').toUpperCase();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/admin/users" className="text-slate-500 hover:text-slate-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">User Details</h1>
            </div>

            {/* Profile Header Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-2xl border-2 border-white shadow-sm">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{profile.full_name || 'No Name'}</h2>
                                <p className="text-slate-500">{profile.email}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant={profile.is_admin ? "default" : "secondary"} className={profile.is_admin ? "bg-purple-600" : ""}>
                                        {profile.is_admin ? "Admin" : "User"}
                                    </Badge>
                                    <Badge variant="outline">Joined: {new Date(profile.created_at).toLocaleDateString()}</Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">

                            {/* <Button variant="destructive" className="gap-2">
                                <Shield className="w-4 h-4" />
                                Ban User
                            </Button> */}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="plans" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
                    <TabsTrigger value="plans">Plans</TabsTrigger>
                    <TabsTrigger value="loans">Loans</TabsTrigger>
                    <TabsTrigger value="transactions">History</TabsTrigger>
                    <TabsTrigger value="transactions">History</TabsTrigger>
                    <TabsTrigger value="banks">Bank Accounts</TabsTrigger>
                    <TabsTrigger value="activity">User Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="plans" className="space-y-4 mt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" /> Subscribed Plans</h3>
                    {plans.length === 0 ? <p className="text-slate-500">No active plans.</p> : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {plans.map(plan => (
                                <Card key={plan.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{plan.plan?.name || 'Unknown Plan'}</CardTitle>
                                        <CardDescription>{plan.status}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="font-medium">Balance: ${Number(plan.current_balance).toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="loans" className="space-y-4 mt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Banknote className="w-5 h-5" /> Loan History</h3>
                    {loans.length === 0 ? <p className="text-slate-500">No loans found.</p> : (
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2">Loan #</th>
                                        <th className="px-4 py-2">Amount</th>
                                        <th className="px-4 py-2">Status</th>
                                        <th className="px-4 py-2">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {loans.map(loan => (
                                        <tr key={loan.id}>
                                            <td className="px-4 py-2 font-mono">{loan.loan_number}</td>
                                            <td className="px-4 py-2">${Number(loan.amount).toLocaleString()}</td>
                                            <td className="px-4 py-2"><Badge variant="outline">{loan.status}</Badge></td>
                                            <td className="px-4 py-2">{new Date(loan.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4 mt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><History className="w-5 h-5" /> Recent Transactions</h3>
                    {transactions.length === 0 ? <p className="text-slate-500">No transactions found.</p> : (
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Amount</th>
                                        <th className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-4 py-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-2 capitalize">{tx.type}</td>
                                            <td className={`px-4 py-2 font-medium ${tx.type === 'withdrawal' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {tx.type === 'withdrawal' ? '-' : '+'}${Number(tx.amount).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-2"><Badge variant="outline">{tx.status}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="banks" className="space-y-4 mt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><Banknote className="w-5 h-5" /> Linked Bank Accounts</h3>
                    {bankAccounts.length === 0 ? <p className="text-slate-500">No bank accounts linked.</p> : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {bankAccounts.map(acc => (
                                <Card key={acc.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{acc.bank_name}</CardTitle>
                                        <CardDescription>{acc.account_number}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium text-sm">{acc.account_name}</p>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={async () => {
                                                    if (!confirm("Are you sure you want to remove this bank account? This cannot be undone.")) return;
                                                    const { error } = await supabase.from('bank_accounts').delete().eq('id', acc.id);
                                                    if (error) toast.error("Failed to delete");
                                                    else {
                                                        toast.success("Bank account removed");
                                                        setBankAccounts(prev => prev.filter(p => p.id !== acc.id));
                                                    }
                                                }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>


                <TabsContent value="activity" className="space-y-4 mt-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" /> Activity Log</h3>
                    {activityLogs.length === 0 ? <p className="text-slate-500">No activity recorded.</p> : (
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Action</th>
                                        <th className="px-4 py-2">Details</th>
                                        <th className="px-4 py-2">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {activityLogs.map(log => (
                                        <tr key={log.id}>
                                            <td className="px-4 py-2 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                                            <td className="px-4 py-2 font-medium"><Badge variant="outline">{log.action}</Badge></td>
                                            <td className="px-4 py-2 font-mono text-xs text-slate-600 max-w-[200px] truncate" title={JSON.stringify(log.details)}>
                                                {JSON.stringify(log.details).substring(0, 50)}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-slate-400">{log.ip_address || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div >
    );
}
