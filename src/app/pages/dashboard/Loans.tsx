import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { CheckCircle2, XCircle, AlertTriangle, Upload, FileText, Clock, Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { calculateBalance } from "@/lib/walletUtils";

export function Loans() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [loans, setLoans] = useState<any[]>([]);
    const [interestRate, setInterestRate] = useState(10); // Default fallback

    // Eligibility State
    const [profile, setProfile] = useState<any>(null);
    const [hasActivePlan, setHasActivePlan] = useState(false);
    const [totalBalance, setTotalBalance] = useState(0);
    const [maxLoanAmount, setMaxLoanAmount] = useState(0);
    const [accountAgeMonths, setAccountAgeMonths] = useState(0);

    // Form State
    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState("3");
    const [maxDurationMonths, setMaxDurationMonths] = useState(1);
    const [pastLoanCount, setPastLoanCount] = useState(0);
    const [open, setOpen] = useState(false);

    // Repayment State
    const [repayOpen, setRepayOpen] = useState(false);
    const [repayAmount, setRepayAmount] = useState("");
    const [selectedLoan, setSelectedLoan] = useState<any>(null);
    const [repaying, setRepaying] = useState(false);

    // Mock ID Upload
    const [isUploadingId, setIsUploadingId] = useState(false);

    const formatCurrency = (value: number | string) => {
        const val = Number(value);
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val);
    };

    const [loanTransactions, setLoanTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            fetchSettings();
            fetchLoans();
            fetchEligibilityData();
            fetchLoanTransactions();
        }
    }, [user]);

    useEffect(() => {
        const loanId = searchParams.get('id');
        if (loanId && loans.length > 0) {
            const loan = loans.find(l => l.id === loanId);
            if (loan) {
                setSelectedLoan(loan);
                setRepayOpen(true);
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [loans, searchParams]);

    async function fetchSettings() {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
        if (data?.value?.loan_interest_rate) {
            setInterestRate(Number(data.value.loan_interest_rate));
        }
    }

    async function fetchLoanTransactions() {
        const { data } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user?.id)
            .not("loan_id", "is", null)
            .order("created_at", { ascending: false });

        if (data) setLoanTransactions(data);
    }

    async function fetchLoans() {
        const { data } = await supabase
            .from("loans")
            .select("*")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false });

        if (data) setLoans(data);
    }

    async function fetchEligibilityData() {
        // 1. Fetch Profile (Created At & KYC)
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user?.id)
            .single();

        if (profileData) {
            setProfile(profileData);

            // Calculate Account Age
            const created = new Date(profileData.created_at);
            const now = new Date();
            const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
            setAccountAgeMonths(diffMonths);
        }

        // 2. Fetch Plans (Active Plan Check)
        const { data: plansData } = await supabase
            .from("user_plans")
            .select("id")
            .eq("user_id", user?.id)
            .eq("status", "active");

        const activePlans = plansData ? plansData.length > 0 : false;
        setHasActivePlan(activePlans);

        // 3. Fetch Balance (For Max Loan Calc)
        const { data: txData } = await supabase
            .from("transactions")
            .select("amount, type, charge")
            .eq("user_id", user?.id);

        if (txData) {
            const bal = calculateBalance(txData as any, null);
            setTotalBalance(bal);

            // Calculate Max Loan
            // Rule: > 1 year (12 months) = 70%, else 50%
            const percentage = (accountAgeMonths >= 12) ? 0.7 : 0.5;
            setMaxLoanAmount(bal * percentage);
        }

        // 4. Calculate Max Duration based on History
        const { count: completedLoansCount } = await supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .in('status', ['paid', 'active']); // Count approved loans

        const count = completedLoansCount || 0;
        setPastLoanCount(count);

        let allowedDuration = 1;
        if (count < 2) { // 0 or 1 past loans -> Requesting 1st or 2nd (Max 1)
            allowedDuration = 1;
        } else if (count < 5) { // 2, 3, 4 past loans -> Requesting 3rd, 4th, 5th (Max 3)
            allowedDuration = 3;
        } else { // 5 or more past loans -> Requesting 6th+ (Max 6)
            allowedDuration = 6;
        }
        setMaxDurationMonths(allowedDuration);

        // Reset duration if it exceeds new max
        if (parseInt(duration) > allowedDuration) {
            setDuration(allowedDuration.toString());
        }
    }

    const activeLoansTotal = loans
        .filter(l => l.status === 'active' || l.status === 'defaulted')
        .reduce((sum, loan) => sum + Number(loan.total_payable), 0);

    // Available limit considers existing debt
    const availableLoanLimit = Math.max(0, maxLoanAmount - activeLoansTotal);

    const isEligible =
        hasActivePlan &&
        profile?.gov_id_status === 'verified';

    async function handleUploadId(file: File) {
        if (!user) return;
        setIsUploadingId(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('kyc')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('kyc')
                .getPublicUrl(fileName);

            await supabase.from("profiles").update({
                gov_id_status: 'pending',
                gov_id_url: publicUrl
            }).eq("id", user.id);

            toast.success("ID Uploaded! Verification pending.");
            fetchEligibilityData();
        } catch (error: any) {
            console.error("ID Upload Error:", error);
            toast.error("Failed to upload ID. Please try again.");
        } finally {
            setIsUploadingId(false);
        }
    }

    async function handleRequestLoan() {
        if (!user || !amount) return;

        if (!isEligible) {
            toast.error("You are not eligible for a loan yet");
            return;
        }

        const loanAmount = parseFloat(amount);
        // Compare against the REMAINING limit, not full total limit
        // Compare against the REMAINING limit, not full total limit
        const isHighValue = loanAmount > availableLoanLimit;

        // const interestRate is now from state
        const totalPayable = loanAmount + (loanAmount * (interestRate / 100));

        // Generate Loan Number: MTF - XXXXXX
        const loanNumber = `MTF - ${Math.floor(100000 + Math.random() * 900000)}`;

        const { error } = await supabase.from("loans").insert({
            user_id: user.id,
            amount: loanAmount,
            loan_number: loanNumber,
            interest_rate: interestRate,
            total_payable: totalPayable,
            duration_months: parseInt(duration) || 1, // Default to 1 month if invalid
            status: 'pending'
        });

        if (error) {
            toast.error("Loan request failed");
        } else {
            if (isHighValue) {
                toast.warning("Request exceeds available limit. Submitted for Admin Approval.");
            } else {
                toast.success("Loan requested successfully!");
            }
            setOpen(false);
            setAmount("");
            fetchLoans();
        }
    }

    async function handleRepayment() {
        if (!selectedLoan || !repayAmount) return;
        const amountToRepay = parseFloat(repayAmount);

        if (amountToRepay <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        if (amountToRepay > totalBalance) {
            toast.error("Insufficient wallet balance for repayment");
            return;
        }

        setRepaying(true);

        // 1. Create COMPLETED transaction
        // The backend trigger 'handle_loan_repayment' will automatically 
        // update the loan balance and status when this transaction is inserted.
        const { error: txError } = await supabase.from("transactions").insert({
            user_id: user?.id,
            amount: amountToRepay,
            type: 'loan_repayment',
            status: 'completed',
            description: `Repayment for ${selectedLoan.loan_number || 'Loan'}`,
            plan_id: null,
            loan_id: selectedLoan.id,
            charge: 0
        });

        if (txError) {
            toast.error("Failed to process repayment transaction.");
            setRepaying(false);
            return;
        }

        toast.success(`Repayment submitted! Payment of ₦${formatCurrency(amountToRepay)} is being processed.`);
        setRepayOpen(false);
        setRepayAmount("");
        setSelectedLoan(null);

        // Refresh all data
        await fetchLoans();
        await fetchEligibilityData();
        await fetchLoanTransactions();
        setRepaying(false);
    }

    const eligibilityChecklist = (
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        {hasActivePlan ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> : <XCircle className="text-red-500 w-5 h-5" />}
                        <span className="text-sm dark:text-gray-300">Active Investment Plan</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            {profile?.gov_id_status === 'verified' ? <CheckCircle2 className="text-emerald-500 w-5 h-5" /> :
                                profile?.gov_id_status === 'pending' ? <Clock className="text-yellow-500 w-5 h-5" /> :
                                    <XCircle className="text-red-500 w-5 h-5" />}
                            <span className="text-sm dark:text-gray-300">
                                {profile?.gov_id_status === 'verified' ? "Verified Government ID" :
                                    profile?.gov_id_status === 'pending' ? "ID Verification Pending" :
                                        "Verified Government ID"}
                            </span>
                        </div>
                        {profile?.gov_id_status === 'not_uploaded' && (
                            <>
                                <input
                                    type="file"
                                    id="id-upload"
                                    className="hidden"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleUploadId(e.target.files[0]);
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => document.getElementById('id-upload')?.click()}
                                    disabled={isUploadingId}
                                >
                                    {isUploadingId ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                                    Upload
                                </Button>
                            </>
                        )}
                        {profile?.gov_id_status === 'pending' && (
                            <span className="text-xs text-yellow-600 font-medium">Under Review</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-500">{accountAgeMonths}m</span>
                        </div>
                        <div>
                            <span className="text-sm dark:text-gray-300 block">Account Age</span>
                            <span className="text-xs text-gray-500">{accountAgeMonths >= 12 ? 'Qualified for 70%' : 'Qualified for 50%'}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Complete these steps to unlock loan access.</span>
            </div>
        </div>
    );

    const loanForm = (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="amount" className="dark:text-gray-300">Loan Amount</Label>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Total Limit: <span className="font-medium">₦{formatCurrency(maxLoanAmount)}</span></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Available: ₦{formatCurrency(availableLoanLimit)}</span>
                </div>
                <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                {amount && parseFloat(amount) > availableLoanLimit && (
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeds available limit. Requires Admin Review.
                    </p>
                )}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="duration" className="dark:text-gray-300">Duration (Months)</Label>
                <select
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                    {Array.from({ length: maxDurationMonths }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500">
                    Max duration based on your history ({pastLoanCount} previous loans).
                </p>
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 space-y-1">
                <div className="flex justify-between">
                    <span>Interest Rate:</span>
                    <span className="font-medium">{interestRate}% Flat</span>
                </div>
                <div className="flex justify-between text-red-600/80 dark:text-red-400/80">
                    <span>Overdue Fee:</span>
                    <span className="font-medium">5% (if late)</span>
                </div>
                <div className="border-t border-blue-200 dark:border-blue-800 my-2 pt-2 flex justify-between font-bold">
                    <span>Estimated Repayment:</span>
                    <span>{amount ? `₦${formatCurrency(parseFloat(amount) * 1.1)}` : '₦0.00'}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h1>
                    <p className="text-gray-500 dark:text-gray-400">Apply for loans and manage active loans.</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        {isEligible ? (
                            <Button className="bg-emerald-600 hover:bg-emerald-700 dark:text-white">
                                {loans.some(l => l.status === 'active' || l.status === 'pending') ? 'Request Another Loan' : 'Request Loan'}
                            </Button>
                        ) : (
                            <Button variant="destructive" className="bg-red-500 hover:bg-red-600 text-white cursor-not-allowed opacity-90">
                                NOT ELIGIBLE
                            </Button>
                        )}
                    </DialogTrigger>
                    <DialogContent className="dark:bg-gray-900 dark:border-gray-800 sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="dark:text-white">Request a Loan</DialogTitle>
                            <DialogDescription className="dark:text-gray-400">
                                {isEligible
                                    ? `You qualify for up to ₦${formatCurrency(maxLoanAmount)} (${accountAgeMonths >= 12 ? '70%' : '50%'} of balance).`
                                    : "All the following criteria MUST BE MET to access loans."
                                }
                            </DialogDescription>
                        </DialogHeader>

                        {!isEligible ? eligibilityChecklist : loanForm}

                        <DialogFooter>
                            {isEligible && (
                                <Button onClick={handleRequestLoan} className="dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700">Submit Application</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Repayment Dialog */}
            <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
                <DialogContent className="dark:bg-gray-900 dark:border-gray-800 sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="dark:text-white flex items-center justify-between">
                            <span>Loan Details</span>
                            {selectedLoan && (
                                <Badge variant="outline">{selectedLoan.loan_number}</Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription className="dark:text-gray-400">
                            Review loan status, history, and manage repayments.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLoan && (
                        <div className="space-y-6">
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500">Original Amount</p>
                                    <p className="font-medium dark:text-white">₦{formatCurrency(selectedLoan.amount)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Total Payable</p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">₦{formatCurrency(selectedLoan.total_payable)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Interest Rate</p>
                                    <p className="font-medium dark:text-white">{selectedLoan.interest_rate}%</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Status</p>
                                    <span className={`text-sm font-medium capitalize ${selectedLoan.status === 'active' ? 'text-green-600' :
                                        selectedLoan.status === 'defaulted' ? 'text-red-600' : 'text-gray-600'
                                        }`}>{selectedLoan.status}</span>
                                </div>
                            </div>

                            {/* Repayment Section (Active/Overdue Only) */}
                            {(selectedLoan.status === 'active' || selectedLoan.status === 'defaulted') && (
                                <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                                    <h4 className="text-sm font-semibold dark:text-white">Make a Repayment</h4>
                                    <div className="flex gap-2 items-end">
                                        <div className="grid gap-1 flex-1">
                                            <Label htmlFor="repayAmount" className="sr-only">Amount</Label>
                                            <Input
                                                id="repayAmount"
                                                type="number"
                                                value={repayAmount}
                                                onChange={(e) => setRepayAmount(e.target.value)}
                                                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setRepayAmount(selectedLoan.total_payable.toString())}
                                        >
                                            Clear All
                                        </Button>
                                    </div>
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        onClick={handleRepayment}
                                        disabled={repaying || !repayAmount}
                                    >
                                        {repaying ? 'Processing...' : 'Submit Repayment'}
                                    </Button>
                                </div>
                            )}

                            {/* Transaction History */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold dark:text-white">Transaction History</h4>
                                <div className="border rounded-md border-gray-100 dark:border-gray-700 max-h-[150px] overflow-y-auto">
                                    {loanTransactions.filter(tx => tx.loan_id === selectedLoan.id).length === 0 ? (
                                        <p className="text-xs text-center py-4 text-gray-500">No transactions recorded.</p>
                                    ) : (
                                        loanTransactions.filter(tx => tx.loan_id === selectedLoan.id).map(tx => (
                                            <div key={tx.id} className="flex justify-between items-center p-2 text-xs border-b last:border-0 border-gray-100 dark:border-gray-800">
                                                <span className="text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</span>
                                                <span className="font-medium">{tx.type === 'loan_repayment' ? 'Repayment' : 'Disbursement'}</span>
                                                <span className={tx.type === 'loan_repayment' ? 'text-green-600' : 'text-gray-900 dark:text-white'}>
                                                    {tx.type === 'loan_repayment' ? '-' : '+'}₦{formatCurrency(tx.amount)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* NEW TABLE LAYOUT */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[140px]">Loan ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Total Payable</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Overdue Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                                        <p>No loan history found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            loans.map((loan) => {
                                // Overdue Logic
                                const dueDate = new Date(new Date(loan.created_at).getTime() + (loan.duration_months * 30 * 24 * 60 * 60 * 1000));
                                const now = new Date();
                                let overdueStatus = "Not Yet";
                                let overdueColor = "text-gray-500";

                                if (loan.status === 'active') {
                                    if (now > dueDate) {
                                        overdueStatus = "Overdue";
                                        overdueColor = "text-red-600 font-bold";
                                    } else if ((dueDate.getTime() - now.getTime()) < (7 * 24 * 60 * 60 * 1000)) { // 7 days
                                        overdueStatus = "Due Soon";
                                        overdueColor = "text-amber-600 font-medium";
                                    }
                                } else if (loan.status === 'defaulted') {
                                    overdueStatus = "Overdue";
                                    overdueColor = "text-red-600 font-bold";
                                } else {
                                    overdueStatus = "-";
                                }

                                return (
                                    <TableRow key={loan.id}>
                                        <TableCell className="font-medium">{loan.loan_number || 'LN----'}</TableCell>
                                        <TableCell>{new Date(loan.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell>₦{formatCurrency(loan.amount)}</TableCell>
                                        <TableCell>₦{formatCurrency(loan.total_payable)}</TableCell>
                                        <TableCell>{loan.duration_months} Month{loan.duration_months > 1 ? 's' : ''}</TableCell>
                                        <TableCell className={overdueColor}>{overdueStatus}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                loan.status === 'active' ? 'default' :
                                                    loan.status === 'paid' ? 'secondary' :
                                                        loan.status === 'defaulted' ? 'destructive' : 'outline'
                                            }>
                                                {loan.status === 'paid' ? 'Cleared' : loan.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLoan(loan);
                                                    setRepayOpen(true);
                                                    // If loan is active, user can interact. 
                                                    // Logic for popup is handled by passing loan to state.
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
