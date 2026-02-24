import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useAuth } from "@/app/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { toast } from "sonner";
import { Trash2, Plus, Banknote, History, AlertTriangle, Edit2, X, Check, ShieldCheck, Upload, FileCheck, Info, Eye, Camera } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { User, KeyRound, UserCheck, Landmark, Shield, Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/app/components/ui/input-otp";
import { validateFile, validatePassword } from "@/lib/validation";

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
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Password State
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: ""
    });

    const passFeedback = validatePassword(passwordData.new_password);

    const [otpCode, setOtpCode] = useState("");
    const [codeRequested, setCodeRequested] = useState(false);
    const [requestingCode, setRequestingCode] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Email Change State
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailPassword, setEmailPassword] = useState("");
    const [updatingEmail, setUpdatingEmail] = useState(false);

    // Manual Recovery State
    const [showManualChange, setShowManualChange] = useState(false);
    const [manualEmail, setManualEmail] = useState("");
    const [livePhoto, setLivePhoto] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [submittingManual, setSubmittingManual] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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

    async function handleRequestCode() {
        if (!passwordData.current_password) {
            toast.error("Please enter your current password first");
            return;
        }

        setRequestingCode(true);
        // Step 1: Verify current password by attempting to sign in (not actually logging in, just checking)
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || "",
            password: passwordData.current_password,
        });

        if (authError) {
            toast.error("Current password incorrect");
            setRequestingCode(false);
            return;
        }

        // Step 2: Send OTP code (using recovery flow)
        const { error: otpError } = await supabase.auth.resetPasswordForEmail(user?.email || "");

        if (otpError) {
            console.error("OTP Request Error:", otpError);
            let errorMessage = "Failed to send verification code. Please try again.";
            if (otpError.message) {
                errorMessage = otpError.message;
            } else if (typeof otpError === 'object' && JSON.stringify(otpError) !== "{}") {
                errorMessage = JSON.stringify(otpError);
            }
            if (errorMessage === "{}" || errorMessage === "[object Object]") {
                errorMessage = "Failed to send verification code. Please ensure your email is correct.";
            }
            toast.error(errorMessage);
        } else {
            toast.success("Verification code sent to your email");
            setCodeRequested(true);
        }
        setRequestingCode(false);
    }

    async function handleEmailChange() {
        if (!newEmail || !emailPassword) {
            toast.error("Please enter your new email and current password");
            return;
        }

        if (newEmail === user?.email) {
            toast.error("New email must be different from current email");
            return;
        }

        setUpdatingEmail(true);

        // Verify password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || "",
            password: emailPassword,
        });

        if (authError) {
            toast.error("Current password incorrect");
            setUpdatingEmail(false);
            return;
        }

        // Update email
        const { error } = await supabase.auth.updateUser({ email: newEmail });

        if (error) {
            toast.error(error.message || "Failed to initiate email change");
        } else {
            toast.success("Change initiated! Please check both your old and new email addresses for confirmation links.");
            setShowEmailForm(false);
            setNewEmail("");
            setEmailPassword("");

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: 'EMAIL_CHANGE_INITIATED',
                details: { new_email: newEmail }
            });
        }
        setUpdatingEmail(false);
    }

    const startCamera = async () => {
        setIsCapturing(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            toast.error("Unable to access camera");
            setIsCapturing(false);
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCapturing(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                setLivePhoto(dataUrl);
                stopCamera();
            }
        }
    };

    async function handleManualEmailChangeRequest() {
        if (!manualEmail || !livePhoto) {
            toast.error("Please enter new email and capture a live photo");
            return;
        }

        setSubmittingManual(true);
        try {
            // Upload photo
            const blob = await (await fetch(livePhoto)).blob();
            const fileName = `manual-email/${user?.id}-${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('kyc')
                .upload(fileName, blob);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('kyc')
                .getPublicUrl(fileName);

            // Create request
            const { error: requestError } = await supabase
                .from('email_change_requests')
                .insert({
                    user_id: user?.id,
                    new_email: manualEmail,
                    live_photo_url: publicUrl
                });

            if (requestError) throw requestError;

            toast.success("Manual recovery request submitted! Admins will review your ID and live photo.");
            setShowManualChange(false);
            setManualEmail("");
            setLivePhoto(null);

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: 'MANUAL_EMAIL_CHANGE_REQUEST',
                details: { new_email: manualEmail }
            });

        } catch (err: any) {
            toast.error(err.message || "Failed to submit request");
        } finally {
            setSubmittingManual(false);
        }
    }
    async function handlePasswordChange() {
        if (!passwordData.new_password || !passwordData.confirm_password || !otpCode) {
            toast.error("Please fill all password fields and enter the verification code");
            return;
        }

        // Security: Strict Password Complexity
        if (!passFeedback.isValid) {
            toast.error("New password does not meet security requirements");
            return;
        }

        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("New passwords do not match");
            return;
        }
        if (passwordData.new_password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setUpdatingPassword(true);

        // Step 3: Verify OTP and set session for password update
        const { error: verifyError } = await supabase.auth.verifyOtp({
            email: user?.email || "",
            token: otpCode,
            type: 'recovery'
        });

        if (verifyError) {
            toast.error("Invalid or expired verification code");
            setUpdatingPassword(false);
            return;
        }

        // Step 4: Update password
        const { error } = await supabase.auth.updateUser({
            password: passwordData.new_password
        });

        if (error) {
            console.error("Password Update Error:", error);
            let errorMessage = "Failed to update password. Please check your connection and try again.";
            if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'object' && JSON.stringify(error) !== "{}") {
                errorMessage = JSON.stringify(error);
            }
            if (errorMessage === "{}" || errorMessage === "[object Object]") {
                errorMessage = "Failed to update password. Please try again.";
            }
            toast.error(errorMessage);
        } else {
            toast.success("Password updated successfully");
            setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
            setOtpCode("");
            setCodeRequested(false);
            setShowPasswordForm(false);
        }
        setUpdatingPassword(false);
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Security: Strict File Validation
            const validation = validateFile(file, {
                maxSizeMB: 5,
                allowedTypes: ["image/jpeg", "image/png", "application/pdf"]
            });

            if (!validation.isValid) {
                toast.error(validation.error);
                return;
            }

            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            const validation = validateFile(file, {
                maxSizeMB: 2,
                allowedTypes: ["image/jpeg", "image/png"]
            });

            if (!validation.isValid) {
                toast.error(validation.error);
                return;
            }

            setUploadingAvatar(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${user?.id}-${Math.random()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ avatar_url: publicUrl })
                    .eq('id', user?.id);

                if (updateError) throw updateError;

                setProfile({ ...profile, avatar_url: publicUrl });
                toast.success("Avatar updated!");

                // Update Auth Metadata too
                await supabase.auth.updateUser({
                    data: { avatar_url: publicUrl }
                });

            } catch (error: any) {
                console.error("Avatar Upload Error:", error);
                toast.error(error.message || "Failed to upload avatar");
            } finally {
                setUploadingAvatar(false);
            }
        }
    }

    async function handleUploadId() {
        if (!previewUrl || !fileInputRef.current?.files?.[0]) {
            fileInputRef.current?.click();
            return;
        }

        const file = fileInputRef.current.files[0];
        setUploadingId(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `kyc/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('kyc')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('kyc')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase.from("profiles").update({
                gov_id_status: 'pending',
                gov_id_url: publicUrl
            }).eq("id", user?.id);

            if (updateError) throw updateError;

            toast.success("ID Uploaded! Verification pending.");
            setPreviewUrl(null);

            // Log Activity
            supabase.from('activity_logs').insert({
                user_id: user?.id,
                action: 'KYC_UPLOAD',
                details: { status: 'pending' }
            });

            await fetchProfile();
        } catch (error: any) {
            console.error("KYC Upload Error:", error);
            toast.error(error.message || "Failed to submit ID. Please try again.");
        } finally {
            setUploadingId(false);
        }
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your profile and preferences.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid grid-cols-4 mb-8 dark:bg-gray-800">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="hidden sm:inline">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="kyc" className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">KYC</span>
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="flex items-center gap-2">
                        <Landmark className="w-4 h-4" />
                        <span className="hidden sm:inline">Banks</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span className="hidden sm:inline">Security</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
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
                                <div>
                                    <input
                                        type="file"
                                        ref={avatarInputRef}
                                        className="hidden"
                                        accept="image/jpeg,image/png"
                                        onChange={handleAvatarSelect}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => avatarInputRef.current?.click()}
                                        disabled={uploadingAvatar}
                                        className="dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800"
                                    >
                                        {uploadingAvatar ? "Uploading..." : "Change Avatar"}
                                    </Button>
                                </div>
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
                </TabsContent>

                <TabsContent value="kyc" className="space-y-6">
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
                </TabsContent>

                <TabsContent value="bank" className="space-y-6">
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
                </TabsContent>

                <TabsContent value="security" className="space-y-6">
                    <Card className="dark:bg-gray-800 dark:border-gray-700">
                        <CardHeader>
                            <CardTitle className="dark:text-white">Security</CardTitle>
                            <CardDescription className="dark:text-gray-400">Manage your password and security settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Email Address Card */}
                            {!showEmailForm ? (
                                <div className="flex items-center gap-4 p-4 border rounded-lg dark:border-gray-700">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-full">
                                        <Mail className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold dark:text-white">Email Address</h4>
                                        <p className="text-sm text-gray-500">{user?.email}</p>
                                    </div>
                                    <Button variant="outline" onClick={() => setShowEmailForm(true)}>Change Email</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <h4 className="font-semibold dark:text-white flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> Change Email Address
                                    </h4>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>For security, a confirmation link will be sent to BOTH your old and new email addresses. All links must be confirmed before the change takes effect.</span>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="dark:text-white text-sm font-medium">New Email Address</Label>
                                        <Input
                                            type="email"
                                            placeholder="Enter new email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="dark:bg-gray-800 dark:border-gray-700"
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="dark:text-white text-sm font-medium">Confirm with Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="Enter current password"
                                            value={emailPassword}
                                            onChange={(e) => setEmailPassword(e.target.value)}
                                            className="dark:bg-gray-800 dark:border-gray-700"
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <button
                                            onClick={() => setShowManualChange(true)}
                                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                                        >
                                            Lost access to your current email?
                                        </button>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" onClick={() => {
                                                setShowEmailForm(false);
                                                setNewEmail("");
                                                setEmailPassword("");
                                            }}>Cancel</Button>
                                            <Button
                                                className="bg-emerald-600 hover:bg-emerald-700"
                                                onClick={handleEmailChange}
                                                disabled={updatingEmail || !newEmail || !emailPassword}
                                            >
                                                {updatingEmail ? "Updating..." : "Update Email"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!showPasswordForm ? (
                                <div className="flex items-center gap-4 p-4 border rounded-lg dark:border-gray-700">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-full">
                                        <KeyRound className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold dark:text-white">Password</h4>
                                        <p className="text-sm text-gray-500">Last updated recently</p>
                                    </div>
                                    <Button variant="outline" onClick={() => setShowPasswordForm(true)}>Change Password</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <div className="grid gap-2">
                                        <Label className="dark:text-white text-sm font-medium">Current Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="Enter your current password"
                                            value={passwordData.current_password}
                                            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                            className="dark:bg-gray-800 dark:border-gray-700"
                                            disabled={codeRequested}
                                        />
                                    </div>

                                    {!codeRequested ? (
                                        <Button
                                            variant="secondary"
                                            className="w-full"
                                            onClick={handleRequestCode}
                                            disabled={requestingCode || !passwordData.current_password}
                                        >
                                            {requestingCode ? "Verifying..." : "Request Verification Code"}
                                        </Button>
                                    ) : (
                                        <div className="space-y-4 pt-2 border-t dark:border-gray-700 mt-2">
                                            <div className="grid gap-2">
                                                <Label className="dark:text-white text-sm font-medium flex items-center gap-2">
                                                    <Mail className="w-4 h-4" /> Verification Code (sent to email)
                                                </Label>
                                                <div className="flex justify-center py-2">
                                                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                                                        <InputOTPGroup>
                                                            <InputOTPSlot index={0} />
                                                            <InputOTPSlot index={1} />
                                                            <InputOTPSlot index={2} />
                                                        </InputOTPGroup>
                                                        <InputOTPSeparator />
                                                        <InputOTPGroup>
                                                            <InputOTPSlot index={3} />
                                                            <InputOTPSlot index={4} />
                                                            <InputOTPSlot index={5} />
                                                        </InputOTPGroup>
                                                    </InputOTP>
                                                </div>
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    className="text-xs h-auto p-0"
                                                    onClick={() => setCodeRequested(false)}
                                                >
                                                    Wrong password? Go back
                                                </Button>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label className="dark:text-white text-sm font-medium">New Password</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="At least 6 characters"
                                                    value={passwordData.new_password}
                                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                    className="dark:bg-gray-800 dark:border-gray-700"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="dark:text-white text-sm font-medium">Confirm New Password</Label>
                                                <Input
                                                    type="password"
                                                    placeholder="Match new password"
                                                    value={passwordData.confirm_password}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                    className="dark:bg-gray-800 dark:border-gray-700"
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end pt-2">
                                                <Button variant="ghost" onClick={() => {
                                                    setShowPasswordForm(false);
                                                    setCodeRequested(false);
                                                    setOtpCode("");
                                                }}>Cancel</Button>
                                                <Button
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={handlePasswordChange}
                                                    disabled={updatingPassword || otpCode.length < 6}
                                                >
                                                    {updatingPassword ? "Updating..." : "Update Password"}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Manual Email Change Dialog */}
            <Dialog open={showManualChange} onOpenChange={setShowManualChange}>
                <DialogContent className="sm:max-w-[425px] dark:bg-gray-900 dark:border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="dark:text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            Manual Email Recovery
                        </DialogTitle>
                        <DialogDescription className="dark:text-gray-400">
                            Use this if you no longer have access to your registered email.
                        </DialogDescription>
                    </DialogHeader>

                    {profile.gov_id_status !== 'verified' ? (
                        <div className="space-y-4 py-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
                                <div className="text-sm text-amber-800 dark:text-amber-400">
                                    <p className="font-bold mb-1">KYC Verification Required</p>
                                    <p>Manual recovery is only available to identity-verified users. Please complete your KYC verification first.</p>
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => setShowManualChange(false)}>Close</Button>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label className="dark:text-white">New Email Address</Label>
                                <Input
                                    placeholder="Enter your new email"
                                    value={manualEmail}
                                    onChange={(e) => setManualEmail(e.target.value)}
                                    className="dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="dark:text-white">Identity Verification (Live Photo)</Label>
                                <div className="border-2 border-dashed rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 flex flex-col items-center justify-center min-h-[200px]">
                                    {livePhoto ? (
                                        <div className="relative w-full">
                                            <img src={livePhoto} alt="Live Capture" className="rounded-lg w-full h-auto shadow-md" />
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="absolute top-2 right-2 opacity-80"
                                                onClick={() => setLivePhoto(null)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : isCapturing ? (
                                        <div className="space-y-3 w-full flex flex-col items-center">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className="rounded-lg w-full aspect-video bg-black shadow-inner"
                                            />
                                            <Button onClick={capturePhoto} className="bg-emerald-600 text-white w-full">
                                                <Camera className="w-4 h-4 mr-2" /> Capture Photo
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-3">
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm inline-block">
                                                <Camera className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                <p>We need a live photo of you to match against your identity document.</p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={startCamera}>
                                                Start Camera
                                            </Button>
                                        </div>
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-[10px] text-blue-800 dark:text-blue-400">
                                <p><strong>Note:</strong> This process is manually reviewed by our security team. It may take up to 48 hours for your request to be processed.</p>
                            </div>

                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                                disabled={submittingManual || !manualEmail || !livePhoto}
                                onClick={handleManualEmailChangeRequest}
                            >
                                {submittingManual ? "Submitting..." : "Submit Recovery Request"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
