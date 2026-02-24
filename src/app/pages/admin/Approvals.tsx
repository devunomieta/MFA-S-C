import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Eye, ShieldCheck, Banknote, Mail, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";

export function AdminApprovals() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [kycRequests, setKycRequests] = useState<any[]>([]);
    const [bankRequests, setBankRequests] = useState<any[]>([]);
    const [emailRequests, setEmailRequests] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    async function fetchData() {
        setLoading(true);
        await Promise.all([fetchKycRequests(), fetchBankRequests(), fetchEmailRequests()]);
        setLoading(false);
    }

    async function fetchKycRequests() {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, gov_id_status, gov_id_url')
            .eq('gov_id_status', 'pending');

        if (error) console.error("Error fetching KYC:", error);
        else setKycRequests(data || []);
    }

    async function fetchBankRequests() {
        // Needs a join to get user details
        const { data, error } = await supabase
            .from('bank_account_requests')
            .select('*, profile:profiles(full_name, email)')
            .eq('status', 'pending');

        if (error) console.error("Error fetching Bank Requests:", error);
        else setBankRequests(data || []);
    }

    async function fetchEmailRequests() {
        const { data, error } = await supabase
            .from('email_change_requests')
            .select('*, profile:profiles(full_name, email, gov_id_url)')
            .eq('status', 'pending');

        if (error) console.error("Error fetching Email Requests:", error);
        else setEmailRequests(data || []);
    }

    // --- KYC ACTIONS ---
    async function handleKycAction(userId: string, action: 'verified' | 'rejected') {
        const { error } = await supabase
            .from('profiles')
            .update({ gov_id_status: action })
            .eq('id', userId);

        if (error) {
            toast.error("Failed to update KYC status");
        } else {
            toast.success(`KYC ${action === 'verified' ? 'Approved' : 'Rejected'}`);
            fetchKycRequests();
        }
    }

    // --- BANK ACTIONS ---
    async function handleBankAction(request: any, action: 'approved' | 'rejected') {
        try {
            if (action === 'approved') {
                // 1. Insert into bank_accounts
                const { error: insertError } = await supabase
                    .from('bank_accounts')
                    .insert({
                        user_id: request.user_id,
                        bank_name: request.bank_name,
                        account_number: request.account_number,
                        account_name: request.account_name
                    });

                if (insertError) throw insertError;
            }

            // 2. Update request status
            const { error: updateError } = await supabase
                .from('bank_account_requests')
                .update({ status: action })
                .eq('id', request.id);

            if (updateError) throw updateError;

            toast.success(`Bank Request ${action === 'approved' ? 'Approved' : 'Rejected'}`);
            fetchBankRequests();

        } catch (error: any) {
            console.error(error);
            toast.error(`Failed to process request: ${error.message}`);
        }
    }

    // --- EMAIL ACTIONS ---
    async function handleEmailAction(request: any, action: 'approved' | 'rejected') {
        const { error } = await supabase
            .from('email_change_requests')
            .update({
                status: action,
                admin_notes: action === 'approved' ? 'Identity verified via live capture.' : 'Identity verification failed.'
            })
            .eq('id', request.id);

        if (error) {
            toast.error("Failed to update request status");
        } else {
            toast.success(`Request ${action === 'approved' ? 'Approved' : 'Rejected'}. ${action === 'approved' ? 'Please manually update the email in Supabase Auth Dashboard.' : ''}`);
            fetchEmailRequests();

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: `ADMIN_EMAIL_CHANGE_${action.toUpperCase()}`,
                details: { target_user_id: request.user_id, new_email: request.new_email }
            });
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading pending approvals...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
                <p className="text-slate-500">Review KYC submissions and bank account requests.</p>
            </div>

            <Tabs defaultValue="kyc" className="w-full">
                <TabsList className="bg-white border">
                    <TabsTrigger value="kyc" className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        KYC Verifications
                        {kycRequests.length > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                {kycRequests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        Bank Requests
                        {bankRequests.length > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                {bankRequests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Updates
                        {emailRequests.length > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                {emailRequests.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* KYC CONTENT */}
                <TabsContent value="kyc" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {kycRequests.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No pending KYC verifications.</p>
                            </div>
                        ) : (
                            kycRequests.map((req) => (
                                <Card key={req.id} className="overflow-hidden">
                                    <CardHeader className="bg-gray-50 pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base font-semibold">{req.full_name}</CardTitle>
                                                <CardDescription className="text-xs">{req.email}</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-4">
                                        <div className="aspect-video bg-gray-100 rounded-md overflow-hidden relative group">
                                            {req.gov_id_url ? (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <div className="cursor-pointer w-full h-full relative">
                                                            <img
                                                                src={req.gov_id_url}
                                                                alt="ID"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Eye className="text-white w-8 h-8" />
                                                            </div>
                                                        </div>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-3xl">
                                                        <DialogHeader>
                                                            <DialogTitle>{req.full_name}'s ID Document</DialogTitle>
                                                        </DialogHeader>
                                                        <img src={req.gov_id_url} alt="Full ID" className="w-full h-auto rounded" />
                                                    </DialogContent>
                                                </Dialog>
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No Image Uploaded</div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleKycAction(req.id, 'rejected')}
                                            >
                                                <X className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                            <Button
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                onClick={() => handleKycAction(req.id, 'verified')}
                                            >
                                                <Check className="w-4 h-4 mr-2" /> Approve
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* BANK CONTENT */}
                <TabsContent value="bank" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bank Change Requests</CardTitle>
                            <CardDescription>Requests from users with name change history.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Requested Bank Details</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {bankRequests.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">No pending bank requests.</td></tr>
                                        ) : (
                                            bankRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50">
                                                    <td className="p-4">
                                                        <div className="font-medium text-gray-900">{req.profile?.full_name || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500">{req.profile?.email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-gray-900">{req.bank_name}</div>
                                                        <div className="text-gray-500">{req.account_number}</div>
                                                        <div className="text-xs text-gray-400 capitalize">{req.account_name}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                                            onClick={() => handleBankAction(req, 'rejected')}
                                                        >
                                                            Reject
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700"
                                                            onClick={() => handleBankAction(req, 'approved')}
                                                        >
                                                            Approve
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EMAIL CONTENT */}
                <TabsContent value="email" className="mt-6">
                    <div className="grid gap-6">
                        {emailRequests.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No pending email change requests.</p>
                            </div>
                        ) : (
                            emailRequests.map((req) => (
                                <Card key={req.id}>
                                    <CardHeader className="bg-gray-50 pb-3 border-b">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base font-semibold">{req.profile?.full_name}</CardTitle>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className="text-[10px] py-0">{req.profile?.email}</Badge>
                                                    <span className="text-gray-400">&rarr;</span>
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0">{req.new_email}</Badge>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Review Required</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="grid md:grid-cols-2 gap-8">
                                            {/* ID PHOTO */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-gray-400 tracking-wider">KYC ID Document</Label>
                                                <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border">
                                                    <img src={req.profile?.gov_id_url} alt="KYC ID" className="w-full h-full object-cover" />
                                                </div>
                                            </div>

                                            {/* LIVE CAPTURE PHOTO */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-emerald-600 tracking-wider">Live Recovery Capture</Label>
                                                <div className="aspect-[4/3] bg-emerald-50 rounded-lg overflow-hidden border-2 border-emerald-200">
                                                    <img src={req.live_photo_url} alt="Live Capture" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                            <div className="text-sm text-gray-600 italic">
                                                Compare the facial features in the KYC document vs the live capture.
                                            </div>
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleEmailAction(req, 'rejected')}
                                                >
                                                    <X className="w-4 h-4 mr-2" /> Reject Request
                                                </Button>
                                                <Button
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    onClick={() => handleEmailAction(req, 'approved')}
                                                >
                                                    <Check className="w-4 h-4 mr-2" /> Verify & Approve
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <a
                                                href="https://supabase.com/dashboard/project/_/auth/users"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Go to Supabase Auth to finalize update
                                            </a>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
