import { useEffect, useState, useRef } from "react";

import {
  Trash2,
  Plus,
  Banknote,
  History,
  AlertTriangle,
  Edit2,
  X,
  Check,
  ShieldCheck,
  Upload,
  FileCheck,
  Info,
  Eye,
  Camera,
  RefreshCw,
} from "lucide-react";
import { User, KeyRound, UserCheck, Landmark, Shield, Mail, Phone, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/app/components/ui/input-otp";
import { Label } from "@/app/components/ui/label";
import { PasswordStrength } from "@/app/components/ui/PasswordStrength";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useAuth } from "@/app/context/AuthContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";
import { validateFile, validatePassword } from "@/lib/validation";

// ---------------------------------------------------------------------------
// Image quality analysis helpers (shared with KYCModal)
// ---------------------------------------------------------------------------

/**
 * Detects image quality issues using canvas pixel analysis.
 * Returns { ok, reason } — reason is a human-readable rejection message.
 *
 * Thresholds are tuned very loosely for document scans:
 *  1. Brightness — rejects near-black (too dark) or near-white (overexposed)
 *  2. Laplacian variance — estimates sharpness; threshold lowered to 5
 */
function analyseImageQuality(
  canvas: HTMLCanvasElement,
  blurThreshold = 5
): { ok: boolean; reason?: string } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: true };

  const { width, height } = canvas;
  if (width === 0 || height === 0) return { ok: false, reason: "The image appears to be empty." };

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data; // RGBA
  const totalPixels = width * height;

  // Build greyscale array
  const grey: number[] = [];
  let brightnessSum = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const g = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    grey.push(g);
    brightnessSum += g;
  }
  const avgBrightness = brightnessSum / totalPixels;

  if (avgBrightness < 10) {
    return { ok: false, reason: "The image is too dark. Please improve lighting and try again." };
  }
  if (avgBrightness > 250) {
    return { ok: false, reason: "The image is overexposed / too bright. Please reduce glare and try again." };
  }

  // Laplacian variance — sharpness metric
  // Apply 3×3 Laplacian kernel: [0,-1,0,-1,4,-1,0,-1,0]
  let lapSum = 0;
  let lapSumSq = 0;
  let lapCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        -grey[idx - width] -
        grey[idx - 1] +
        4 * grey[idx] -
        grey[idx + 1] -
        grey[idx + width];
      lapSum += lap;
      lapSumSq += lap * lap;
      lapCount++;
    }
  }
  const lapMean = lapSum / lapCount;
  const lapVariance = lapSumSq / lapCount - lapMean * lapMean;

  if (lapVariance < blurThreshold) {
    return {
      ok: false,
      reason:
        "The image appears very blurry. Please ensure the document is clear and well-lit.",
    };
  }

  return { ok: true };
}

/** Loads an image File into an off-screen canvas and runs analyseImageQuality. PDF files are passed through. */
async function validateDocumentQuality(file: File): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) { resolve({ ok: true }); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve({ ok: true }); return; }
        ctx.drawImage(img, 0, 0);
        resolve(analyseImageQuality(canvas));
      };
      img.onerror = () => resolve({ ok: true });
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve({ ok: true });
    reader.readAsDataURL(file);
  });
}


