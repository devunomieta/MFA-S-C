import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { CheckCircle2, XCircle, AlertTriangle, Upload, FileText, Clock } from "lucide-react";

export function Loans() {
    const { user } = useAuth();
    const [loans, setLoans] = useState<any[]>([]);

    // Eligibility State
    const [profile, setProfile] = useState<any>(null);
    const [hasActivePlan, setHasActivePlan] = useState(false);
    const [totalBalance, setTotalBalance] = useState(0);
    const [maxLoanAmount, setMaxLoanAmount] = useState(0);
    const [accountAgeMonths, setAccountAgeMonths] = useState(0);

    // Form State
    const [amount, setAmount] = useState("");
    const [duration, setDuration] = useState("3");
    const [open, setOpen] = useState(false);

    // Mock ID Upload
    const [isUploadingId, setIsUploadingId] = useState(false);

    useEffect(() => {
        if (user) {
            fetchLoans();
            fetchEligibilityData();
        }
    }, [user]);

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
        // Note: Ideally getting this from a dedicated view or function. Re-calculating here for simplicity as per Wallet logic.
        const { data: txData } = await supabase
            .from("transactions")
            .select("amount, type, charge")
            .eq("user_id", user?.id);

        if (txData) {
            const bal = txData.reduce((acc, curr) => {
                const amt = Number(curr.amount);
                const chg = Number(curr.charge || 0);
                if (curr.type === 'deposit' || curr.type === 'loan_disbursement') return acc + amt - chg;
                if (curr.type === 'withdrawal' || curr.type === 'loan_repayment') return acc - amt - chg;
                return acc;
            }, 0);
            setTotalBalance(bal);

            // Calculate Max Loan
            // Rule: > 1 year (12 months) = 70%, else 50%
            const percentage = (accountAgeMonths >= 12) ? 0.7 : 0.5;
            setMaxLoanAmount(bal * percentage);
        }
    }

    const isEligible =
        hasActivePlan &&
        profile?.gov_id_status === 'verified';

    const getEligibilityStatus = () => {
        if (!hasActivePlan) return "Join a plan first";
        if (profile?.gov_id_status !== 'verified') return "Verify ID";
        return "Eligible";
    };

    async function handleUploadId() {
        setIsUploadingId(true);
        // Mock ID Upload
        setTimeout(async () => {
            await supabase.from("profiles").update({
                gov_id_status: 'pending', // Set to pending
                gov_id_url: 'https://mock-id.com/id.jpg'
            }).eq("id", user?.id);

            toast.success("ID Uploaded! Verification pending.");
            setIsUploadingId(false);
            fetchEligibilityData();
        }, 1500);
    }

    async function handleRequestLoan() {
        if (!user || !amount) return;

        if (!isEligible) {
            toast.error("You are not eligible for a loan yet");
            return;
        }

        const loanAmount = parseFloat(amount);

        if (loanAmount > maxLoanAmount) {
            toast.error(`Loan amount exceeds your limit of $${maxLoanAmount.toFixed(2)}`);
            return;
        }

        const interestRate = 10; // 10% flat
        const totalPayable = loanAmount + (loanAmount * (interestRate / 100));

        const { error } = await supabase.from("loans").insert({
            user_id: user.id,
            amount: loanAmount,
            interest_rate: interestRate,
            total_payable: totalPayable,
            duration_months: parseInt(duration),
            status: 'pending'
        });

        if (error) {
            toast.error("Loan request failed");
        } else {
            toast.success("Loan requested successfully!");
            setOpen(false);
            setAmount("");
            fetchLoans();
        }
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
                            <Button size="sm" variant="outline" onClick={handleUploadId} disabled={isUploadingId}>
                                {isUploadingId ? "Uploading..." : <><Upload className="w-3 h-3 mr-1" /> Upload</>}
                            </Button>
                        )}
                        {profile?.gov_id_status === 'pending' && (
                            <span className="text-xs text-yellow-600 font-medium">Under Review</span>
                        )}
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
        </div>
    );

    const loanForm = (
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="amount" className="dark:text-gray-300">Loan Amount (Max: ${maxLoanAmount.toFixed(0)})</Label>
                <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={maxLoanAmount}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="duration" className="dark:text-gray-300">Duration (Months)</Label>
                <Input
                    id="duration"
                    type="number"
                    placeholder="3"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Interest Rate: 10% Flat<br />
                Estimated Repayment: {amount ? `$${(parseFloat(amount) * 1.1).toFixed(2)}` : '$0.00'}
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
                                Request Loan
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
                                    ? `You qualify for up to $${maxLoanAmount.toFixed(2)} (${accountAgeMonths >= 12 ? '70%' : '50%'} of balance).`
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {loans.length === 0 ? (
                    <Card className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 border-dashed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400">
                        <FileText className="w-12 h-12 mb-4 opacity-50" />
                        <p>No loan history found.</p>
                    </Card>
                ) : (
                    loans.map((loan) => (
                        <Card key={loan.id} className="dark:bg-gray-800 dark:border-gray-700">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="dark:text-white">Personal Loan</CardTitle>
                                    <Badge variant={loan.status === 'active' ? 'default' : 'secondary'} className={
                                        loan.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                    }>
                                        {loan.status}
                                    </Badge>
                                </div>
                                <CardDescription className="dark:text-gray-400">{new Date(loan.created_at).toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Amount</span>
                                    <span className="font-medium dark:text-white">${loan.amount}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Total Payable</span>
                                    <span className="font-medium dark:text-white">${loan.total_payable}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Duration</span>
                                    <span className="font-medium dark:text-white">{loan.duration_months} Months</span>
                                </div>
                            </CardContent>
                            {loan.status === 'active' && (
                                <CardFooter>
                                    <Button variant="outline" className="w-full dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800">Make Repayment</Button>
                                </CardFooter>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
