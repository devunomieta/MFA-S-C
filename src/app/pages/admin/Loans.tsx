import { useEffect, useState, useMemo } from "react";

import {
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";

export function AdminLoans() {
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Pagination State
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals
  const [actionLoan, setActionLoan] = useState<any>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);

  // Approve Form State
  const [approvedAmount, setApprovedAmount] = useState("");
  const [repayableAmount, setRepayableAmount] = useState("");
  const [repaymentDurationType, setRepaymentDurationType] = useState("monthly");
  const [durationMonths, setDurationMonths] = useState("1");
  const [actioning, setActioning] = useState(false);

  // Disburse State
  const [receiptUrl, setReceiptUrl] = useState("");

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    setLoading(true);
    const { data, error } = await supabase
      .from("loans")
      .select("*, profile:profiles(full_name, email, phone)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch loans");
      console.error(error);
    } else {
      setLoans(data || []);
    }
    setLoading(false);
  }

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
    }).format(Number(value));
  };

  const openApproveModal = (loan: any) => {
    setActionLoan(loan);
    setApprovedAmount((loan.requested_amount_value || loan.amount).toString());
    setRepayableAmount(loan.total_payable?.toString() || "");
    setRepaymentDurationType(loan.repayment_duration_type || "monthly");
    setDurationMonths(loan.duration_months?.toString() || "1");
    setApproveModalOpen(true);
  };

  async function handleApprove() {
    if (!actionLoan) return;
    setActioning(true);

    const loanUpdates = {
      status: "approved",
      approved_amount: parseFloat(approvedAmount),
      repayable_amount: parseFloat(repayableAmount),
      total_payable: parseFloat(repayableAmount), // Sync legacy
      remaining_balance: parseFloat(repayableAmount), // Initial balance to pay
      repayment_duration_type: repaymentDurationType,
      duration_months: parseFloat(durationMonths),
    };

    const { error } = await supabase.from("loans").update(loanUpdates).eq("id", actionLoan.id);

    if (error) {
      toast.error("Failed to approve loan");
    } else {
      toast.success("Loan approved. It is now awaiting disbursement.");
      await notificationDispatcher.sendAlert({
        userId: actionLoan.user_id,
        email: actionLoan.profile?.email,
        type: "loan",
        title: "Loan Application Approved",
        message: `Your application for loan number ${actionLoan.loan_number} has been approved. The administrative team will disburse the funds to your bank account shortly.`,
      });
      fetchLoans();
      setApproveModalOpen(false);
    }
    setActioning(false);
  }

  async function handleReject(loanId: string) {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    if (!confirm("Are you sure you want to reject this loan application?")) return;

    const { error } = await supabase.from("loans").update({ status: "rejected" }).eq("id", loanId);

    if (error) {
      toast.error("Failed to reject loan");
    } else {
      toast.success("Loan rejected successfully");
      await notificationDispatcher.sendAlert({
        userId: loan.user_id,
        email: loan.profile?.email,
        type: "loan",
        title: "Loan Application Rejected",
        message: `We regret to inform you that your application for loan number ${loan.loan_number} has been rejected. Please contact support for further details.`,
      });
      fetchLoans();
    }
  }

  const openDisburseModal = (loan: any) => {
    setActionLoan(loan);
    setReceiptUrl("");
    setDisburseModalOpen(true);
  };

  async function handleDisburse() {
    if (!actionLoan) return;
    setActioning(true);

    // 1. Update loan status to active
    const { error } = await supabase
      .from("loans")
      .update({
        status: "active",
        disbursement_receipt_url: receiptUrl || "Manually Confirmed",
      })
      .eq("id", actionLoan.id);

    if (error) {
      toast.error("Failed to mark loan as disbursed");
      setActioning(false);
      return;
    }

    // 2. Create disbursement transaction record
    // We record this internally even though it went to external bank
    await supabase.from("transactions").insert({
      user_id: actionLoan.user_id,
      amount: actionLoan.approved_amount || actionLoan.amount,
      type: "loan_disbursement",
      status: "completed",
      description: `Disbursement to Bank Account (${actionLoan.bank_account_details?.bank_name || "External"} - ${actionLoan.bank_account_details?.account_number || ""})`,
      loan_id: actionLoan.id,
    });

    toast.success("Loan marked as disbursed and is now active.");

    await notificationDispatcher.sendAlert({
      userId: actionLoan.user_id,
      email: actionLoan.profile?.email,
      type: "loan",
      title: "Loan Disbursed 💸",
      message: `Great news! The approved funds for loan ${actionLoan.loan_number} have been sent to your bank account. Your repayment countdown has started.`,
    });

    fetchLoans();
    setDisburseModalOpen(false);
    setActioning(false);
  }

  async function handleMarkStatus(loanId: string, newStatus: string) {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;

    if (!confirm(`Are you sure you want to mark this loan as ${newStatus}?`)) return;

    const { error } = await supabase
      .from("loans")
      .update({
        status: newStatus,
        ...(newStatus === "defaulted" ? { defaulted_at: new Date().toISOString() } : {}),
      })
      .eq("id", loanId);

    if (error) {
      toast.error(`Failed to mark loan as ${newStatus}`);
    } else {
      toast.success(`Loan marked as ${newStatus}`);

      if (newStatus === "defaulted") {
        await notificationDispatcher.sendAlert({
          userId: loan.user_id,
          email: loan.profile?.email,
          type: "loan",
          title: "Loan Defaulted - Urgent Attention Required",
          message: `Your loan ${loan.loan_number} has been marked as defaulted due to missed payments. Please make a payment immediately to restore your account standing.`,
        });
      }

      fetchLoans();
    }
  }

  // Filter Logic
  const filteredLoans = useMemo(() => {
    let filtered = loans.filter((loan) => {
      // Tab matching
      if (activeTab === "requests") return loan.status === "pending";
      if (activeTab === "approved") return loan.status === "approved";
      if (activeTab === "active") return loan.status === "active";
      if (activeTab === "defaulted") return loan.status === "defaulted";
      if (activeTab === "settled") return loan.status === "completed" || loan.status === "paid";
      return true;
    });

    // Search query matching
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.loan_number?.toLowerCase().includes(q) ||
          l.profile?.full_name?.toLowerCase().includes(q) ||
          l.profile?.email?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [loans, activeTab, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset pagination when tab or search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loan Management</h1>
          <p className="text-slate-500">
            Review requests, disburse funds, and manage debt collections.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="bg-slate-100">
                <TabsTrigger value="requests">Requests</TabsTrigger>
                <TabsTrigger value="approved">Approved (Awaiting)</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="defaulted">Defaulted</TabsTrigger>
                <TabsTrigger value="settled">Settled</TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search user or loan #..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm text-left min-w-[900px]">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Loan #</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Duration</th>
                    {activeTab === "requests" && <th className="px-4 py-3">Higher Amt Req?</th>}
                    {(activeTab === "approved" ||
                      activeTab === "active" ||
                      activeTab === "defaulted") && <th className="px-4 py-3">Bank/Contact</th>}
                    {activeTab === "active" && <th className="px-4 py-3">Remaining</th>}
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : paginatedLoans.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        No loans found in this category.
                      </td>
                    </tr>
                  ) : (
                    paginatedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-slate-600 font-medium">
                          {loan.loan_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {loan.profile?.full_name || "Unknown"}
                          </div>
                          <div className="text-xs text-slate-500">{loan.profile?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            ₦
                            {formatCurrency(
                              loan.approved_amount || loan.requested_amount_value || loan.amount,
                            )}
                          </div>
                          {(loan.repayable_amount > 0 || loan.total_payable > 0) && (
                            <div className="text-[10px] text-slate-500">
                              Payable: ₦
                              {formatCurrency(loan.repayable_amount || loan.total_payable)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {loan.duration_months} Months
                          <div className="text-[10px] text-slate-500">
                            {(loan.repayment_duration_type || "monthly").replace("_", " ")}
                          </div>
                        </td>

                        {activeTab === "requests" && (
                          <td className="px-4 py-3">
                            {loan.requested_higher_amount ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                No
                              </Badge>
                            )}
                          </td>
                        )}

                        {(activeTab === "approved" ||
                          activeTab === "active" ||
                          activeTab === "defaulted") && (
                          <td className="px-4 py-3 text-xs max-w-[200px]">
                            {activeTab === "defaulted" ? (
                              <>
                                <span className="font-medium text-slate-900 block">
                                  {loan.profile?.phone || "No Phone"}
                                </span>
                                <span className="text-slate-500">{loan.profile?.email}</span>
                              </>
                            ) : loan.bank_account_details ? (
                              <>
                                <span className="font-medium text-slate-900 block truncate">
                                  {loan.bank_account_details.bank_name}
                                </span>
                                <span className="text-slate-500 block truncate">
                                  {loan.bank_account_details.account_number}
                                </span>
                                <span className="text-slate-400 block truncate text-[10px]">
                                  {loan.bank_account_details.account_name}
                                </span>
                              </>
                            ) : (
                              <span className="text-red-500">No Bank Provided</span>
                            )}
                          </td>
                        )}

                        {activeTab === "active" && (
                          <td className="px-4 py-3 font-semibold text-emerald-600">
                            ₦
                            {formatCurrency(
                              loan.remaining_balance ||
                                loan.repayable_amount ||
                                loan.total_payable ||
                                0,
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(loan.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {activeTab === "requests" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2"
                                  onClick={() => openApproveModal(loan)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleReject(loan.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {activeTab === "approved" && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 h-8"
                                onClick={() => openDisburseModal(loan)}
                              >
                                <UploadCloud className="w-4 h-4 mr-1.5" /> Disburse
                              </Button>
                            )}

                            {activeTab === "active" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleMarkStatus(loan.id, "defaulted")}
                                >
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Default
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8"
                                  onClick={() => handleMarkStatus(loan.id, "completed")}
                                >
                                  Mark Settled
                                </Button>
                              </>
                            )}

                            {activeTab === "defaulted" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8"
                                  onClick={() => handleMarkStatus(loan.id, "active")}
                                >
                                  Restore Active
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-8"
                                  onClick={() => handleMarkStatus(loan.id, "completed")}
                                >
                                  Mark Settled
                                </Button>
                              </>
                            )}

                            {activeTab === "settled" && <Badge variant="secondary">Archived</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-between border-t border-slate-200 bg-slate-50">
                <p className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredLoans.length)} of{" "}
                  {filteredLoans.length} entries
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-sm font-medium px-2 text-slate-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* APPROVE MODAL */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Approve Loan Request</DialogTitle>
            <DialogDescription>
              Review and set the final parameters for this loan.
            </DialogDescription>
          </DialogHeader>
          {actionLoan && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Requested Amount</Label>
                  <Input
                    disabled
                    value={`₦${formatCurrency(actionLoan.requested_amount_value || actionLoan.amount)}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Higher Amt Requested?</Label>
                  <Input
                    disabled
                    value={actionLoan.requested_higher_amount ? "YES" : "NO"}
                    className={actionLoan.requested_higher_amount ? "text-red-600 font-bold" : ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Approved Amount (Disbursable)</Label>
                <Input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Repayable Amount (Including Interest)</Label>
                <Input
                  type="number"
                  value={repayableAmount}
                  onChange={(e) => setRepayableAmount(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (Months)</Label>
                  <Input
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Repayment Type</Label>
                  <Select value={repaymentDurationType} onValueChange={setRepaymentDurationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="full_settlement">Full Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actioning}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {actioning ? "Saving..." : "Approve Loan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DISBURSE MODAL */}
      <Dialog open={disburseModalOpen} onOpenChange={setDisburseModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Disburse Funds</DialogTitle>
            <DialogDescription>
              Confirm that you have transferred the funds to the user's bank account.
            </DialogDescription>
          </DialogHeader>
          {actionLoan && (
            <div className="space-y-4 py-3">
              <div className="bg-blue-50 text-blue-900 p-4 rounded-md space-y-2 text-sm border border-blue-100">
                <p>
                  <strong>Bank:</strong> {actionLoan.bank_account_details?.bank_name || "N/A"}
                </p>
                <p>
                  <strong>Acct No:</strong>{" "}
                  {actionLoan.bank_account_details?.account_number || "N/A"}
                </p>
                <p>
                  <strong>Name:</strong> {actionLoan.bank_account_details?.account_name || "N/A"}
                </p>
                <div className="border-t border-blue-200 mt-2 pt-2">
                  <p className="font-bold text-lg">
                    Send: ₦{formatCurrency(actionLoan.approved_amount || actionLoan.amount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Receipt URL / Transaction ID (Optional)</Label>
                <Input
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="Paste link to receipt or entering TxID"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDisburse}
              disabled={actioning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actioning ? "Processing..." : "Mark as Disbursed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
