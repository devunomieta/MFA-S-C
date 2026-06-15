import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { supabase } from "@/lib/supabase";

export function AuthHeader({
  title,
  subtitle,
  align = "center",
  hideLogo = false,
  hideText = false,
  className = "mb-10",
}: {
  title: string;
  subtitle: string;
  align?: "center" | "left";
  hideLogo?: boolean;
  hideText?: boolean;
  className?: string;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "general")
        .single();
      if (data?.value?.logo_url) {
        setLogoUrl(data.value.logo_url);
      }
    };
    fetchBranding();
  }, []);

  return (
    <div className={`relative ${className} ${align === "center" ? "text-center" : "text-left"}`}>
      {!hideLogo && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, delay: 0.2 }}
          className={`inline-flex items-center mb-6 ${align === "center" ? "justify-center" : "justify-start"}`}
        >
          {logoUrl ? (
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              <BrandLogo src={logoUrl} alt="Logo" size="md" />
            </Link>
          ) : (
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              <div className="size-16 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center">
                <ShieldCheck className="text-white size-8" />
              </div>
            </Link>
          )}
        </motion.div>
      )}
      {!hideText && (
        <>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">{subtitle}</p>
        </>
      )}
    </div>
  );
}
