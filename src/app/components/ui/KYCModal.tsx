import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, MapPin, Upload, Loader2, CheckCircle2, AlertTriangle, Navigation, X, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { validateFile } from "@/lib/validation";
import { notificationDispatcher } from "@/lib/notificationDispatcher";

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

/**
 * Loads a File into an off-screen canvas and runs analyseImageQuality.
 * Returns the same { ok, reason } result.
 */
async function validateDocumentQuality(
  file: File
): Promise<{ ok: boolean; reason?: string }> {
  return new Promise((resolve) => {
    // Only validate image files (not PDFs)
    if (!file.type.startsWith("image/")) {
      resolve({ ok: true });
      return;
    }
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

interface KYCModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  mode?: "full" | "confirm";
}

const NIGERIAN_STATES = [
  "Lagos", "Abuja", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", 
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", 
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export function KYCModal({ isOpen, onOpenChange, onSuccess, mode = "full" }: KYCModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Form values
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [utilityFile, setUtilityFile] = useState<File | null>(null);
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("Lagos");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [existingUtilityBillUrl, setExistingUtilityBillUrl] = useState("");
  const [existingAvatarUrl, setExistingAvatarUrl] = useState("");

  // Webcam States
  const [isCapturing, setIsCapturing] = useState(false);
  const [livePhoto, setLivePhoto] = useState("");
  // 'prompt' = first time, 'denied' = user clicked block, 'blocked' = persisted block, 'no_camera' = no device, 'in_use' = busy
  const [cameraError, setCameraError] = useState<"denied" | "blocked" | "no_camera" | "in_use" | "unknown" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);

  /** Fully stops the camera: clears intervals, stops all tracks, nulls srcObject. */
  const releaseCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validation = validateFile(selectedFile, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      });
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }
      if (selectedFile.size < 50 * 1024) {
        toast.error("The uploaded file is too small or blurry. Please upload a clear NIN document image (at least 50KB).");
        return;
      }
      // Quality check — blur / brightness
      const quality = await validateDocumentQuality(selectedFile);
      if (!quality.ok) {
        toast.error(`NIN Slip rejected: ${quality.reason}`);
        return;
      }
      setFile(selectedFile);
      toast.success("NIN slip looks clear ✓");
    }
  };

  const handleUtilityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validation = validateFile(selectedFile, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      });
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }
      if (selectedFile.size < 50 * 1024) {
        toast.error("The uploaded file is too small or blurry. Please upload a clear utility bill image (at least 50KB).");
        return;
      }
      // Quality check — blur / brightness
      const quality = await validateDocumentQuality(selectedFile);
      if (!quality.ok) {
        toast.error(`Utility Bill rejected: ${quality.reason}`);
        return;
      }
      setUtilityFile(selectedFile);
      toast.success("Utility bill looks clear ✓");
    }
  };

  // Release camera whenever modal closes — useRef values are never stale
  useEffect(() => {
    if (!isOpen) {
      releaseCamera();
      setLivePhoto("");
    }
  }, [isOpen]);

  // Release camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current)     streamRef.current.getTracks().forEach(t => t.stop());
      if (videoRef.current)      videoRef.current.srcObject = null;
    };
  }, []);

  // Load existing profile details if mode is confirm
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchExistingKYC();
    }
  }, [isOpen, user?.id]);

  async function fetchExistingKYC() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("bvn, nin, kyc_country, kyc_state, kyc_street, kyc_landmark, utility_bill_url, avatar_url")
        .eq("id", user?.id)
        .single();
      
      if (data && !error) {
        if (data.bvn) setBvn(data.bvn);
        if (data.nin) setNin(data.nin);
        if (data.kyc_country) setCountry(data.kyc_country);
        if (data.kyc_state) setState(data.kyc_state);
        if (data.kyc_street) setStreet(data.kyc_street);
        if (data.kyc_landmark) setLandmark(data.kyc_landmark);
        if (data.utility_bill_url) setExistingUtilityBillUrl(data.utility_bill_url);
        if (data.avatar_url) setExistingAvatarUrl(data.avatar_url);
      }
    } catch (err) {
      console.error("Error loading profile KYC:", err);
    }
  }

  // ─── Camera permission + startup helpers ────────────────────────────────

  /** Detects the user's browser for tailored unblock instructions. */
  const getBrowserName = () => {
    const ua = navigator.userAgent;
    if (/Firefox\//.test(ua)) return "firefox";
    if (/Edg\//.test(ua))     return "edge";
    if (/OPR\/|Opera\//.test(ua)) return "opera";
    if (/Chrome\//.test(ua)) return "chrome";
    if (/Safari\//.test(ua)) return "safari";
    return "other";
  };

  /** Returns ordered unblock steps for the detected browser / platform. */
  const getCameraUnblockSteps = (): string[] => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) return [
      "Open your device Settings",
      "Find your browser app (Chrome, Safari, etc.)",
      "Tap Permissions → Camera → Allow",
      "Return here and tap \"Try Again\"",
    ];
    const b = getBrowserName();
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

  /** Classifies a getUserMedia error and sets cameraError state. */
  const handleCameraError = (err: unknown) => {
    const name = (err as any)?.name ?? "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setCameraError("denied");
    } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setCameraError("no_camera");
    } else if (name === "NotReadableError" || name === "TrackStartError") {
      setCameraError("in_use");
    } else {
      setCameraError("unknown");
    }
    releaseCamera();
  };

  const startCamera = async () => {
    releaseCamera();
    setCameraError(null);
    setIsCapturing(true);
    setLivePhoto("");

    // ── 1. Check permission state first (avoids instantly-failing getUserMedia) ──
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (perm.state === "denied") {
          setCameraError("blocked"); // Permanently blocked in browser settings
          releaseCamera();
          return;
        }
        // React to user changing permission while the panel is open
        perm.onchange = () => {
          if (perm.state === "granted") {
            setCameraError(null);
            startCamera();
          }
        };
      } catch {
        // Permissions API not supported — fall through and let getUserMedia handle it
      }
    }

    // ── 2. Request stream with ideal constraints, fall back to plain video if they fail ──
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch (err: unknown) {
      const n = (err as any)?.name ?? "";
      if (n === "OverconstrainedError" || n === "ConstraintNotSatisfiedError") {
        // Relax constraints — try plain video (handles unusual cameras)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        } catch (fallbackErr) {
          try {
            // Last resort: no constraints at all
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (lastErr) {
            handleCameraError(lastErr);
            return;
          }
        }
      } else {
        handleCameraError(err);
        return;
      }
    }

    if (!stream) { handleCameraError(new Error("No stream")); return; }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      // Mirror the video horizontally for a more natural selfie experience
      videoRef.current.style.transform = "scaleX(-1)";
    }
  };

  const stopCamera = () => releaseCamera();

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Ensure the canvas capture respects the mirrored video
        context.translate(canvasRef.current.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(videoRef.current, 0, 0);

        const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9);
        setLivePhoto(dataUrl);
        stopCamera();
        toast.success("Photo captured successfully ✓");
      }
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (mode === "full") {
      // Validate BVN
      if (!/^\d{11}$/.test(bvn)) {
        toast.error("BVN must be exactly 11 digits (numbers only)");
        return;
      }

      // Validate NIN
      if (!/^\d{11}$/.test(nin)) {
        toast.error("NIN must be exactly 11 digits (numbers only)");
        return;
      }

      // Validate Street & Landmark
      if (!street.trim() || !landmark.trim()) {
        toast.error("Please fill in both the street address and closest landmark");
        return;
      }

      // Validate Live Photo
      if (!livePhoto) {
        toast.error("Please capture a live photo profile picture");
        return;
      }

      // Validate NIN file upload
      if (!file) {
        toast.error("Please upload your NIN Slip document image");
        return;
      }

      // Validate Utility bill file upload
      if (!utilityFile && !existingUtilityBillUrl) {
        toast.error("Please upload your Utility Bill or Business Signage image");
        return;
      }

      setLoading(true);
      try {
        // 1. Upload NIN Slip
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-nin-${Date.now()}.${fileExt}`;
        const filePath = `kyc/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("kyc")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("kyc")
          .getPublicUrl(filePath);

        // 2. Upload Utility Bill
        let finalUtilityBillUrl = existingUtilityBillUrl;
        if (utilityFile) {
          const utilExt = utilityFile.name.split(".").pop();
          const utilFileName = `${user.id}-utility-${Date.now()}.${utilExt}`;
          const utilFilePath = `kyc/${utilFileName}`;

          const { error: utilUploadError } = await supabase.storage
            .from("kyc")
            .upload(utilFilePath, utilityFile);

          if (utilUploadError) throw utilUploadError;

          const { data: { publicUrl: utilPublicUrl } } = supabase.storage
            .from("kyc")
            .getPublicUrl(utilFilePath);

          finalUtilityBillUrl = utilPublicUrl;
        }

        // 3. Upload Live Photo
        let finalAvatarUrl = existingAvatarUrl;
        if (livePhoto) {
          const blob = dataURLtoBlob(livePhoto);
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

        // 4. Update profiles in Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            bvn: bvn,
            nin: nin,
            gov_id_url: publicUrl,
            utility_bill_url: finalUtilityBillUrl,
            avatar_url: finalAvatarUrl,
            gov_id_status: "pending",
            nin_status: "pending",
            avatar_status: "pending",
            utility_bill_status: "pending",
            kyc_country: country,
            kyc_state: state,
            kyc_street: street,
            kyc_landmark: landmark,
            kyc_latitude: null,
            kyc_longitude: null,
            kyc_last_confirmed_at: new Date().toISOString()
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Update auth metadata
        await supabase.auth.updateUser({
          data: { avatar_url: finalAvatarUrl }
        });

        // Notify user — submission received, pending admin review
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email || "",
          type: "profile",
          title: "KYC Documents Submitted",
          message:
            "Your KYC documents (NIN slip, selfie photo, and utility bill) have been submitted and are pending admin review. You will be notified once each document is approved or if any action is required.",
        });

        toast.success("KYC submitted successfully! Pending admin verification.");
        onSuccess();
        onOpenChange(false);
      } catch (err: any) {
        console.error("KYC Submit Error:", err);
        toast.error(err.message || "Failed to submit KYC details");
      } finally {
        setLoading(false);
      }
    } else {
      // Confirm Mode (subsequent updates)
      if (!addressConfirmed) {
        toast.error("Please confirm that your address details are still correct");
        return;
      }

      if (!livePhoto) {
        toast.error("Please capture a live photo to confirm your identity");
        return;
      }

      setLoading(true);
      try {
        // 1. Upload new Live Photo
        const blob = dataURLtoBlob(livePhoto);
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

        const { error } = await supabase
          .from("profiles")
          .update({
            avatar_url: avatarPublicUrl,
            kyc_latitude: null,
            kyc_longitude: null,
            kyc_last_confirmed_at: new Date().toISOString()
          })
          .eq("id", user.id);

        if (error) throw error;

        // Update auth metadata
        await supabase.auth.updateUser({
          data: { avatar_url: avatarPublicUrl }
        });

        toast.success("Identity and address confirmed successfully!");
        onSuccess();
        onOpenChange(false);
      } catch (err: any) {
        console.error("Verification Error:", err);
        toast.error(err.message || "Failed to confirm identity");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {mode === "full" ? "Mandatory Security KYC" : "Confirm Address & Location"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            {mode === "full" 
              ? "Complete verification to unlock loans and Ajo plan payouts safely."
              : "Verify your location and check that your address details are current."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {mode === "full" ? (
            <>
              {/* Full Mode Inputs */}
              <div className="grid gap-1.5">
                <Label htmlFor="bvn" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bank Verification Number (BVN)</Label>
                <Input
                  id="bvn"
                  type="text"
                  maxLength={11}
                  placeholder="Enter 11-digit BVN"
                  value={bvn}
                  onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="nin" className="text-xs font-bold text-slate-400 uppercase tracking-wider">National Identity Number (NIN)</Label>
                <Input
                  id="nin"
                  type="text"
                  maxLength={11}
                  placeholder="Enter 11-digit NIN"
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload NIN Slip / Card Image</Label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required={!file}
                  />
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {file ? file.name : "Click to select NIN slip image"}
                    </p>
                    <p className="text-[10px] text-slate-400">JPEG, PNG or PDF format up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upload Utility Bill or Business Signage Image</Label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleUtilityFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required={!existingUtilityBillUrl && !utilityFile}
                  />
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {utilityFile ? utilityFile.name : existingUtilityBillUrl ? "Utility bill uploaded (Click to replace)" : "Click to select utility bill or signage"}
                    </p>
                    <p className="text-[10px] text-slate-400">Showing User's Name and Address (Max 5MB)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nigeria">Nigeria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="street" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Street Address</Label>
                <Input
                  id="street"
                  type="text"
                  placeholder="e.g. 15, Allen Avenue"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="landmark" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Closest Landmark</Label>
                <Input
                  id="landmark"
                  type="text"
                  placeholder="e.g. Opposite GTBank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="rounded-xl"
                  required
                />
              </div>
            </>
          ) : (
            <>
              {/* Confirm Mode / Address Check */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-2.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Address Details</p>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {street}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Landmark: <span className="text-slate-700 dark:text-slate-300">{landmark}</span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Region: {state}, {country}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="address-confirm"
                  checked={addressConfirmed}
                  onChange={(e) => setAddressConfirmed(e.target.checked)}
                  className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <Label htmlFor="address-confirm" className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none leading-relaxed">
                  I confirm that my residential address and closest landmark listed above are still correct and current.
                </Label>
              </div>
            </>
          )}

          {/* Mandatory Live Photo Capture */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mandatory Live Photo Update</p>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Please take a live photo of yourself to update your profile picture and verify your identity.</p>
              </div>
            </div>

            <div className="w-full flex flex-col items-center justify-center gap-3">
              {isCapturing ? (
                <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Action buttons */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
                    <Button
                      type="button"
                      size="sm"
                      onClick={capturePhoto}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg px-6"
                    >
                      Capture Photo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={stopCamera}
                      className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 font-bold rounded-lg"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : livePhoto ? (
                <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img
                    src={livePhoto}
                    alt="Live Photo Selfie"
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                    <Button
                      type="button"
                      size="sm"
                      onClick={startCamera}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                    >
                      Retake Photo
                    </Button>
                  </div>
                </div>
              ) : cameraError ? (
                /* ── Camera error / permission panel ─────────────────────────── */
                <div className="w-full rounded-xl border border-slate-700 bg-slate-900 p-5 flex flex-col items-center gap-4 text-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    cameraError === "no_camera" ? "bg-red-500/15" : "bg-amber-500/15"
                  }`}>
                    <Camera className={`w-6 h-6 ${
                      cameraError === "no_camera" ? "text-red-400" : "text-amber-400"
                    }`} />
                  </div>

                  {/* Title + description */}
                  {cameraError === "denied" || cameraError === "blocked" ? (
                    <>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">Camera Access Blocked</p>
                        <p className="text-xs text-slate-400">
                          Your browser is blocking camera access for this site. Follow the steps below to allow it:
                        </p>
                      </div>
                      <ol className="text-xs text-slate-300 text-left space-y-2 w-full list-none">
                        {getCameraUnblockSteps().map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : cameraError === "no_camera" ? (
                    <div>
                      <p className="text-sm font-bold text-white mb-1">No Camera Found</p>
                      <p className="text-xs text-slate-400">
                        No camera device was detected. Please connect a camera and try again.
                      </p>
                    </div>
                  ) : cameraError === "in_use" ? (
                    <div>
                      <p className="text-sm font-bold text-white mb-1">Camera In Use</p>
                      <p className="text-xs text-slate-400">
                        Your camera is currently being used by another application (e.g. video call, another browser tab). Please close it and try again.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-white mb-1">Camera Unavailable</p>
                      <p className="text-xs text-slate-400">
                        An unexpected error occurred. Please ensure your camera is connected and not blocked, then try again.
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={startCamera}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Try Again
                  </Button>
                </div>
              ) : (
                <div className="w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4">
                  {existingAvatarUrl ? (
                    <div className="text-center space-y-2">
                      <img
                        src={existingAvatarUrl}
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
                    onClick={startCamera}
                    className="bg-white hover:bg-slate-50 text-emerald-600 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-400 font-bold mt-2"
                  >
                    Start Selfie Camera
                  </Button>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !livePhoto || (mode === "confirm" && !addressConfirmed)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Verify & Settle"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
