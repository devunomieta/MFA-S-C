import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import {
    Calendar,
    Clock,
    Users,
    Target,
    Zap,
    ShieldCheck,
    ArrowRight,
    RefreshCcw,
    CheckCircle2,
    MessageSquare
} from "lucide-react";

interface PlanRecommenderProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    inline?: boolean;
}

type Step = 'frequency' | 'goal' | 'duration' | 'result';

interface Selections {
    frequency: string;
    goal: string;
    duration: string;
}

export function PlanRecommender({ open, onOpenChange, inline }: PlanRecommenderProps) {
    const [step, setStep] = useState<Step>('frequency');
    const [selections, setSelections] = useState<Selections>({
        frequency: '',
        goal: '',
        duration: ''
    });

    const reset = () => {
        setStep('frequency');
        setSelections({ frequency: '', goal: '', duration: '' });
    };

    const handleFrequency = (val: string) => {
        setSelections(prev => ({ ...prev, frequency: val }));
        if (val === 'Daily' || val === 'Monthly' || val === 'Lump Sum') {
            setStep('result');
        } else {
            setStep('goal');
        }
    };

    const handleGoal = (val: string) => {
        setSelections(prev => ({ ...prev, goal: val }));
        if (val === 'Community') {
            setStep('result');
        } else {
            setStep('duration');
        }
    };

    const handleDuration = (val: string) => {
        setSelections(prev => ({ ...prev, duration: val }));
        setStep('result');
    };

    const getRecommendations = () => {
        const { frequency, goal, duration } = selections;

        if (frequency === 'Daily') return [plans.daily];
        if (frequency === 'Monthly') return [plans.monthly];
        if (frequency === 'Lump Sum') return [plans.stepup];
        if (goal === 'Community') return [plans.ajo];

        if (goal === 'Discipline') return [plans.anchor];

        if (duration === 'Long Term') return [plans.marathon];
        return [plans.sprint];
    };

    const recommendations = getRecommendations();

    const Content = (
        <div className={inline ? "bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl w-full" : ""}>
            <div className="bg-emerald-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative text-left">
                    <h2 className="text-2xl font-black text-white">Save-Plan Explorer</h2>
                    <p className="text-emerald-50/80 font-medium">
                        Answer 3 quick questions to find your perfect saving frequency and strategy.
                    </p>
                </div>
            </div>

            <div className="p-8">
                <AnimatePresence mode="wait">
                    {step === 'frequency' && (
                        <motion.div
                            key="freq"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-left">How often do you want to save?</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <OptionButton
                                    icon={<Zap className="size-5" />}
                                    title="Daily"
                                    description="Small frequent amounts"
                                    onClick={() => handleFrequency('Daily')}
                                />
                                <OptionButton
                                    icon={<Calendar className="size-5" />}
                                    title="Weekly"
                                    description="Structured weekly deposits"
                                    onClick={() => handleFrequency('Weekly')}
                                />
                                <OptionButton
                                    icon={<Clock className="size-5" />}
                                    title="Monthly"
                                    description="Once a month commitment"
                                    onClick={() => handleFrequency('Monthly')}
                                />
                                <OptionButton
                                    icon={<ShieldCheck className="size-5" />}
                                    title="Lump Sum"
                                    description="One-off fixed deposits"
                                    onClick={() => handleFrequency('Lump Sum')}
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === 'goal' && (
                        <motion.div
                            key="goal"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-left">What's your primary goal?</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <OptionButton
                                    icon={<Target className="size-5" />}
                                    title="Personal Target"
                                    description="Saving for a specific project"
                                    onClick={() => handleGoal('Target')}
                                />
                                <OptionButton
                                    icon={<Users className="size-5" />}
                                    title="Community Saving"
                                    description="Ajo/Esusu style pooling"
                                    onClick={() => handleGoal('Community')}
                                />
                                <OptionButton
                                    icon={<ShieldCheck className="size-5" />}
                                    title="Strict Discipline"
                                    description="Avoid impulsive spending"
                                    onClick={() => handleGoal('Discipline')}
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === 'duration' && (
                        <motion.div
                            key="duration"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-left">How long are you saving for?</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <OptionButton
                                    icon={<Clock className="size-5" />}
                                    title="Short/Medium Term"
                                    description="3 to 9 months"
                                    onClick={() => handleDuration('Short Term')}
                                />
                                <OptionButton
                                    icon={<Target className="size-5" />}
                                    title="Long Term"
                                    description="12 months or more"
                                    onClick={() => handleDuration('Long Term')}
                                />
                            </div>
                        </motion.div>
                    )}

                    {step === 'result' && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-2">
                                    <CheckCircle2 className="size-8 text-emerald-600" />
                                </div>
                                <h3 className="text-xl font-black text-slate-950 dark:text-white">We found your match!</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">Based on your preferences, these plans suit you best:</p>
                            </div>

                            <div className="space-y-3">
                                {recommendations.map((p, i) => (
                                    <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-emerald-500 transition-all text-left">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-slate-950 dark:text-white text-lg">{p.name}</h4>
                                            <Badge className={p.badgeColor}>{p.type}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{p.description}</p>
                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                                            Select this Plan
                                            <ArrowRight className="ml-2 size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <Button
                                    onClick={() => window.open('https://wa.me/2348012345678', '_blank')}
                                    className="w-full bg-white dark:bg-slate-900 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl font-bold h-12"
                                >
                                    <MessageSquare className="mr-2 size-5" />
                                    Message Admin on WhatsApp
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={reset}
                                    className="w-full text-slate-500 hover:text-emerald-600 font-bold"
                                >
                                    <RefreshCcw className="mr-2 size-4" />
                                    Start Over
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    if (inline) return Content;

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (onOpenChange) onOpenChange(val);
            if (!val) setTimeout(reset, 300);
        }}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden p-0 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {Content}
            </DialogContent>
        </Dialog>
    );
}

function OptionButton({ icon, title, description, onClick }: {
    icon: React.ReactNode,
    title: string,
    description: string,
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 p-4 text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group active:scale-[0.98]"
        >
            <div className="size-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                {icon}
            </div>
            <div>
                <p className="font-bold text-slate-900 dark:text-white">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
            </div>
            <ArrowRight className="ml-auto size-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </button>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${className}`}>
            {children}
        </span>
    );
}

const plans = {
    daily: {
        name: "Daily Drop",
        type: "Micro-Savings",
        description: "Perfect for inconsistent income earners. Save daily and build a habit.",
        badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200"
    },
    sprint: {
        name: "Saving Sprint",
        type: "Growth",
        description: "A fast-paced weekly saving challenge for target projects.",
        badgeColor: "bg-blue-100 text-blue-700 border-blue-200"
    },
    monthly: {
        name: "Monthly Bloom",
        type: "Stable",
        description: "Set a monthly target and watch your wealth blossom steadily.",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200"
    },
    marathon: {
        name: "Marathon Savings",
        type: "Wealth",
        description: "Long-term commitment for massive returns. 52-week strategy.",
        badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200"
    },
    anchor: {
        name: "Anchor Sprint",
        type: "Discipline",
        description: "Strict rules. No withdrawals until target. The ultimate discipline builder.",
        badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200"
    },
    stepup: {
        name: "Step-Up Fixed",
        type: "Premium",
        description: "Deposit a lump sum and get fixed guaranteed returns. Rapid growth.",
        badgeColor: "bg-teal-100 text-teal-700 border-teal-200"
    },
    ajo: {
        name: "Digital Ajo Circle",
        type: "Community",
        description: "Traditional pooling made digital. Take turns cashing out with friends.",
        badgeColor: "bg-orange-100 text-orange-700 border-orange-200"
    }
};
