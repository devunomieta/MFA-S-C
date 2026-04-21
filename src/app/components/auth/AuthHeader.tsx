import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchBranding = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
            if (data?.value?.logo_url) {
                setLogoUrl(data.value.logo_url);
            }
        };
        fetchBranding();
    }, []);

    return (
        <div className="text-center mb-10">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, delay: 0.2 }}
                className="inline-flex items-center justify-center mb-6"
            >
                {logoUrl ? (
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
                        <ImageWithFallback src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
                    </div>
                ) : (
                    <div className="size-16 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center">
                        <ShieldCheck className="text-white size-8" />
                    </div>
                )}
            </motion.div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                {title}
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 font-medium">
                {subtitle}
            </p>
        </div>
    );
}
