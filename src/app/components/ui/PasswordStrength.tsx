import { Check, X } from "lucide-react";
import { PasswordFeedback } from "@/lib/validation";

interface PasswordStrengthProps {
    feedback: PasswordFeedback;
    passwordLength: number;
}

export function PasswordStrength({ feedback, passwordLength }: PasswordStrengthProps) {
    if (passwordLength === 0) return null;

    const { requirements, score } = feedback;

    const strengthLabels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
    const strengthColors = [
        "bg-red-500",
        "bg-orange-500",
        "bg-yellow-500",
        "bg-emerald-500",
        "bg-emerald-600",
    ];

    return (
        <div className="space-y-3 mt-2">
            <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-500">Security Strength</span>
                <span className={`text-xs font-bold ${score > 2 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {strengthLabels[score]}
                </span>
            </div>

            <div className="flex gap-1 h-1.5 w-full">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className={`h-full flex-1 rounded-full transition-colors duration-300 ${i < score ? strengthColors[score] : "bg-gray-200 dark:bg-gray-700"
                            }`}
                    />
                ))}
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                <RequirementItem label="Min 8 characters" met={requirements.length} />
                <RequirementItem label="Uppercase letter" met={requirements.uppercase} />
                <RequirementItem label="One number" met={requirements.number} />
                <RequirementItem label="Special character" met={requirements.special} />
            </ul>
        </div>
    );
}

function RequirementItem({ label, met }: { label: string; met: boolean }) {
    return (
        <li className="flex items-center gap-2">
            {met ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
                <X className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            )}
            <span className={`text-[11px] ${met ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500'}`}>
                {label}
            </span>
        </li>
    );
}
