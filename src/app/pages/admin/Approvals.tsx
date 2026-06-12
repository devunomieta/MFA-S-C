import { useEffect, useState } from "react";

import { Check, X, Eye, ShieldCheck, Banknote, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useAuth } from "@/app/context/AuthContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";

export function AdminApprovals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [bankRequests, setBankRequests] = useState<any[]>([]);
  const [emailRequests, setEmailRequests] = useState<any[]>([]);

  // --- REJECTION PANEL STATE ---
  const [rejectingItem, setRejectingItem] = useState<{
    id: string;
    field: "nin_status" | "avatar_status" | "utility_bill_status";
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  const REJECTION_REASONS = {
    avatar_status: [
      { id: "blurry", label: "Blurry or Unclear Image" },
      { id: "no_face", label: "No Human Face Visible" },
      { id: "poor_lighting", label: "Too Dark / Overexposed" },
      { id: "face_covered", label: "Face Partially Covered (hat, glasses)" },
      { id: "not_live", label: "Appears to be a Screen Capture/Edited" },
      { id: "wrong_person", label: "Wrong Person / Multiple Faces" },
      { id: "other", label: "Other (specify)" },
    ],
    nin_status: [
      { id: "blurry", label: "Blurry or Unclear Image" },
      { id: "poor_lighting", label: "Too Dark / Overexposed" },
      { id: "cropped", label: "Missing Information / Cropped" },
      { id: "name_mismatch", label: "Name/Details Mismatch" },
      { id: "other", label: "Other (specify)" },
    ],
    utility_bill_status: [
      { id: "blurry", label: "Blurry or Unclear Image" },
      { id: "poor_lighting", label: "Too Dark / Overexposed" },
      { id: "cropped", label: "Missing Information / Cropped" },
      { id: "expired", label: "Document is Too Old (>3 months)" },
      { id: "name_mismatch", label: "Name/Address Mismatch" },
      { id: "other", label: "Other (specify)" },
    ],
  };

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchKycRequests(), fetchBankRequests(), fetchEmailRequests()]);
    setLoading(false);
  }

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => fetchData());
    }
  }, [user]);

  async function fetchKycRequests() {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, gov_id_status, gov_id_url, utility_bill_url, avatar_url, bvn, nin, kyc_country, kyc_state, kyc_street, kyc_landmark, kyc_latitude, kyc_longitude, nin_status, avatar_status, utility_bill_status",
      )
      .or("nin_status.eq.pending,avatar_status.eq.pending,utility_bill_status.eq.pending");

    if (error) console.error("Error fetching KYC:", error);
    else setKycRequests(data || []);
  }

  async function fetchBankRequests() {
    // Needs a join to get user details
    const { data, error } = await supabase
      .from("bank_account_requests")
      .select("*, profile:profiles(full_name, email)")
      .eq("status", "pending");

    if (error) console.error("Error fetching Bank Requests:", error);
    else setBankRequests(data || []);
  }

  async function fetchEmailRequests() {
    const { data, error } = await supabase
      .from("email_change_requests")
      .select("*, profile:profiles(full_name, email, gov_id_url)")
      .eq("status", "pending");

    if (error) console.error("Error fetching Email Requests:", error);
    else setEmailRequests(data || []);
  }

  // --- KYC ACTIONS ---
  async function handleUpdateDocumentStatus(
    req: any,
    field: "nin_status" | "avatar_status" | "utility_bill_status",
    newStatus: "verified" | "rejected",
    reasonMessage?: string,
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: newStatus })
      .eq("id", req.id);

    if (error) {
      toast.error(
        `Failed to update ${field.replace("_status", "").replace("avatar", "selfie photo").toUpperCase()} status`,
      );
    } else {
      toast.success(
        `${field.replace("_status", "").replace("avatar", "selfie photo").toUpperCase()} set to ${newStatus}`,
      );

      // Update local state immediately
      setKycRequests((prev) =>
        prev.map((r) => {
          if (r.id === req.id) {
            const updated = { ...r, [field]: newStatus };
            return updated;
          }
          return r;
        }),
      );

      const actionText = newStatus === "verified" ? "approved" : "rejected";
      let msg = `Your uploaded ${field.replace("_status", "").replace("avatar", "selfie photo").toUpperCase()} has been ${actionText} by the administrator.`;

      if (newStatus === "rejected" && reasonMessage) {
        msg += `\n\nReason: ${reasonMessage}`;
      }

      await notificationDispatcher.sendAlert({
        userId: req.id,
        email: req.email,
        type: "profile",
        title: `KYC Document ${newStatus === "verified" ? "Approved" : "Rejected"}`,
        message: msg,
      });

      if (newStatus === "rejected") {
        setRejectingItem(null);
        setSelectedReason("");
        setCustomReason("");
      }

      // If all three items on the card are no longer 'pending', filter the card out of the view
      setTimeout(() => {
        setKycRequests((prev) =>
          prev.filter((r) => {
            if (r.id === req.id) {
              const currentNin =
                r.id === req.id && field === "nin_status" ? newStatus : r.nin_status;
              const currentAvatar =
                r.id === req.id && field === "avatar_status" ? newStatus : r.avatar_status;
              const currentUtility =
                r.id === req.id && field === "utility_bill_status"
                  ? newStatus
                  : r.utility_bill_status;
              return (
                currentNin === "pending" ||
                currentAvatar === "pending" ||
                currentUtility === "pending"
              );
            }
            return true;
          }),
        );
      }, 500);
    }
  }

  // --- BANK ACTIONS ---
  async function handleBankAction(request: any, action: "approved" | "rejected") {
    try {
      if (action === "approved") {
        // 1. Insert into bank_accounts
        const { error: insertError } = await supabase.from("bank_accounts").insert({
          user_id: request.user_id,
          bank_name: request.bank_name,
          account_number: request.account_number,
          account_name: request.account_name,
        });

        if (insertError) throw insertError;
      }

      // 2. Update request status
      const { error: updateError } = await supabase
        .from("bank_account_requests")
        .update({ status: action })
        .eq("id", request.id);

      if (updateError) throw updateError;

      toast.success(`Bank Request ${action === "approved" ? "Approved" : "Rejected"}`);

      await notificationDispatcher.sendAlert({
        userId: request.user_id,
        email: request.profile?.email,
        type: "profile",
        title: `Bank Change Request ${action === "approved" ? "Approved" : "Rejected"}`,
        message: `Your request to add bank account ${request.bank_name} (${request.account_number}) has been ${action === "approved" ? "approved and linked successfully" : "rejected"}.`,
      });

      fetchBankRequests();
    } catch (error: any) {
      console.error(error);
      toast.error(`Failed to process request: ${error.message}`);
    }
  }

  // --- EMAIL ACTIONS ---
  async function handleEmailAction(request: any, action: "approved" | "rejected") {
    const { error } = await supabase
      .from("email_change_requests")
      .update({
        status: action,
        admin_notes:
          action === "approved"
            ? "Identity verified via live capture."
            : "Identity verification failed.",
      })
      .eq("id", request.id);

    if (error) {
      toast.error("Failed to update request status");
    } else {
      toast.success(
        `Request ${action === "approved" ? "Approved" : "Rejected"}. ${action === "approved" ? "Please manually update the email in Supabase Auth Dashboard." : ""}`,
      );

      await notificationDispatcher.sendAlert({
        userId: request.user_id,
        email: request.profile?.email,
        type: "profile",
        title: `Email Change Request ${action === "approved" ? "Approved" : "Rejected"}`,
        message: `Your request to change your email address to ${request.new_email} has been ${action === "approved" ? "approved" : "rejected by the administrator"}.`,
      });

      fetchEmailRequests();

      // Log Activity
      supabase.from("activity_logs").insert({
        user_id: user?.id,
        action: `ADMIN_EMAIL_CHANGE_${action.toUpperCase()}`,
        details: { target_user_id: request.user_id, new_email: request.new_email },
      });
    }
  }

  const renderDocumentControls = (
    req: any,
    label: string,
    field: "nin_status" | "avatar_status" | "utility_bill_status",
  ) => {
    const status = req[field] || "pending";
    const isRejectingThis = rejectingItem?.id === req.id && rejectingItem?.field === field;

    return (
      <div className="mt-2 space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          <Badge
            variant="outline"
            className={`text-[8px] px-1 py-0 h-4 font-semibold uppercase ${
              status === "verified"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : status === "rejected"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {status}
          </Badge>
        </div>

        {!isRejectingThis ? (
          <div className="flex gap-1 pt-0.5">
            <Button
              size="sm"
              variant={status === "verified" ? "default" : "outline"}
              className={`flex-1 h-6 text-[9px] px-1 py-0 font-medium ${
                status === "verified"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                  : "text-emerald-600 border-emerald-100 hover:bg-emerald-50"
              }`}
              onClick={() => handleUpdateDocumentStatus(req, field, "verified")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant={status === "rejected" ? "destructive" : "outline"}
              className={`flex-1 h-6 text-[9px] px-1 py-0 font-medium ${
                status === "rejected"
                  ? "bg-rose-600 hover:bg-rose-700 text-white border-transparent"
                  : "text-rose-600 border-rose-100 hover:bg-rose-50"
              }`}
              onClick={() => {
                setRejectingItem({ id: req.id, field });
                setSelectedReason("");
                setCustomReason("");
              }}
            >
              Reject
            </Button>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-100 p-2 rounded-lg mt-1 space-y-2">
            <span className="text-[10px] font-bold text-rose-800">Select Rejection Reason</span>
            <div className="flex flex-col gap-1">
              {REJECTION_REASONS[field].map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`text-left text-[9px] px-2 py-1 rounded-md transition-colors ${
                    selectedReason === reason.id
                      ? "bg-rose-600 text-white"
                      : "bg-white border border-rose-200 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
              {selectedReason === "other" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason..."
                  className="w-full text-[10px] px-2 py-1 rounded border border-rose-200 bg-white text-slate-800 focus:outline-none focus:border-rose-400 mt-1"
                />
              )}
            </div>
            <div className="flex gap-1 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-6 text-[9px] px-1 py-0 text-slate-600 hover:bg-slate-100"
                onClick={() => setRejectingItem(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-6 text-[9px] px-1 py-0 bg-rose-600 hover:bg-rose-700 text-white"
                disabled={!selectedReason || (selectedReason === "other" && !customReason.trim())}
                onClick={() => {
                  const reasonText =
                    selectedReason === "other"
                      ? customReason
                      : REJECTION_REASONS[field].find((r) => r.id === selectedReason)?.label || "";
                  handleUpdateDocumentStatus(req, field, "rejected", reasonText);
                }}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              <Badge
                variant="destructive"
                className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
              >
                {kycRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Banknote className="w-4 h-4" />
            Bank Requests
            {bankRequests.length > 0 && (
              <Badge
                variant="destructive"
                className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
              >
                {bankRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Updates
            {emailRequests.length > 0 && (
              <Badge
                variant="destructive"
                className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]"
              >
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
                      <Badge
                        variant="outline"
                        className="bg-yellow-50 text-yellow-700 border-yellow-200"
                      >
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-xs border bg-slate-50/50 p-3 rounded-lg border-slate-100">
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">
                          BVN
                        </span>
                        <span className="font-semibold">{req.bvn || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">
                          NIN
                        </span>
                        <span className="font-semibold">{req.nin || "N/A"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-gray-400 block font-bold uppercase">
                          Address
                        </span>
                        <span className="font-semibold">
                          {req.kyc_street || "N/A"},{" "}
                          {req.kyc_landmark ? `(Landmark: ${req.kyc_landmark})` : ""},{" "}
                          {req.kyc_state || "N/A"}, {req.kyc_country || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* NIN Document */}
                      <div className="flex flex-col justify-between">
                        <div className="bg-gray-100 rounded-md overflow-hidden relative group h-24">
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
                                    <Eye className="text-white w-5 h-5" />
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{req.full_name}'s ID Document</DialogTitle>
                                  <DialogDescription>
                                    Review the uploaded identification document for verification
                                    purposes.
                                  </DialogDescription>
                                </DialogHeader>
                                <img
                                  src={req.gov_id_url}
                                  alt="Full ID"
                                  className="w-full h-auto rounded"
                                />
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-[10px] text-center px-1">
                              No NIN Uploaded
                            </div>
                          )}
                        </div>
                        {renderDocumentControls(req, "NIN Slip", "nin_status")}
                      </div>

                      {/* Utility Bill / Signage */}
                      <div className="flex flex-col justify-between">
                        <div className="bg-gray-100 rounded-md overflow-hidden relative group h-24">
                          {req.utility_bill_url ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <div className="cursor-pointer w-full h-full relative">
                                  <img
                                    src={req.utility_bill_url}
                                    alt="Utility Bill"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="text-white w-5 h-5" />
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    {req.full_name}'s Utility Bill / Signage
                                  </DialogTitle>
                                  <DialogDescription>
                                    Review the uploaded utility bill or business signage for
                                    verification.
                                  </DialogDescription>
                                </DialogHeader>
                                <img
                                  src={req.utility_bill_url}
                                  alt="Utility Bill / Signage"
                                  className="w-full h-auto rounded"
                                />
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-[10px] text-center px-1">
                              No Utility Bill Uploaded
                            </div>
                          )}
                        </div>
                        {renderDocumentControls(req, "Utility Bill", "utility_bill_status")}
                      </div>

                      {/* Captured Live Selfie Photo */}
                      <div className="flex flex-col justify-between">
                        <div className="bg-gray-100 rounded-md overflow-hidden relative group h-24">
                          {req.avatar_url ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <div className="cursor-pointer w-full h-full relative">
                                  <img
                                    src={req.avatar_url}
                                    alt="Live Photo Selfie"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="text-white w-5 h-5" />
                                  </div>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>{req.full_name}'s Captured Live Photo</DialogTitle>
                                  <DialogDescription>
                                    Review the user's captured webcam selfie to compare with the ID
                                    document.
                                  </DialogDescription>
                                </DialogHeader>
                                <img
                                  src={req.avatar_url}
                                  alt="Live Photo Selfie"
                                  className="w-full h-auto rounded"
                                />
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-[10px] text-center px-1">
                              No Live Photo Captured
                            </div>
                          )}
                        </div>
                        {renderDocumentControls(req, "Selfie Photo", "avatar_status")}
                      </div>
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
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400">
                          No pending bank requests.
                        </td>
                      </tr>
                    ) : (
                      bankRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {req.profile?.full_name || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">{req.profile?.email}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{req.bank_name}</div>
                            <div className="text-gray-500">{req.account_number}</div>
                            <div className="text-xs text-gray-400 capitalize">
                              {req.account_name}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              Pending
                            </Badge>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleBankAction(req, "rejected")}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleBankAction(req, "approved")}
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
                        <CardTitle className="text-base font-semibold">
                          {req.profile?.full_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {req.profile?.email}
                          </Badge>
                          <span className="text-gray-400">&rarr;</span>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] py-0">
                            {req.new_email}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        Review Required
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* ID PHOTO */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                          KYC ID Document
                        </Label>
                        <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border">
                          <img
                            src={req.profile?.gov_id_url}
                            alt="KYC ID"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* LIVE CAPTURE PHOTO */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-emerald-600 tracking-wider">
                          Live Recovery Capture
                        </Label>
                        <div className="aspect-[4/3] bg-emerald-50 rounded-lg overflow-hidden border-2 border-emerald-200">
                          <img
                            src={req.live_photo_url}
                            alt="Live Capture"
                            className="w-full h-full object-cover"
                          />
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
                          onClick={() => handleEmailAction(req, "rejected")}
                        >
                          <X className="w-4 h-4 mr-2" /> Reject Request
                        </Button>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleEmailAction(req, "approved")}
                        >
                          <Check className="w-4 h-4 mr-2" /> Verify & Approve
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <a
                        href="https://supabase.com/dashboard/project/_/auth/users"
                        target="_blank"
                        rel="noopener noreferrer"
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
