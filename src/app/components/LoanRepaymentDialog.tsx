import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface LoanRepaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loan: any;
    withdrawalAmount: number;
    onPayLoan: () => void;
    onRequestWithdrawal: () => void;
    processing: boolean;
}

export function LoanRepaymentDialog({
    open,
    onOpenChange,
    loan,
    withdrawalAmount,
    onPayLoan,
    onRequestWithdrawal,
    processing
}: LoanRepaymentDialogProps) {
    if (!loan) return null;

    const canAutoClear = withdrawalAmount >= (loan.total_payable || 0);
    const loanAmount = loan.total_payable || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:border-gray-700">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                        <AlertTriangle className="h-6 w-6" />
                        <DialogTitle>Outstanding Loan Detected</DialogTitle>
                    </div>
                    <DialogDescription className="dark:text-gray-400">
                        You have an active loan of <span className="font-bold text-gray-900 dark:text-white">${loanAmount.toLocaleString()}</span>.
                        <br /><br />
                        To ensure platform sustainability, plan withdrawals are restricted while loans are active.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h4 className="font-semibold text-amber-800 dark:text-amber-400 mb-2">Policy Requirement</h4>
                        <ul className="text-sm text-amber-900 dark:text-amber-300 space-y-2 list-disc pl-4">
                            <li>Priority is given to clearing outstanding debts.</li>
                            <li>Direct bank withdrawals require Admin Approval.</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-3">
                    {canAutoClear ? (
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6"
                            onClick={onPayLoan}
                            disabled={processing}
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-bold">Pay Loan & Withdraw Remaining</div>
                                    <div className="text-xs opacity-90">
                                        Instantly clears loan (${loanAmount}) and withdraws balance (${(withdrawalAmount - loanAmount).toLocaleString()})
                                    </div>
                                </div>
                            </div>
                        </Button>
                    ) : (
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6"
                            onClick={onPayLoan}
                            disabled={processing}
                        >
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-bold">Pay Partial Loan (${withdrawalAmount.toLocaleString()})</div>
                                    <div className="text-xs opacity-90">
                                        Reduces your loan balance.
                                    </div>
                                </div>
                            </div>
                        </Button>
                    )}

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        onClick={onRequestWithdrawal}
                        disabled={processing}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        Request Bank Withdrawal (Requires Admin Approval)
                    </Button>

                    <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
