import { motion } from "framer-motion";

export function TrustBar() {
    const logos = [
        { name: "CAC", label: "Registered" },
        { name: "Safenet", label: "Secure" },
        { name: "PCIDSS", label: "Compliant" },
        { name: "Interswitch", label: "Partner" },
        { name: "AjoSave", label: "Community" },
    ];

    return (
        <div className="bg-white py-12 border-y border-gray-100/50">
            <div className="container mx-auto px-4">
                <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">
                    Trusted by over 50,000+ members and community partners
                </p>
                <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    {logos.map((logo, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex flex-col items-center group"
                        >
                            <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors">
                                {logo.name}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{logo.label}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