export function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
    gov_id_status: "not_uploaded",
    gov_id_url: "",
    utility_bill_url: "",
    bvn: "",
    nin: "",
    kyc_country: "Nigeria",
    kyc_state: "Lagos",
    kyc_street: "",
    kyc_landmark: "",
    kyc_latitude: null as number | null,
    kyc_longitude: null as number | null,
    kyc_edit_allowed: false,
    nin_status: "not_uploaded",
    avatar_status: "not_uploaded",
    utility_bill_status: "not_uploaded",
  });

  const [hasActiveDebt, setHasActiveDebt] = useState(false);
  const [isEditingKyc, setIsEditingKyc] = useState(false);
  const kycLocked = hasActiveDebt && !profile.kyc_edit_allowed;

  // Keep track of original name to detect changes
  const [originalName, setOriginalName] = useState("");

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [newBank, setNewBank] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
  });
  const [addingBank, setAddingBank] = useState(false);

  // Edit Bank State
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankData, setEditBankData] = useState({
    bank_name: "",
    account_number: "",
    account_name: "",
  });

  // Security / History State
  const [nameHistory, setNameHistory] = useState<any[]>([]);
  const [bankRequests, setBankRequests] = useState<any[]>([]);

  // KYC Upload State
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [utilityBillPreview, setUtilityBillPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utilityBillInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
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

  const [isBankDeleteConfirmOpen, setIsBankDeleteConfirmOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<string | null>(null);

  // Manual Recovery State
  const [showManualChange, setShowManualChange] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [livePhoto, setLivePhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // KYC Camera state
  const [kycLivePhoto, setKycLivePhoto] = useState<string | null>(null);
  const [isCapturingKyc, setIsCapturingKyc] = useState(false);
  const [kycCameraError, setKycCameraError] = useState<"denied" | "blocked" | "no_camera" | "in_use" | "unknown" | null>(null);
  const videoKycRef    = useRef<HTMLVideoElement>(null);
  const canvasKycRef   = useRef<HTMLCanvasElement>(null);
  const streamKycRef   = useRef<MediaStream | null>(null);

  /** Fully stops the camera: clears intervals, stops all tracks, nulls srcObject. */
  const releaseKycCamera = () => {
    if (streamKycRef.current) {
      streamKycRef.current.getTracks().forEach((track) => track.stop());
      streamKycRef.current = null;
    }
    if (videoKycRef.current) videoKycRef.current.srcObject = null;
    setIsCapturingKyc(false);
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBankAccounts();
      fetchNameHistory();
      fetchBankRequests();
      checkActiveDebts();
    }
  }, [user]);

  async function checkActiveDebts() {
    if (!user?.id) return;
    try {
      const { data: loans } = await supabase
        .from("loans")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["pending", "approved", "active", "defaulted"]);

      const { data: plans } = await supabase
        .from("user_plans")
        .select("id, plan:plans(type)")
        .eq("user_id", user.id)
        .in("status", ["active", "pending_activation", "pending_turn_approval", "turn_reassigned"]);

      const hasActiveAjo = plans?.some((p: any) => p.plan?.type === "ajo_circle") || false;
      const hasActiveLoan = loans && loans.length > 0;

      setHasActiveDebt(!!(hasActiveLoan || hasActiveAjo));
    } catch (err) {
      console.error("Error checking active debts:", err);
    }
  }

  async function fetchProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", user?.id).single();

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        email: data.email || user?.email || "",
        phone: data.phone || user?.phone || user?.user_metadata?.phone || "",
        avatar_url: data.avatar_url || "",
        gov_id_status: data.gov_id_status || "not_uploaded",
        gov_id_url: data.gov_id_url || "",
        utility_bill_url: data.utility_bill_url || "",
        bvn: data.bvn || "",
        nin: data.nin || "",
        kyc_country: data.kyc_country || "Nigeria",
        kyc_state: data.kyc_state || "Lagos",
        kyc_street: data.kyc_street || "",
        kyc_landmark: data.kyc_landmark || "",
        kyc_latitude: data.kyc_latitude ? Number(data.kyc_latitude) : null,
        kyc_longitude: data.kyc_longitude ? Number(data.kyc_longitude) : null,
        kyc_edit_allowed: data.kyc_edit_allowed || false,
        nin_status: data.nin_status || "not_uploaded",
        avatar_status: data.avatar_status || "not_uploaded",
        utility_bill_status: data.utility_bill_status || "not_uploaded",
      });
      setOriginalName(data.full_name || "");
    } else {
      const metaName = user?.user_metadata?.full_name || "";
      const metaPhone = user?.phone || user?.user_metadata?.phone || "";
      setProfile({
        full_name: metaName,
        email: user?.email || "",
        phone: metaPhone,
        avatar_url: "",
        gov_id_status: "not_uploaded",
        gov_id_url: "",
        utility_bill_url: "",
        bvn: "",
        nin: "",
        kyc_country: "Nigeria",
        kyc_state: "Lagos",
        kyc_street: "",
        kyc_landmark: "",
        kyc_latitude: null,
        kyc_longitude: null,
        kyc_edit_allowed: false,
        nin_status: "not_uploaded",
        avatar_status: "not_uploaded",
        utility_bill_status: "not_uploaded",
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
        status: "pending",
      });

      if (error) {
        toast.error("Failed to submit request");
        console.error(error);
      } else {
        toast.success("Bank account request submitted for approval");
        await notificationDispatcher.sendAlert({
          userId: user?.id || "",
          email: profile.email,
          type: "profile",
          title: "Bank Change Request Submitted",
          message: `Your request to add bank account ${newBank.bank_name} (${newBank.account_number}) has been submitted for admin approval.`,
        });
        setNewBank({ bank_name: "", account_number: "", account_name: "" });
        fetchBankRequests();
      }
    } else {
      // Normal Add
      const { error } = await supabase.from("bank_accounts").insert({
        user_id: user?.id,
        bank_name: newBank.bank_name,
        account_number: newBank.account_number,
        account_name: newBank.account_name,
      });

      if (error) {
        toast.error("Failed to add bank account");
        console.error(error);
      } else {
        toast.success("Bank account added successfully");
        await notificationDispatcher.sendAlert({
          userId: user?.id || "",
          email: profile.email,
          type: "profile",
          title: "Bank Account Added",
          message: `A new bank account ${newBank.bank_name} (${newBank.account_number}) has been successfully linked to your profile.`,
        });
        setNewBank({ bank_name: "", account_number: "", account_name: "" });
        fetchBankAccounts();

        // Log Activity
        supabase.from("activity_logs").insert({
          user_id: user?.id,
          action: "BANK_ADD",
          details: {
            bank_name: newBank.bank_name,
            account_number: "***" + newBank.account_number.slice(-4),
          },
        });
      }
    }
    setAddingBank(false);
  }

  const startEditing = (account: any) => {
    if (nameHistory.length > 0) {
      toast.error(
        "Editing blocked due to name change history. Please contact support or request a new account.",
      );
      return;
    }
    setEditingBankId(account.id);
    setEditBankData({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_name: account.account_name,
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
        account_name: editBankData.account_name,
      })
      .eq("id", editingBankId);

    if (error) {
      toast.error("Failed to update bank account");
    } else {
      toast.success("Bank account updated");
      fetchBankAccounts();
      cancelEditing();

      await notificationDispatcher.sendAlert({
        userId: user?.id || "",
        email: profile.email,
        type: "profile",
        title: "Bank Account Details Updated",
        message: `Your linked bank account details for ${editBankData.bank_name} (${editBankData.account_number}) have been successfully updated.`,
      });

      // Log Activity
      supabase.from("activity_logs").insert({
        user_id: user?.id,
        action: "BANK_UPDATE",
        details: { bank_name: editBankData.bank_name },
      });
    }
  }

  async function deleteBankAccount(id: string) {
    setBankToDelete(id);
    setIsBankDeleteConfirmOpen(true);
  }

  async function confirmDeleteBankAccount() {
    if (!bankToDelete) return;

    const { error } = await supabase.from("bank_accounts").delete().eq("id", bankToDelete);
    if (error) {
      toast.error("Failed to remove bank account");
    } else {
      toast.success("Bank account removed");

      const deletedBank = bankAccounts.find((acc) => acc.id === bankToDelete);
      const bankNameInfo = deletedBank
        ? `${deletedBank.bank_name} (${deletedBank.account_number})`
        : "A bank account";

      setBankAccounts(bankAccounts.filter((acc) => acc.id !== bankToDelete));

      await notificationDispatcher.sendAlert({
        userId: user?.id || "",
        email: profile.email,
        type: "profile",
        title: "Bank Account Removed",
        message: `${bankNameInfo} has been successfully removed from your profile.`,
      });

      // Log Activity
      supabase.from("activity_logs").insert({
        user_id: user?.id,
        action: "BANK_DELETE",
        details: { id: bankToDelete },
      });
    }
    setBankToDelete(null);
    setIsBankDeleteConfirmOpen(false);
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
        new_name: profile.full_name,
      });
      if (histError) console.error("Failed to log name history", histError);
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
      })
      .eq("id", user?.id);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
      await supabase.auth.updateUser({
        phone: profile.phone,
        data: { full_name: profile.full_name, phone: profile.phone },
      });

      setOriginalName(profile.full_name);

      if (nameChanged) {
        await notificationDispatcher.sendAlert({
          userId: user?.id || "",
          email: profile.email,
          type: "profile",
          title: "Profile Name Changed",
          message: `Your name on Mary's Thrift has been successfully updated from "${originalName}" to "${profile.full_name}".`,
        });
        fetchNameHistory();
        supabase.from("activity_logs").insert({
          user_id: user?.id,
          action: "NAME_CHANGE",
          details: { old: originalName, new: profile.full_name },
        });
      } else {
        const phoneChanged = profile.phone !== (user?.phone || user?.user_metadata?.phone || "");
        if (phoneChanged) {
          await notificationDispatcher.sendAlert({
            userId: user?.id || "",
            email: profile.email,
            type: "profile",
            title: "Phone Number Updated",
            message: `Your phone number on Mary's Thrift has been successfully updated to ${profile.phone}.`,
          });
        }
        supabase.from("activity_logs").insert({
          user_id: user?.id,
          action: "PROFILE_UPDATE",
          details: { changes: "details_update" },
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
      } else if (typeof otpError === "object" && JSON.stringify(otpError) !== "{}") {
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
      toast.success(
        "Change initiated! Please check both your old and new email addresses for confirmation links.",
      );
      setShowEmailForm(false);
      setNewEmail("");
      setEmailPassword("");

      await notificationDispatcher.sendAlert({
        userId: user?.id || "",
        email: profile.email,
        type: "profile",
        title: "Email Change Initiated",
        message: `A request to change your email address to ${newEmail} has been initiated. Check both your old and new email addresses to confirm.`,
      });

      // Log Activity
      supabase.from("activity_logs").insert({
        user_id: user?.id,
        action: "EMAIL_CHANGE_INITIATED",
        details: { new_email: newEmail },
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
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL("image/jpeg");
        setLivePhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const getKycBrowserName = () => {
    const ua = navigator.userAgent;
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Edg\//.test(ua))     return "edge";
    if (/OPR\/|Opera\//.test(ua)) return "opera";
    if (/Chrome\//.test(ua)) return "chrome";
    if (/Safari\//.test(ua)) return "safari";
    return "other";
  };

  const getKycCameraUnblockSteps = (): string[] => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return [
      "Open your device Settings",
      "Find your browser app (Chrome, Safari, etc.)",
      "Tap Permissions → Camera → Allow",
      "Return here and tap \"Try Again\"",
    ];
    const b = getKycBrowserName();
    if (b === "chrome" || b === "edge") return [
      "Click the 🔒 lock icon in the address bar",
      "Select \"Site settings\" then find Camera",
      "Change Camera from \"Blocked\" to \"Allow\"",
      "Click \"Try Again\" below — no refresh needed",
    ];
    if (b === "firefox") return [
      "Click the camera icon (🎥) in the address bar",
      "Select \"Remove Blocked permission\"",
      "Click \"Try Again\" below to re-trigger the prompt",
    ];
    if (b === "safari") return [
      "Click Safari menu → Settings for this Website",
      "Set Camera to \"Allow\"",
      "Click \"Try Again\" below",
    ];
    return [
      "Click the camera / lock icon in your browser's address bar",
      "Find Camera permissions and set them to \"Allow\"",
      "Click \"Try Again\" below",
    ];
  };

  const handleKycCameraError = (err: unknown) => {
    const name = (err as any)?.name ?? "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setKycCameraError("denied");
    } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setKycCameraError("no_camera");
    } else if (name === "NotReadableError" || name === "TrackStartError") {
      setKycCameraError("in_use");
    } else {
      setKycCameraError("unknown");
    }
    releaseKycCamera();
  };

  const startKycCamera = async () => {
    releaseKycCamera();
    setKycCameraError(null);
    setIsCapturingKyc(true);
    setKycLivePhoto(null);

    // ── 0. Check if mediaDevices is supported (e.g. secure context, not webview) ──
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setKycCameraError("no_camera");
      releaseKycCamera();
      return;
    }

    // ── 1. Check permission state first (if supported) ──
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (perm.state === "denied") {
          setKycCameraError("blocked");
          releaseKycCamera();
          return;
        }
        perm.onchange = () => {
          if (perm.state === "granted") {
            setKycCameraError(null);
            startKycCamera();
          }
        };
      } catch {
        // Permissions API not fully supported on some mobile browsers (e.g. iOS Safari)
      }
    }

    // ── 2. Request stream with progressive fallbacks ──
    let stream: MediaStream | null = null;
    const constraintsList = [
      { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: "user" } },
      { video: true }
    ];

    let lastErr: unknown = null;
    for (const constraints of constraintsList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break; // Success!
      } catch (err: unknown) {
        lastErr = err;
        // Continue to the next fallback constraint
      }
    }

    if (!stream) {
      handleKycCameraError(lastErr || new Error("No stream"));
      return;
    }

    streamKycRef.current = stream;
    if (videoKycRef.current) {
      videoKycRef.current.srcObject = stream;
      // Mirror the video horizontally for a more natural selfie experience
      videoKycRef.current.style.transform = "scaleX(-1)";
    }
  };

  const stopKycCamera = () => releaseKycCamera();

  const captureKycPhoto = () => {
    if (videoKycRef.current && canvasKycRef.current) {
      const context = canvasKycRef.current.getContext("2d");
      if (context) {
        canvasKycRef.current.width = videoKycRef.current.videoWidth;
        canvasKycRef.current.height = videoKycRef.current.videoHeight;
        
        // Ensure the canvas capture respects the mirrored video
        context.translate(canvasKycRef.current.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(videoKycRef.current, 0, 0);

        const dataUrl = canvasKycRef.current.toDataURL("image/jpeg", 0.9);
        setKycLivePhoto(dataUrl);
        stopKycCamera();
        toast.success("Photo captured successfully ✓");
      }
    }
  };

  // Release KYC camera on unmount
  useEffect(() => {
    return () => {
      releaseKycCamera();
    };
  }, []);

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

      const { error: uploadError } = await supabase.storage.from("kyc").upload(fileName, blob);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("kyc").getPublicUrl(fileName);

      // Create request
      const { error: requestError } = await supabase.from("email_change_requests").insert({
        user_id: user?.id,
        new_email: manualEmail,
        live_photo_url: publicUrl,
      });

      if (requestError) throw requestError;

      toast.success(
        "Manual recovery request submitted! Admins will review your ID and live photo.",
      );
      setShowManualChange(false);
      setManualEmail("");
      setLivePhoto(null);

      await notificationDispatcher.sendAlert({
        userId: user?.id || "",
        email: profile.email,
        type: "profile",
        title: "Manual Email Change Request Submitted",
        message: `Your manual request to change your account email address to ${manualEmail} has been submitted for admin approval.`,
      });

      // Log Activity
      supabase.from("activity_logs").insert({
        user_id: user?.id,
        action: "MANUAL_EMAIL_CHANGE_REQUEST",
        details: { new_email: manualEmail },
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
      type: "recovery",
    });

    if (verifyError) {
      toast.error("Invalid or expired verification code");
      setUpdatingPassword(false);
      return;
    }

    // Step 4: Update password
    const { error } = await supabase.auth.updateUser({
      password: passwordData.new_password,
    });

    if (error) {
      console.error("Password Update Error:", error);
      toast.error(error.message || "Failed to update password");
      setUpdatingPassword(false); // Explicitly clear loading on error
    } else {
      toast.success("Password updated successfully");
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
      setOtpCode("");
      setCodeRequested(false);
      setShowPasswordForm(false);
      setUpdatingPassword(false);

      await notificationDispatcher.sendAlert({
        userId: user?.id || "",
        email: profile.email,
        type: "profile",
        title: "Account Password Changed",
        message:
          "Your account password has been successfully updated. If you did not make this change, please contact support immediately.",
      });
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Security: Strict File Validation
      const validation = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      });

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      if (file.size < 50 * 1024) {
        toast.error("The uploaded file is too small or blurry. Please upload a clear NIN document image (at least 50KB).");
        return;
      }

      // Quality gate — blur / brightness
      const quality = await validateDocumentQuality(file);
      if (!quality.ok) {
        toast.error(`NIN Slip rejected: ${quality.reason}`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      toast.success("NIN slip looks clear ✓");
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      const validation = validateFile(file, {
        maxSizeMB: 2,
        allowedTypes: ["image/jpeg", "image/png"],
      });

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      setUploadingAvatar(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user?.id}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", user?.id);

        if (updateError) throw updateError;

        setProfile({ ...profile, avatar_url: publicUrl });
        toast.success("Avatar updated!");

        // Update Auth Metadata too
        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });
      } catch (error: any) {
        console.error("Avatar Upload Error:", error);
        toast.error(error.message || "Failed to upload avatar");
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleUtilityBillSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      const validation = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      });

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      if (file.size < 50 * 1024) {
        toast.error("The uploaded file is too small or blurry. Please upload a clear utility bill image (at least 50KB).");
        return;
      }

      // Quality gate — blur / brightness
      const quality = await validateDocumentQuality(file);
      if (!quality.ok) {
        toast.error(`Utility Bill rejected: ${quality.reason}`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setUtilityBillPreview(objectUrl);
      toast.success("Utility bill looks clear ✓");
    }
  };

  async function handleKycSubmit() {
    if (!user) return;

    if (!/^\d{11}$/.test(profile.bvn)) {
      toast.error("BVN must be exactly 11 digits (numbers only)");
      return;
    }
    if (!/^\d{11}$/.test(profile.nin)) {
      toast.error("NIN must be exactly 11 digits (numbers only)");
      return;
    }
    if (!profile.kyc_street.trim() || !profile.kyc_landmark.trim()) {
      toast.error("Please fill in both the street address and closest landmark");
      return;
    }
    if (!kycLivePhoto && !profile.avatar_url) {
      toast.error("Please capture a live photo profile picture");
      return;
    }

    let finalGovIdUrl = profile.gov_id_url;
    if (fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      setUploadingId(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-nin-${Date.now()}.${fileExt}`;
        const filePath = `kyc/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("kyc").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("kyc").getPublicUrl(filePath);
        finalGovIdUrl = publicUrl;
      } catch (err: any) {
        toast.error("NIN slip upload failed");
        setUploadingId(false);
        return;
      }
    } else if (!profile.gov_id_url) {
      toast.error("Please select and upload your NIN Slip document image");
      return;
    }

    let finalUtilityBillUrl = profile.utility_bill_url;
    if (utilityBillInputRef.current?.files?.[0]) {
      const file = utilityBillInputRef.current.files[0];
      setUploadingId(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-utility-${Date.now()}.${fileExt}`;
        const filePath = `kyc/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("kyc").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("kyc").getPublicUrl(filePath);
        finalUtilityBillUrl = publicUrl;
      } catch (err: any) {
        toast.error("Utility bill upload failed");
        setUploadingId(false);
        return;
      }
    } else if (!profile.utility_bill_url) {
      toast.error("Please select and upload your Utility Bill or Business Signage image");
      return;
    }

    setUploadingId(true);
    try {
      let finalAvatarUrl = profile.avatar_url;
      if (kycLivePhoto) {
        const blob = await (await fetch(kycLivePhoto)).blob();
        const fileName = `${user.id}-avatar-${Date.now()}.jpg`;
        const filePath = `${fileName}`;

        const { error: avatarUploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, blob, {
            contentType: "image/jpeg"
          });

        if (avatarUploadError) throw avatarUploadError;

        const { data: { publicUrl: avatarPublicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        finalAvatarUrl = avatarPublicUrl;
      }

      const updateData: any = {
        bvn: profile.bvn,
        nin: profile.nin,
        gov_id_url: finalGovIdUrl,
        utility_bill_url: finalUtilityBillUrl,
        avatar_url: finalAvatarUrl,
        gov_id_status: "pending",
        kyc_country: profile.kyc_country,
        kyc_state: profile.kyc_state,
        kyc_street: profile.kyc_street,
        kyc_landmark: profile.kyc_landmark,
        kyc_latitude: null,
        kyc_longitude: null,
        kyc_last_confirmed_at: new Date().toISOString()
      };

      if (fileInputRef.current?.files?.[0] || profile.nin_status === "not_uploaded") {
        updateData.nin_status = "pending";
      }
      if (utilityBillInputRef.current?.files?.[0] || profile.utility_bill_status === "not_uploaded") {
        updateData.utility_bill_status = "pending";
      }
      if (kycLivePhoto || profile.avatar_status === "not_uploaded") {
        updateData.avatar_status = "pending";
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;
      
      // Update Auth Metadata too
      await supabase.auth.updateUser({
        data: { avatar_url: finalAvatarUrl },
      });toast.success("KYC details submitted successfully!");
      
      await notificationDispatcher.sendAlert({
        userId: user.id,
        email: profile.email,
        type: "profile",
        title: "KYC Details Submitted",
        message: "Your complete KYC identity verification details have been submitted for admin review.",
      });

      // Log Activity
      supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "KYC_UPLOAD",
        details: { status: "pending" },
      });

      setPreviewUrl(null);
      await fetchProfile();
      await checkActiveDebts();
    } catch (err: any) {
      console.error("KYC Submit Error:", err);
      toast.error(err.message || "Failed to submit KYC details");
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
              <CardDescription className="dark:text-gray-400">
                Update your personal details here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {(profile.full_name?.[0] || "U").toUpperCase()}
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
                <Label htmlFor="name" className="dark:text-gray-300">
                  Full Name
                </Label>
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
                <Label htmlFor="email" className="dark:text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone" className="dark:text-gray-300">
                  Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="pl-10 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    placeholder="+234..."
                  />
                </div>
                <p className="text-[10px] text-gray-500">
                  Can be used for login alongside your email.
                </p>
              </div>

              {/* NAME HISTORY SECTION */}
              {nameHistory.length > 0 && (
                <div className="rounded-md border bg-gray-50 p-4 dark:bg-gray-900/50 dark:border-gray-700">
                  <h4 className="flex items-center text-sm font-semibold mb-3 dark:text-gray-300">
                    <History className="w-4 h-4 mr-2" /> Name Change History
                  </h4>
                  <div className="space-y-2">
                    {nameHistory.map((record) => (
                      <div
                        key={record.id}
                        className="text-xs grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 border-b pb-2 last:border-0 last:pb-0 dark:border-gray-700"
                      >
                        <div>
                          <span className="block text-gray-400 dark:text-gray-500">From</span>
                          <span className="font-medium">{record.old_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-gray-400 dark:text-gray-500">To</span>
                          <span className="font-medium">{record.new_name}</span>
                          <div className="text-[10px] opacity-70 mt-1">
                            {new Date(record.changed_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={updateProfile}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 dark:text-white"
              >
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
                <Badge
                  variant={
                    profile.gov_id_status === "verified"
                      ? "default"
                      : profile.gov_id_status === "pending"
                        ? "secondary"
                        : "outline"
                  }
                  className={
                    profile.gov_id_status === "verified"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : profile.gov_id_status === "pending"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  }
                >
                  {profile.gov_id_status === "not_uploaded"
                    ? "Not Uploaded"
                    : profile.gov_id_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {kycLocked && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-md text-sm flex gap-2 dark:bg-yellow-900/20 dark:text-yellow-300">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-semibold">KYC Profile Locked</p>
                    <p>Your profile is locked due to active loans or Ajo plans. Please contact an admin to request edit privileges.</p>
                  </div>
                </div>
              )}

              {profile.gov_id_status !== "not_uploaded" && !isEditingKyc ? (
                <div className="space-y-4">
                  <div
                    className={`border rounded-lg p-4 flex items-center gap-3 ${
                      profile.gov_id_status === "verified"
                        ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                        : "bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30"
                    }`}
                  >
                    {profile.gov_id_status === "verified" ? (
                      <FileCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                    ) : (
                      <ShieldCheck className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                    )}
                    <div className="flex-1">
                      <h4
                        className={`font-semibold ${
                          profile.gov_id_status === "verified"
                            ? "text-emerald-800 dark:text-emerald-400"
                            : profile.gov_id_status === "rejected"
                            ? "text-rose-800 dark:text-rose-400"
                            : "text-yellow-800 dark:text-yellow-400"
                        }`}
                      >
                        {profile.gov_id_status === "verified"
                          ? "Identity Verified"
                          : profile.gov_id_status === "rejected"
                          ? "Verification Rejected"
                          : "Verification Pending"}
                      </h4>
                      <p
                        className={`text-sm ${
                          profile.gov_id_status === "verified"
                            ? "text-emerald-700/80 dark:text-emerald-500/80"
                            : profile.gov_id_status === "rejected"
                            ? "text-rose-700/80 dark:text-rose-500/80"
                            : "text-yellow-700/80 dark:text-yellow-500/80"
                        }`}
                      >
                        {profile.gov_id_status === "verified"
                          ? "You have full access to loan applications and premium features."
                          : profile.gov_id_status === "rejected"
                          ? "One or more of your uploaded KYC documents was rejected by the admin. Please edit and upload valid documents."
                          : "Your details are under review by our admin team. This usually takes 24 hours."}
                      </p>
                    </div>
                  </div>
 
                  <div className="grid gap-4 md:grid-cols-2 p-4 border rounded-lg dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10">
                    <div>
                      <span className="text-xs text-gray-400 block">BVN</span>
                      <span className="text-sm font-medium dark:text-white">{profile.bvn || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">NIN</span>
                      <span className="text-sm font-medium dark:text-white">{profile.nin || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">Country</span>
                      <span className="text-sm font-medium dark:text-white">{profile.kyc_country || "Nigeria"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">State</span>
                      <span className="text-sm font-medium dark:text-white">{profile.kyc_state || "Lagos"}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-xs text-gray-400 block">Street Address</span>
                      <span className="text-sm font-medium dark:text-white">{profile.kyc_street || "N/A"}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-xs text-gray-400 block">Landmark</span>
                      <span className="text-sm font-medium dark:text-white">{profile.kyc_landmark || "N/A"}</span>
                    </div>
                    
                    <div className="md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Statuses</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-center">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">NIN Status</span>
                          <Badge variant="outline" className={`text-[8px] mt-1.5 px-1.5 py-0 h-4 uppercase font-semibold ${
                            profile.nin_status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            profile.nin_status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>{profile.nin_status || "pending"}</Badge>
                        </div>
                        <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-center">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Utility Status</span>
                          <Badge variant="outline" className={`text-[8px] mt-1.5 px-1.5 py-0 h-4 uppercase font-semibold ${
                            profile.utility_bill_status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            profile.utility_bill_status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>{profile.utility_bill_status || "pending"}</Badge>
                        </div>
                        <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-center">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">Selfie Photo</span>
                          <Badge variant="outline" className={`text-[8px] mt-1.5 px-1.5 py-0 h-4 uppercase font-semibold ${
                            profile.avatar_status === "verified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            profile.avatar_status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>{profile.avatar_status || "pending"}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2 w-full">
                      {profile.gov_id_url && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" /> View NIN Document
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submitted Identity Document</DialogTitle>
                              <DialogDescription>
                                Review your uploaded government-issued ID for verification.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="p-4 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                              <img
                                src={
                                  profile.gov_id_url?.includes("mock")
                                    ? "https://placehold.co/600x400/png?text=Government+ID"
                                    : profile.gov_id_url
                                }
                                alt="Submitted ID"
                                className="max-w-full h-auto rounded shadow-sm"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {profile.utility_bill_url && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" /> View Utility Bill / Signage
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submitted Utility Bill / Signage</DialogTitle>
                              <DialogDescription>
                                Review your uploaded utility bill or business signage.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="p-4 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                              <img
                                src={profile.utility_bill_url}
                                alt="Submitted Utility Bill"
                                className="max-w-full h-auto rounded shadow-sm"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingKyc(true)}
                      disabled={kycLocked}
                      className="w-full"
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Edit KYC Details
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex gap-2 dark:bg-blue-900/20 dark:text-blue-300">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold block mb-1">
                        Mandatory Security KYC
                      </span>
                      Providing your identity and location details is mandatory for loan eligibility and payout settlement.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="bvn" className="dark:text-gray-300">Bank Verification Number (BVN)</Label>
                      <Input
                        id="bvn"
                        value={profile.bvn}
                        onChange={(e) => setProfile({ ...profile, bvn: e.target.value })}
                        disabled={kycLocked || uploadingId}
                        placeholder="11 digits"
                        maxLength={11}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nin" className="dark:text-gray-300">National Identification Number (NIN)</Label>
                      <Input
                        id="nin"
                        value={profile.nin}
                        onChange={(e) => setProfile({ ...profile, nin: e.target.value })}
                        disabled={kycLocked || uploadingId}
                        placeholder="11 digits"
                        maxLength={11}
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="kyc_country" className="dark:text-gray-300">Country of Residence</Label>
                      <Input
                        id="kyc_country"
                        value="Nigeria"
                        disabled
                        className="bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="kyc_state" className="dark:text-gray-300">State of Residence</Label>
                      <select
                        id="kyc_state"
                        value={profile.kyc_state}
                        onChange={(e) => setProfile({ ...profile, kyc_state: e.target.value })}
                        disabled={kycLocked || uploadingId}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="Lagos">Lagos</option>
                        <option value="Abuja">Abuja</option>
                        <option value="Kano">Kano</option>
                        <option value="Kaduna">Kaduna</option>
                        <option value="Oyo">Oyo</option>
                        <option value="Rivers">Rivers</option>
                        <option value="Anambra">Anambra</option>
                        <option value="Enugu">Enugu</option>
                        <option value="Edo">Edo</option>
                        <option value="Delta">Delta</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 grid gap-2">
                      <Label htmlFor="kyc_street" className="dark:text-gray-300">Street Address</Label>
                      <Input
                        id="kyc_street"
                        value={profile.kyc_street}
                        onChange={(e) => setProfile({ ...profile, kyc_street: e.target.value })}
                        disabled={kycLocked || uploadingId}
                        placeholder="e.g. 12 Marina Street"
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2 grid gap-2">
                      <Label htmlFor="kyc_landmark" className="dark:text-gray-300">Closest Landmark</Label>
                      <Input
                        id="kyc_landmark"
                        value={profile.kyc_landmark}
                        onChange={(e) => setProfile({ ...profile, kyc_landmark: e.target.value })}
                        disabled={kycLocked || uploadingId}
                        placeholder="e.g. Opposite Union Bank"
                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-2 grid gap-2">
                      <Label className="dark:text-gray-300">Mandatory Live Photo Capture</Label>
                      <div className="w-full flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/10">
                        {isCapturingKyc ? (
                          <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center">
                            <video
                              ref={videoKycRef}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />

                            {/* Action buttons */}
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
                              <Button
                                type="button"
                                size="sm"
                                onClick={captureKycPhoto}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-6"
                              >
                                Capture Photo
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={stopKycCamera}
                                className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 font-bold rounded-lg"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : kycLivePhoto ? (
                          <div className="relative w-full max-w-md aspect-video bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                            <img
                              src={kycLivePhoto}
                              alt="Live Photo Selfie"
                              className="w-full h-full object-cover scale-x-[-1]"
                            />
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                              <Button
                                type="button"
                                size="sm"
                                onClick={startKycCamera}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                              >
                                Retake Photo
                              </Button>
                            </div>
                          </div>
                        ) : kycCameraError ? (
                          /* ── Camera error / permission panel ────────────────────── */
                          <div className="w-full rounded-xl border border-slate-700 bg-slate-900 p-5 flex flex-col items-center gap-4 text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              kycCameraError === "no_camera" ? "bg-red-500/15" : "bg-amber-500/15"
                            }`}>
                              <Camera className={`w-6 h-6 ${
                                kycCameraError === "no_camera" ? "text-red-400" : "text-amber-400"
                              }`} />
                            </div>

                            {kycCameraError === "denied" || kycCameraError === "blocked" ? (
                              <>
                                <div>
                                  <p className="text-sm font-bold text-white mb-1">Camera Access Blocked</p>
                                  <p className="text-xs text-slate-400">
                                    Your browser is blocking camera access. Follow the steps below to allow it:
                                  </p>
                                </div>
                                <ol className="text-xs text-slate-300 text-left space-y-2 w-full list-none">
                                  {getKycCameraUnblockSteps().map((step, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </>
                            ) : kycCameraError === "no_camera" ? (
                              <div>
                                <p className="text-sm font-bold text-white mb-1">No Camera Found</p>
                                <p className="text-xs text-slate-400">No camera device was detected. Please connect a camera and try again.</p>
                              </div>
                            ) : kycCameraError === "in_use" ? (
                              <div>
                                <p className="text-sm font-bold text-white mb-1">Camera In Use</p>
                                <p className="text-xs text-slate-400">Your camera is currently in use by another app or tab. Please close it and try again.</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm font-bold text-white mb-1">Camera Unavailable</p>
                                <p className="text-xs text-slate-400">An unexpected error occurred. Please ensure your camera is connected and not blocked.</p>
                              </div>
                            )}

                            <Button
                              type="button"
                              size="sm"
                              onClick={startKycCamera}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full max-w-md aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4">
                            {profile.avatar_url ? (
                              <div className="text-center space-y-2">
                                <img
                                  src={profile.avatar_url}
                                  alt="Current Profile Pic"
                                  className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-emerald-505"
                                />
                                <p className="text-xs text-slate-500 font-semibold">Existing profile picture loaded</p>
                              </div>
                            ) : (
                              <Camera className="w-8 h-8 text-slate-400 mb-2" />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={startKycCamera}
                              disabled={kycLocked || uploadingId}
                              className="bg-white hover:bg-slate-50 text-emerald-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-400 font-bold mt-2"
                            >
                              Start Selfie Camera
                            </Button>
                          </div>
                        )}
                        <canvas ref={canvasKycRef} className="hidden" />
                      </div>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    disabled={kycLocked || uploadingId}
                  />

                  <div className="grid gap-2">
                    <Label className="dark:text-gray-300">NIN Slip Document Image</Label>
                    <div
                      onClick={() => !kycLocked && !uploadingId && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        kycLocked ? "cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-800/20" : ""
                      } ${
                        previewUrl
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 cursor-pointer"
                      }`}
                    >
                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-48 mx-auto rounded shadow-sm"
                          />
                          {!kycLocked && (
                            <Button
                              size="sm"
                              type="button"
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
                          )}
                        </div>
                      ) : profile.gov_id_url ? (
                        <div className="relative">
                          <img
                            src={profile.gov_id_url}
                            alt="Submitted ID"
                            className="max-h-48 mx-auto rounded shadow-sm"
                          />
                          {!kycLocked && (
                            <div className="mt-2 text-xs text-gray-500">
                              Click to upload a new NIN Slip image
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-800">
                            <Upload className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Click to upload NIN Slip
                            </span>{" "}
                            or drag and drop
                            <p className="text-xs text-gray-400 mt-1">
                              Image or PDF (Max 5MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={utilityBillInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={handleUtilityBillSelect}
                    disabled={kycLocked || uploadingId}
                  />

                  <div className="grid gap-2">
                    <Label className="dark:text-gray-300">Utility Bill or Business Signage Image</Label>
                    <div
                      onClick={() => !kycLocked && !uploadingId && utilityBillInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        kycLocked ? "cursor-not-allowed opacity-50 bg-gray-100 dark:bg-gray-800/20" : ""
                      } ${
                        utilityBillPreview
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 cursor-pointer"
                      }`}
                    >
                      {utilityBillPreview ? (
                        <div className="relative">
                          <img
                            src={utilityBillPreview}
                            alt="Utility Bill Preview"
                            className="max-h-48 mx-auto rounded shadow-sm"
                          />
                          {!kycLocked && (
                            <Button
                              size="sm"
                              type="button"
                              variant="secondary"
                              className="absolute top-2 right-2 opacity-80 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUtilityBillPreview(null);
                                if (utilityBillInputRef.current) utilityBillInputRef.current.value = "";
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ) : profile.utility_bill_url ? (
                        <div className="relative">
                          <img
                            src={profile.utility_bill_url}
                            alt="Submitted Utility Bill"
                            className="max-h-48 mx-auto rounded shadow-sm"
                          />
                          {!kycLocked && (
                            <div className="mt-2 text-xs text-gray-500">
                              Click to upload a new Utility Bill or Business Signage image
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center dark:bg-gray-800">
                            <Upload className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              Click to upload Utility Bill or Business Signage
                            </span>{" "}
                            or drag and drop
                            <p className="text-xs text-gray-400 mt-1">
                              Showing User's Name and address (Max 5MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Button
                      onClick={handleKycSubmit}
                      disabled={kycLocked || uploadingId}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {uploadingId ? "Submitting..." : "Submit KYC Details"}
                    </Button>
                    {profile.gov_id_status !== "not_uploaded" && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingKyc(false);
                          setPreviewUrl(null);
                          setUtilityBillPreview(null);
                        }}
                        className="w-full"
                      >
                        Cancel Editing
                      </Button>
                    )}
                  </div>
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
                  <p className="text-sm text-gray-500 italic dark:text-gray-400">
                    No active bank accounts.
                  </p>
                )}
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700"
                  >
                    {editingBankId === account.id ? (
                      <div className="space-y-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <Input
                            value={editBankData.bank_name}
                            onChange={(e) =>
                              setEditBankData({ ...editBankData, bank_name: e.target.value })
                            }
                            placeholder="Bank Name"
                            className="dark:bg-gray-800 dark:border-gray-700"
                          />
                          <Input
                            value={editBankData.account_number}
                            onChange={(e) =>
                              setEditBankData({ ...editBankData, account_number: e.target.value })
                            }
                            placeholder="Account Number"
                            className="dark:bg-gray-800 dark:border-gray-700"
                          />
                          <div className="md:col-span-2">
                            <Input
                              value={editBankData.account_name}
                              onChange={(e) =>
                                setEditBankData({ ...editBankData, account_name: e.target.value })
                              }
                              placeholder="Account Name (Must match Profile)"
                              className="dark:bg-gray-800 dark:border-gray-700"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={cancelEditing}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveEditedBank}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Check className="w-4 h-4 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full dark:bg-indigo-900/30 dark:text-indigo-400">
                            <Banknote className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {account.bank_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {account.account_name} &bull; {account.account_number}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {nameHistory.length === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(account)}
                              className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBankAccount(account.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
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
                  <h4 className="text-sm font-semibold mb-3 dark:text-gray-300 text-yellow-600 dark:text-yellow-500">
                    Pending Approvals
                  </h4>
                  <div className="space-y-2">
                    {bankRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30"
                      >
                        <div className="text-sm">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {req.bank_name}
                          </p>
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
                    <Label htmlFor="bank_name" className="dark:text-gray-300">
                      Bank Name
                    </Label>
                    <Input
                      id="bank_name"
                      placeholder="e.g. Chase, Wells Fargo"
                      value={newBank.bank_name}
                      onChange={(e) => setNewBank({ ...newBank, bank_name: e.target.value })}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account_number" className="dark:text-gray-300">
                      Account Number
                    </Label>
                    <Input
                      id="account_number"
                      placeholder="Digits only"
                      value={newBank.account_number}
                      onChange={(e) => setNewBank({ ...newBank, account_number: e.target.value })}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2 grid gap-2">
                    <Label htmlFor="account_name" className="dark:text-gray-300">
                      Account Name
                    </Label>
                    <Input
                      id="account_name"
                      placeholder="Must match Profile Name exactly"
                      value={newBank.account_name}
                      onChange={(e) => setNewBank({ ...newBank, account_name: e.target.value })}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddBank}
                  disabled={addingBank}
                  className="mt-4 w-full md:w-auto dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700"
                >
                  {addingBank ? (
                    "Processing..."
                  ) : nameHistory.length > 0 ? (
                    "Request Approval"
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Add Bank Account
                    </>
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
              <CardDescription className="dark:text-gray-400">
                Manage your password and security settings.
              </CardDescription>
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
                  <Button variant="outline" onClick={() => setShowEmailForm(true)}>
                    Change Email
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <h4 className="font-semibold dark:text-white flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Change Email Address
                  </h4>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      For security, a confirmation link will be sent to BOTH your old and new email
                      addresses. All links must be confirmed before the change takes effect.
                    </span>
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
                    <Label className="dark:text-white text-sm font-medium">
                      Confirm with Password
                    </Label>
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
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowEmailForm(false);
                          setNewEmail("");
                          setEmailPassword("");
                        }}
                      >
                        Cancel
                      </Button>
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
                  <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                    Change Password
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                  <div className="grid gap-2">
                    <Label className="dark:text-white text-sm font-medium">Current Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter your current password"
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, current_password: e.target.value })
                      }
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
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, new_password: e.target.value })
                          }
                          className="dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="dark:text-white text-sm font-medium">
                          Confirm New Password
                        </Label>
                        <Input
                          type="password"
                          placeholder="Confirm your new password"
                          value={passwordData.confirm_password}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, confirm_password: e.target.value })
                          }
                          className="dark:bg-gray-800 dark:border-gray-700"
                        />
                      </div>

                      <PasswordStrength
                        feedback={passFeedback}
                        passwordLength={passwordData.new_password.length}
                      />

                      <div className="flex gap-2 justify-end pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setCodeRequested(false);
                            setOtpCode("");
                          }}
                        >
                          Cancel
                        </Button>
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

          {profile.gov_id_status !== "verified" ? (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-400">
                  <p className="font-bold mb-1">KYC Verification Required</p>
                  <p>
                    Manual recovery is only available to identity-verified users. Please complete
                    your KYC verification first.
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setShowManualChange(false)}>
                Close
              </Button>
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
                      <img
                        src={livePhoto}
                        alt="Live Capture"
                        className="rounded-lg w-full h-auto shadow-md"
                      />
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
                <p>
                  <strong>Note:</strong> This process is manually reviewed by our security team. It
                  may take up to 48 hours for your request to be processed.
                </p>
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

      <ActionConfirmModal
        isOpen={isBankDeleteConfirmOpen}
        onOpenChange={setIsBankDeleteConfirmOpen}
        onConfirm={confirmDeleteBankAccount}
        title="Remove Bank Account"
        description="Are you sure you want to remove this bank account? This action cannot be undone."
        confirmText="Remove Account"
        variant="destructive"
      />
    </div>
  );
}
