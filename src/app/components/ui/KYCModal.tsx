import React, { useState, useEffect } from "react";

import { ShieldCheck, Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/app/context/AuthContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";
import { validateFile } from "@/lib/validation";

import { Button } from "./button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

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
  blurThreshold = 5,
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
    return {
      ok: false,
      reason: "The image is overexposed / too bright. Please reduce glare and try again.",
    };
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
        -grey[idx - width] - grey[idx - 1] + 4 * grey[idx] - grey[idx + 1] - grey[idx + width];
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
      reason: "The image appears very blurry. Please ensure the document is clear and well-lit.",
    };
  }

  return { ok: true };
}

/**
 * Loads a File into an off-screen canvas and runs analyseImageQuality.
 * Returns the same { ok, reason } result.
 */
async function validateDocumentQuality(file: File): Promise<{ ok: boolean; reason?: string }> {
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
        if (!ctx) {
          resolve({ ok: true });
          return;
        }
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
  "Lagos",
  "Abuja",
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

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
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [utilityFilePreview, setUtilityFilePreview] = useState<string | null>(null);

  useEffect(() => {
    // Component mounted
  }, []);

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
        toast.error(
          "The uploaded file is too small or blurry. Please upload a clear NIN document image (at least 50KB).",
        );
        return;
      }
      // Quality check — blur / brightness
      const quality = await validateDocumentQuality(selectedFile);
      if (!quality.ok) {
        toast.error(`NIN Slip rejected: ${quality.reason}`);
        return;
      }
      setFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setFilePreview(null);
      }
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
        toast.error(
          "The uploaded file is too small or blurry. Please upload a clear utility bill image (at least 50KB).",
        );
        return;
      }
      // Quality check — blur / brightness
      const quality = await validateDocumentQuality(selectedFile);
      if (!quality.ok) {
        toast.error(`Utility Bill rejected: ${quality.reason}`);
        return;
      }
      setUtilityFile(selectedFile);
      if (selectedFile.type.startsWith("image/")) {
        setUtilityFilePreview(URL.createObjectURL(selectedFile));
      } else {
        setUtilityFilePreview(null);
      }
      toast.success("Utility bill looks clear ✓");
    }
  };

  async function fetchExistingKYC() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "bvn, nin, kyc_country, kyc_state, kyc_street, kyc_landmark, utility_bill_url, avatar_url",
        )
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
      }
    } catch (err) {
      console.error("Error loading profile KYC:", err);
    }
  }

  // Load existing profile details if mode is confirm
  useEffect(() => {
    if (isOpen && user?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchExistingKYC();
    }
  }, [isOpen, user?.id]);

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

      // Live Photo is now optional

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

        const { error: uploadError } = await supabase.storage.from("kyc").upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("kyc").getPublicUrl(filePath);

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

          const {
            data: { publicUrl: utilPublicUrl },
          } = supabase.storage.from("kyc").getPublicUrl(utilFilePath);

          finalUtilityBillUrl = utilPublicUrl;
        }

        // Removed Live Photo upload

        // 4. Update profiles in Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            bvn: bvn,
            nin: nin,
            gov_id_url: publicUrl,
            utility_bill_url: finalUtilityBillUrl,
            gov_id_status: "pending",
            nin_status: "pending",
            utility_bill_status: "pending",
            kyc_country: country,
            kyc_state: state,
            kyc_street: street,
            kyc_landmark: landmark,
            kyc_latitude: null,
            kyc_longitude: null,
            kyc_last_confirmed_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Notify user — submission received, pending admin review
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email || "",
          type: "profile",
          title: "KYC Documents Submitted",
          message:
            "Your KYC documents (NIN slip and utility bill) have been submitted and are pending admin review. You will be notified once each document is approved or if any action is required.",
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

      // Live photo is now optional

      setLoading(true);
      try {
        // Removed Live Photo upload

        const { error } = await supabase
          .from("profiles")
          .update({
            kyc_latitude: null,
            kyc_longitude: null,
            kyc_last_confirmed_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (error) throw error;

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
              : "Verify your location and check that your address details are current."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {mode === "full" ? (
            <>
              {/* Full Mode Inputs */}
              <div className="grid gap-1.5">
                <Label
                  htmlFor="bvn"
                  className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  Bank Verification Number (BVN)
                </Label>
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
                <Label
                  htmlFor="nin"
                  className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  National Identity Number (NIN)
                </Label>
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
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Upload NIN Slip / Card Image
                </Label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    required={!file}
                  />
                  {filePreview ? (
                    <div className="w-full relative rounded-xl overflow-hidden aspect-video">
                      <img
                        src={filePreview}
                        alt="NIN Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-bold text-sm">Click to replace</p>
                      </div>
                    </div>
                  ) : file ? (
                    <div className="space-y-1">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">PDF Document Selected</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Click to select NIN slip image
                      </p>
                      <p className="text-[10px] text-slate-400">
                        JPEG, PNG or PDF format up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Upload Utility Bill or Business Signage Image
                </Label>
                <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleUtilityFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    required={!existingUtilityBillUrl && !utilityFile}
                  />
                  {utilityFilePreview || (existingUtilityBillUrl && !utilityFile) ? (
                    <div className="w-full relative rounded-xl overflow-hidden aspect-video">
                      <img
                        src={utilityFilePreview || existingUtilityBillUrl}
                        alt="Utility Bill Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white font-bold text-sm">Click to replace</p>
                      </div>
                    </div>
                  ) : utilityFile ? (
                    <div className="space-y-1">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {utilityFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400">PDF Document Selected</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Click to select utility bill or signage
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Showing User's Name and Address (Max 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Country
                  </Label>
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
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    State
                  </Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIGERIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label
                  htmlFor="street"
                  className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  Street Address
                </Label>
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
                <Label
                  htmlFor="landmark"
                  className="text-xs font-bold text-slate-400 uppercase tracking-wider"
                >
                  Closest Landmark
                </Label>
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
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Saved Address Details
                </p>
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
                <Label
                  htmlFor="address-confirm"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none leading-relaxed"
                >
                  I confirm that my residential address and closest landmark listed above are still
                  correct and current.
                </Label>
              </div>
            </>
          )}

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
              disabled={loading || (mode === "confirm" && !addressConfirmed)}
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
