import { motion } from "motion/react";
import { format } from "date-fns";

interface PlanCardProps {
    name: string;
    balance: number;
    currency?: string;
    expiryDate?: string;
    index: number;
    total: number;
    onClick: () => void;
    type?: 'plan' | 'wallet';
    status?: string;
}

export function PlanCard({ name, balance, currency = "$", expiryDate, index, total, onClick, type = 'plan' }: PlanCardProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    // Card colors/gradients based on index to differentiate them visually
    // Wallet styling is special (Premium Black/Gold)
    const gradients = [
        "from-emerald-600 to-emerald-900",
        "from-blue-600 to-blue-900",
        "from-purple-600 to-purple-900",
        "from-orange-600 to-orange-900",
        "from-teal-600 to-teal-900"
    ];

    const bgGradient = type === 'wallet'
        ? "from-gray-900 via-gray-800 to-black border-yellow-500/30"
        : gradients[index % gradients.length];

    // Animation variants
    const offset = index * 4; // pixels down
    const scale = 1 - (index * 0.05); // shrink slightly
    const zIndex = total - index;
    const opacity = 1 - (index * 0.15); // fade slightly further back

    return (
        <motion.div
            layout
            initial={false}
            whileTap={{ scale: 0.98 }}
            animate={{
                y: offset,
                scale: scale,
                zIndex: zIndex,
                opacity: opacity,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onTap={onClick}
            className={`absolute top-0 w-full aspect-[1.586] rounded-xl shadow-2xl overflow-hidden cursor-pointer border border-white/10 bg-gradient-to-br ${bgGradient}`}
            style={{ transformOrigin: "top center" }}
        >
            <div className="relative h-full p-6 flex flex-col justify-between text-white">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className={`text-[10px] uppercase tracking-wider ${type === 'wallet' ? 'text-yellow-500 font-bold' : 'opacity-80'}`}>
                                {type === 'wallet' ? 'Main Wallet' : 'Savings Plan'}
                            </p>
                            {status && type === 'plan' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold border ${status === 'active' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                                        status === 'matured' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                                            status === 'pending_activation' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' :
                                                'bg-white/10 border-white/20 text-white/80'
                                    }`}>
                                    {status.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                        <h3 className="font-bold text-lg leading-tight truncate max-w-[180px]">{name}</h3>
                    </div>
                    {/* Chip Visual */}
                    <div className={`w-10 h-8 rounded-md relative overflow-hidden flex items-center justify-center border ${type === 'wallet' ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white/10 border-white/20'}`}>
                        <div className={`w-full h-[1px] absolute top-1/2 -translate-y-1/2 ${type === 'wallet' ? 'bg-yellow-500/50' : 'bg-white/20'}`} />
                        <div className={`h-full w-[1px] absolute left-1/2 -translate-x-1/2 ${type === 'wallet' ? 'bg-yellow-500/50' : 'bg-white/20'}`} />
                        <div className={`w-6 h-5 border rounded-sm ${type === 'wallet' ? 'border-yellow-500/50' : 'border-white/20'}`} />
                    </div>
                </div>

                {/* Balance */}
                <div className="my-2">
                    <p className="text-xs opacity-70 mb-1">{type === 'wallet' ? 'Available Balance' : 'Current Balance'}</p>
                    <div className={`text-3xl font-mono font-bold tracking-tight ${type === 'wallet' ? 'text-yellow-50 ' : ''}`}>
                        {currency}{formatCurrency(balance)}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-end">
                    <div>
                        {type === 'plan' && expiryDate && (
                            <>
                                <p className="text-[10px] opacity-60 uppercase mb-0.5">Active Until</p>
                                <p className="font-mono text-sm">{format(new Date(expiryDate), "MM/yy")}</p>
                            </>
                        )}
                        {type === 'wallet' && (
                            <p className="text-[10px] text-yellow-500/80 uppercase tracking-widest"></p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {/* Circles decoration */}
                        <div className="w-8 h-8 rounded-full bg-white/20 -mr-4 mix-blend-overlay" />
                        <div className="w-8 h-8 rounded-full bg-white/20 mix-blend-overlay" />
                    </div>
                </div>

                {/* Shimmer overlay for premium feel */}
                <div className={`absolute inset-0 bg-gradient-to-tr pointer-events-none ${type === 'wallet' ? 'from-yellow-500/0 via-yellow-500/5 to-yellow-500/0' : 'from-white/0 via-white/5 to-white/0'}`} />
            </div>
        </motion.div>
    );
}
