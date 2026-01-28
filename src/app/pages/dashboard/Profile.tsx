import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { toast } from "sonner";
import { Trash2, Plus, Banknote, History, AlertTriangle, Edit2, X, Check, ShieldCheck, Upload, FileCheck, Info, Eye } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/app/components/ui/dialog";

export function Profile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    // Profile State
    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        avatar_url: "",
        gov_id_status: "not_uploaded",
        gov_id_url: ""
    });
    // Keep track of original name to detect changes
    const [originalName, setOriginalName] = useState("");

    // Bank Accounts State
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [newBank, setNewBank] = useState({
        bank_name: "",
        account_number: "",
        account_name: ""
    });
    const [addingBank, setAddingBank] = useState(false);

    // Edit Bank State
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [editBankData, setEditBankData] = useState({
        bank_name: "",
        account_number: "",
        account_name: ""
    });

    // Security / History State
    const [nameHistory, setNameHistory] = useState<any[]>([]);
    const [bankRequests, setBankRequests] = useState<any[]>([]);

    // KYC Upload State
    const [uploadingId, setUploadingId] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            fetchProfile();
            fetchBankAccounts();
            fetchNameHistory();
            fetchBankRequests();
        }
    }, [user]);

    async function fetchProfile() {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user?.id)
            .single();

        if (data) {
            setProfile({
                full_name: data.full_name || "",
                email: data.email || user?.email || "",
                avatar_url: data.avatar_url || "",
                gov_id_status: data.gov_id_status || "not_uploaded",
                gov_id_url: data.gov_id_url || "" // Ensure this is not undefined
            });
            setOriginalName(data.full_name || "");

            // Debug Log
            console.log("Profile Fetched:", { status: data.gov_id_status, url: data.gov_id_url });
        } else {
            const metaName = user?.user_metadata?.full_name || "";
            setProfile({
                full_name: metaName,
                email: user?.email || "",
                avatar_url: "",
                gov_id_status: "not_uploaded",
                gov_id_url: ""
            });
            setOriginalName(metaName);
        }
    }

    async function fetchNameHistory() {
        const { data } = await supabase
            .from("name_history")
            .select("*")
            .eq("user_id", user?.id)
            .order("changed_at", { ascending: false });
        if (data) setNameHistory(data);
    }

    async function fetchBankRequests() {
        const { data } = await supabase
            .from("bank_account_requests")
            .select("*")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false });
        if (data) setBankRequests(data);
    }

    async function fetchBankAccounts() {
        const { data } = await supabase
            .from("bank_accounts")
            .select("*")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false });

        if (data) setBankAccounts(data);
    }

    const validateBankDetails = (data: typeof newBank) => {
        if (!data.bank_name || !data.account_number || !data.account_name) {
            toast.error("Please fill in all bank details");
            return false;
        }

        // 1. Validation: Digits only
        if (!/^\d+$/.test(data.account_number)) {
            toast.error("Account Number must contain numbers only");
            return false;
        }

        // 2. Validation: Account Name Match
        if (data.account_name.trim().toLowerCase() !== profile.full_name.trim().toLowerCase()) {
            toast.error(`Account Name must be "${profile.full_name}" exactly.`);
            return false;
        }
        return true;
    };

    async function handleAddBank() {
        if (!validateBankDetails(newBank)) return;

        setAddingBank(true);

        // 3. Restriction: If Name History exists, force Request
        if (nameHistory.length > 0) {
            const { error } = await supabase.from("bank_account_requests").insert({
                user_id: user?.id,
                bank_name: newBank.bank_name,
                account_number: newBank.account_number,
                account_name: newBank.account_name,
                status: 'pending'
            });

            if (error) {
                toast.error("Failed to submit request");
                console.error(error);
            } else {
                toast.success("Bank account request submitted for approval");
                setNewBank({ bank_name: "", account_number: "", account_name: "" });
                fetchBankRequests();
            }
        } else {
            // Normal Add
            const { error } = await supabase.from("bank_accounts").insert({
                user_id: user?.id,
                bank_name: newBank.bank_name,
                account_number: newBank.account_number,
                account_name: newBank.account_name
            });

            if (error) {
                toast.error("Failed to add bank account");
                console.error(error);
            } else {
                toast.success("Bank account added successfully");
                setNewBank({ bank_name: "", account_number: "", account_name: "" });
                fetchBankAccounts();

                // Log Activity
                supabase.from('activity_logs').insert({
                    user_id: user?.id,
                    action: 'BANK_ADD',
                    details: { bank_name: newBank.bank_name, account_number: '***' + newBank.account_number.slice(-4) }
                });
            }
        }
        setAddingBank(false);
    }

    const startEditing = (account: any) => {
        if (nameHistory.length > 0) {
            toast.error("Editing blocked due to name change history. Please contact support or request a new account.");
            return;
        }
        setEditingBankId(account.id);
        setEditBankData({
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_name: account.account_name
        });
    };

    const cancelEditing = () => {
        setEditingBankId(null);
        setEditBankData({ bank_name: "", account_number: "", account_name: "" });
    };

    async function saveEditedBank() {
        if (!editingBankId) return;
        if (!validateBankDetails(editBankData)) return;

        // Double check restriction before saving
        if (nameHistory.length > 0) {
            toast.error("Action not allowed.");
            cancelEditing();
            return;
        }

        const { error } = await supabase
            .from("bank_accounts")
            .update({
                bank_name: editBankData.bank_name,
                account_number: editBankData.account_number,
                account_name: editBankData.account_name
            })
            .eq("id", editingBankId);

        if (error) {
            toast.error("Failed to update bank account");
        } else {
            toast.success("Bank account updated");
            fetchBankAccounts();
            cancelEditing();

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: 'BANK_UPDATE',
                details: { bank_name: editBankData.bank_name }
            });
        }
    }

    async function deleteBankAccount(id: string) {
        if (!confirm("Are you sure you want to remove this account?")) return;

        const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
        if (error) {
            toast.error("Failed to remove bank account");
        } else {
            toast.success("Bank account removed");
            setBankAccounts(bankAccounts.filter(acc => acc.id !== id));

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: 'BANK_DELETE',
                details: { id }
            });
        }
    }

    async function updateProfile() {
        if (!profile.full_name.trim()) {
            toast.error("Full Name cannot be empty");
            return;
        }

        setLoading(true);
        let nameChanged = false;

        // Check if name changed
        if (profile.full_name.trim() !== originalName.trim()) {
            nameChanged = true;
            // Record History
            const { error: histError } = await supabase.from("name_history").insert({
                user_id: user?.id,
                old_name: originalName,
                new_name: profile.full_name
            });
            if (histError) console.error("Failed to log name history", histError);
        }

        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: profile.full_name,
            })
            .eq("id", user?.id);

        if (error) {
            toast.error("Failed to update profile");
        } else {
            toast.success("Profile updated successfully");
            await supabase.auth.updateUser({
                data: { full_name: profile.full_name }
            });
            setOriginalName(profile.full_name);
            if (nameChanged) {
                fetchNameHistory();
                supabase.from('activity_logs').insert({
                    user_id: user?.id,
                    action: 'NAME_CHANGE',
                    details: { old: originalName, new: profile.full_name }
                });
            } else {
                supabase.from('activity_logs').insert({
                    user_id: user?.id,
                    action: 'PROFILE_UPDATE',
                    details: { changes: 'details_update' }
                });
            }
        }
        setLoading(false);
    }

    // Handle File Selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    async function handleUploadId() {
        if (!previewUrl) {
            fileInputRef.current?.click();
            return;
        }

        setUploadingId(true);
        // Mock ID Upload and processing
        setTimeout(async () => {
            // In a real app, we would upload the file to storage here
            // const { data, error } = await supabase.storage.from('kyc').upload(...)

            // For now, we simulate success and save a "mock" URL if no real one, 
            // but we'll try to use the preview one for session persistence if possible, 
            // or just use a placeholder that implies success.
            const mockUrl = 'https://ui.shadcn.com/placeholder.svg'; // Placeholder for demo

            const { error: updateError } = await supabase.from("profiles").update({
                gov_id_status: 'pending', // Set to Pending instead of Verified
                gov_id_url: mockUrl
            }).eq("id", user?.id);

            if (updateError) {
                console.error("KYC Upload Error:", updateError);
                toast.error("Failed to submit ID. Please try again.");
                setUploadingId(false);
                return;
            }

            toast.success("ID Uploaded! Verification pending.");
            setUploadingId(false);
            setPreviewUrl(null); // Clear preview to show "saved" state

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: 'KYC_UPLOAD',
                details: { status: 'pending' }
            });

            // Force fetch to ensure state is updated
            await fetchProfile();
        }, 1500);
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your profile and preferences.</p>
            </div>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">Profile Information</CardTitle>
                    <CardDescription className="dark:text-gray-400">Update your personal details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                {(profile.full_name?.[0] || 'U').toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <Button variant="outline" className="dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800">Change Avatar</Button>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name" className="dark:text-gray-300">Full Name</Label>
                        <Input
                            id="name"
                            value={profile.full_name}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        />
                        {nameHistory.length > 0 && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-500 flex items-center mt-1">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Name changed. New bank accounts will require approval.
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email" className="dark:text-gray-300">Email Address</Label>
                        <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
                        />
                    </div>

                    {/* NAME HISTORY SECTION */}
                    {nameHistory.length > 0 && (
                        <div className="rounded-md border bg-gray-50 p-4 dark:bg-gray-900/50 dark:border-gray-700">
                            <h4 className="flex items-center text-sm font-semibold mb-3 dark:text-gray-300">
                                <History className="w-4 h-4 mr-2" /> Name Change History
                            </h4>
                            <div className="space-y-2">
                                {nameHistory.map(record => (
                                    <div key={record.id} className="text-xs grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 border-b pb-2 last:border-0 last:pb-0 dark:border-gray-700">
                                        <div>
                                            <span className="block text-gray-400 dark:text-gray-500">From</span>
                                            <span className="font-medium">{record.old_name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-gray-400 dark:text-gray-500">To</span>
                                            <span className="font-medium">{record.new_name}</span>
                                            <div className="text-[10px] opacity-70 mt-1">{new Date(record.changed_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={updateProfile} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 dark:text-white">
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </CardFooter>
            </Card>

            {/* KYC SECTION */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="dark:text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                KYC Verification
                            </CardTitle>
                            <CardDescription className="dark:text-gray-400">
                                Identify verification for enhanced features.
                            </CardDescription>
                        </div>
                        <Badge variant={
                            profile.gov_id_status === 'verified' ? 'default' :
                                profile.gov_id_status === 'pending' ? 'secondary' : 'outline'
                        } className={
                            profile.gov_id_status === 'verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                profile.gov_id_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
                        }>
                            {profile.gov_id_status === 'not_uploaded' ? 'Not Uploaded' : profile.gov_id_status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {profile.gov_id_status !== 'not_uploaded' ? (
                        <div className="space-y-4">
                            <div className={`border rounded-lg p-4 flex items-center gap-3 ${profile.gov_id_status === 'verified'
                                ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30'
                                : 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30'
                                }`}>
                                {profile.gov_id_status === 'verified' ? (
                                    <FileCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                                ) : (
                                    <ShieldCheck className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                                )}
                                <div className="flex-1">
                                    <h4 className={`font-semibold ${profile.gov_id_status === 'verified'
                                        ? 'text-emerald-800 dark:text-emerald-400'
                                        : 'text-yellow-800 dark:text-yellow-400'
                                        }`}>
                                        {profile.gov_id_status === 'verified' ? "Identity Verified" : "Verification Pending"}
                                    </h4>
                                    <p className={`text-sm ${profile.gov_id_status === 'verified'
                                        ? 'text-emerald-700/80 dark:text-emerald-500/80'
                                        : 'text-yellow-700/80 dark:text-yellow-500/80'
                                        }`}>
                                        {profile.gov_id_status === 'verified'
                                            ? "You have full access to loan applications and premium features."
                                            : "Your document is under review by our admin team. This usually takes 24 hours."}
                                    </p>
                                </div>
                            </div>

                            {/* View ID Button - Available for both Pending and Verified */}
                            {profile.gov_id_url && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full"><Eye className="w-4 h-4 mr-2" /> View Submitted ID</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <div className="p-4 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                                            {profile.gov_id_url ? (
                                                <img
                                                    src={profile.gov_id_url?.includes('mock') ? 'https://placehold.co/600x400/png?text=Government+ID' : profile.gov_id_url}
                                                    alt="Submitted ID"
                                                    className="max-w-full h-auto rounded shadow-sm"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = "https://placehold.co/600x400/png?text=Image+Load+Error";
                                                    }}
                                                />
                                            ) : (
                                                <div className="text-gray-500">Image URL not found.</div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex gap-2 dark:bg-blue-900/20 dark:text-blue-300">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>
                                    <span className="font-semibold block mb-1">Optional (Required for Loans)</span>
                                    Uploading your ID is optional for basic usage but <strong>mandatory</strong> if you wish to apply for loans.
                                </p>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileSelect}
                            />

                            <div
                                onClick={() => !uploadingId && fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${previewUrl ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 cursor-pointer'
                                    }`}
                            >
                                {previewUrl ? (
                                    <div className="relative">
                                        <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto rounded shadow-sm" />
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="absolute top-2 right-2 opacity-80 hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewUrl(null);
                                                if (fileInputRef.current) fileInputRef.current.value = "";
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-800">
                                            <Upload className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Click to upload</span> or drag and drop
                                            <p className="text-xs text-gray-400 mt-1">Government ID (Passport, NIN, Driver's License)</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {previewUrl && (
                                <div className="mt-4">
                                    <Button onClick={handleUploadId} disabled={uploadingId} className="w-full dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700">
                                        {uploadingId ? "Verifying..." : "Submit for Verification"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">Bank Accounts</CardTitle>
                    <CardDescription className="dark:text-gray-400">
                        Manage your withdrawal accounts.
                        <span className="block mt-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            Note: Account Name MUST match your Profile Name ({profile.full_name}) exactly.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Active Accounts */}
                    <div className="space-y-4">
                        {bankAccounts.length === 0 && (
                            <p className="text-sm text-gray-500 italic dark:text-gray-400">No active bank accounts.</p>
                        )}
                        {bankAccounts.map(account => (
                            <div key={account.id} className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                                {editingBankId === account.id ? (
                                    <div className="space-y-3">
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <Input
                                                value={editBankData.bank_name}
                                                onChange={e => setEditBankData({ ...editBankData, bank_name: e.target.value })}
                                                placeholder="Bank Name"
                                                className="dark:bg-gray-800 dark:border-gray-700"
                                            />
                                            <Input
                                                value={editBankData.account_number}
                                                onChange={e => setEditBankData({ ...editBankData, account_number: e.target.value })}
                                                placeholder="Account Number"
                                                className="dark:bg-gray-800 dark:border-gray-700"
                                            />
                                            <div className="md:col-span-2">
                                                <Input
                                                    value={editBankData.account_name}
                                                    onChange={e => setEditBankData({ ...editBankData, account_name: e.target.value })}
                                                    placeholder="Account Name (Must match Profile)"
                                                    className="dark:bg-gray-800 dark:border-gray-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={cancelEditing}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                                            <Button size="sm" onClick={saveEditedBank} className="bg-emerald-600 text-white hover:bg-emerald-700"><Check className="w-4 h-4 mr-1" /> Save</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">
                                                <Banknote className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{account.bank_name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{account.account_name} &bull; {account.account_number}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {nameHistory.length === 0 && (
                                                <Button variant="ghost" size="sm" onClick={() => startEditing(account)} className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => deleteBankAccount(account.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pending Requests */}
                    {bankRequests.length > 0 && (
                        <div className="mt-6 border-t pt-4 dark:border-gray-700">
                            <h4 className="text-sm font-semibold mb-3 dark:text-gray-300 text-yellow-600 dark:text-yellow-500">Pending Approvals</h4>
                            <div className="space-y-2">
                                {bankRequests.map(req => (
                                    <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30">
                                        <div className="text-sm">
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{req.bank_name}</p>
                                            <p className="text-gray-500 dark:text-gray-400">{req.account_number}</p>
                                        </div>
                                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full dark:bg-yellow-900 dark:text-yellow-400 capitalize">
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t dark:border-gray-700">
                        <h4 className="text-sm font-semibold mb-3 dark:text-gray-300">Add New Account</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="bank_name" className="dark:text-gray-300">Bank Name</Label>
                                <Input
                                    id="bank_name"
                                    placeholder="e.g. Chase, Wells Fargo"
                                    value={newBank.bank_name}
                                    onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="account_number" className="dark:text-gray-300">Account Number</Label>
                                <Input
                                    id="account_number"
                                    placeholder="Digits only"
                                    value={newBank.account_number}
                                    onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                />
                            </div>
                            <div className="md:col-span-2 grid gap-2">
                                <Label htmlFor="account_name" className="dark:text-gray-300">Account Name</Label>
                                <Input
                                    id="account_name"
                                    placeholder="Must match Profile Name exactly"
                                    value={newBank.account_name}
                                    onChange={(e) => setNewBank({ ...newBank, account_name: e.target.value })}
                                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddBank} disabled={addingBank} className="mt-4 w-full md:w-auto dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700">
                            {addingBank ? "Processing..." : (
                                nameHistory.length > 0 ? "Request Approval" : <><Plus className="w-4 h-4 mr-2" /> Add Bank Account</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">Security</CardTitle>
                    <CardDescription className="dark:text-gray-400">Manage your password and security settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800">Change Password</Button>
                </CardContent>
            </Card>
        </div>
    );
}
