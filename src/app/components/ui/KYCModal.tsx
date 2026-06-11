import React, { useState, useEffect } from "react";
import { ShieldCheck, MapPin, Upload, Loader2, CheckCircle2, AlertTriangle, Navigation, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { validateFile } from "@/lib/validation";

const reverseGeocode = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`,
      {
        headers: {
          "User-Agent": "MarysThriftFinance/1.0"
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      return data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  } catch (err) {
    console.error("Reverse geocoding error:", err);
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

const verifyAddressMatch = (typedStreet: string, typedState: string, geocodedAddressStr: string) => {
  const normalizedGeocode = geocodedAddressStr.toLowerCase();
  
  let stateMatch = normalizedGeocode.includes(typedState.toLowerCase());
  // Abuja/FCT equivalence
  if (typedState.toLowerCase() === "abuja" || typedState.toLowerCase() === "federal capital territory") {
    if (normalizedGeocode.includes("abuja") || normalizedGeocode.includes("federal capital territory") || normalizedGeocode.includes("fct")) {
      stateMatch = true;
    }
  }
  
  const streetWords = typedStreet
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2 && !["street", "road", "lane", "avenue", "drive", "way", "close", "crescent"].includes(word));

  const streetMatch = streetWords.length === 0 || streetWords.some(word => normalizedGeocode.includes(word));
  
  return stateMatch && streetMatch;
};

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
  "Oyo", "Plateate", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export function KYCModal({ isOpen, onOpenChange, onSuccess, mode = "full" }: KYCModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  // Form values
  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [utilityFile, setUtilityFile] = useState<File | null>(null);
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("Lagos");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState("");
  const [existingUtilityBillUrl, setExistingUtilityBillUrl] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setFile(selectedFile);
    }
  };

  const handleUtilityFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setUtilityFile(selectedFile);
    }
  };

  useEffect(() => {
    if (lat && lng) {
      reverseGeocode(lat, lng).then((address) => {
        setGeocodedAddress(address);
      });
    } else {
      setGeocodedAddress("");
    }
  }, [lat, lng]);

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
        .select("bvn, nin, kyc_country, kyc_state, kyc_street, kyc_landmark, kyc_latitude, kyc_longitude, utility_bill_url")
        .eq("id", user?.id)
        .single();
      
      if (data && !error) {
        if (data.bvn) setBvn(data.bvn);
        if (data.nin) setNin(data.nin);
        if (data.kyc_country) setCountry(data.kyc_country);
        if (data.kyc_state) setState(data.kyc_state);
        if (data.kyc_street) setStreet(data.kyc_street);
        if (data.kyc_landmark) setLandmark(data.kyc_landmark);
        if (data.kyc_latitude) setLat(Number(data.kyc_latitude));
        if (data.kyc_longitude) setLng(Number(data.kyc_longitude));
        if (data.utility_bill_url) setExistingUtilityBillUrl(data.utility_bill_url);
      }
    } catch (err) {
      console.error("Error loading profile KYC:", err);
    }
  }

  // Handle GPS Capture
  const handleGPSCapture = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      toast.warning("Warning: Mobile browsers block geolocation prompts on insecure HTTP connections. Please test via HTTPS or localhost to trigger the prompt.");
    }

    setGpsLoading(true);

    const successCallback = async (position: GeolocationPosition) => {
      const accuracy = position.coords.accuracy;
      if (accuracy > 200) {
        setGpsLoading(false);
        toast.error(`Capture failed: Location accuracy is too low (${accuracy.toFixed(1)} meters). We detected an approximate IP-based location. Please ensure your device's Wi-Fi is turned ON (to allow Wi-Fi triangulation) or use a mobile device with location services enabled to get under 200 meters precision.`);
        return;
      }

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      setLat(latitude);
      setLng(longitude);
      
      toast.info("Retrieving physical address from GPS...");
      const address = await reverseGeocode(latitude, longitude);
      setGeocodedAddress(address);
      setGpsLoading(false);
      toast.success("Location captured successfully!");

      if (street.trim()) {
        const isMatch = verifyAddressMatch(street, state, address);
        if (!isMatch) {
          toast.warning("Warning: Captured location address does not match your entered street address and state. Please check your address inputs or ensure you are present at the location.");
        } else {
          toast.success("GPS Location matches your entered address!");
        }
      }
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error("GPS Capture Error:", error);
      if (error.code === 1) {
        setGpsLoading(false);
        toast.error("Location permission denied. Please allow location access in your device and browser settings.");
        return;
      }

      toast.info("High accuracy GPS search timed out or is unavailable. Retrying with standard accuracy...");
      navigator.geolocation.getCurrentPosition(
        successCallback,
        (err) => {
          setGpsLoading(false);
          if (err.code === 1) {
            toast.error("Location permission denied. Please allow location access in your device and browser settings.");
          } else {
            toast.error(`Failed to capture location: ${err.message || "Unknown error"}. Check device location settings.`);
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      successCallback,
      errorCallback,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
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

      // Validate GPS coordinates
      if (lat === null || lng === null) {
        toast.error("Please capture your live location");
        return;
      }

      // Verify physical address match
      const isMatch = verifyAddressMatch(street, state, geocodedAddress);
      if (!isMatch) {
        toast.error("Verification failed: Your physical GPS location does not match your typed address. Please ensure you are physically present at your typed address to submit KYC.");
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

        // 3. Update profiles in Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            bvn: bvn,
            nin: nin,
            gov_id_url: publicUrl,
            utility_bill_url: finalUtilityBillUrl,
            gov_id_status: "pending",
            kyc_country: country,
            kyc_state: state,
            kyc_street: street,
            kyc_landmark: landmark,
            kyc_latitude: lat,
            kyc_longitude: lng,
            kyc_last_confirmed_at: new Date().toISOString()
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

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

      if (lat === null || lng === null) {
        toast.error("Please refresh your live location via GPS");
        return;
      }

      // Verify physical address match
      const isMatch = verifyAddressMatch(street, state, geocodedAddress);
      if (!isMatch) {
        toast.error("Verification failed: Your physical GPS location does not match your confirmed address. Please ensure you are physically present at your registered address to complete this request.");
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            kyc_latitude: lat,
            kyc_longitude: lng,
            kyc_last_confirmed_at: new Date().toISOString()
          })
          .eq("id", user.id);

        if (error) throw error;

        toast.success("Address & Live Location verified successfully!");
        onSuccess();
        onOpenChange(false);
      } catch (err: any) {
        console.error("Verification Error:", err);
        toast.error(err.message || "Failed to verify address and location");
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

          {/* GPS Capture Button */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Your Current Location</p>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">We verify your physical device location at the time of this request for security and anti-fraud audit logs.</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2.5 items-start w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGPSCapture}
                disabled={gpsLoading}
                className="bg-white border-slate-200 hover:bg-slate-50 text-emerald-600 dark:bg-slate-900 dark:border-slate-800 font-bold shrink-0"
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Capturing...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5 mr-1.5" /> Capture Location
                  </>
                )}
              </Button>
              {geocodedAddress ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold leading-normal">
                  {geocodedAddress}
                </span>
              ) : (
                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Location pending capture
                </span>
              )}
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
              disabled={loading || (mode === "confirm" && (!addressConfirmed || lat === null))}
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
