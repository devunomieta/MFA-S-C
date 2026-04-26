import { useEffect, useState } from "react";

import { Instagram, Mail, Phone, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { supabase } from "@/lib/supabase";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47V18.5c0 1.94-.73 3.89-2.2 5.1-1.41 1.13-3.26 1.63-5.06 1.34-1.72-.25-3.32-1.2-4.32-2.61-1.26-1.74-1.52-4.14-.65-6.07.72-1.63 2.15-2.97 3.88-3.5 1.09-.32 2.27-.3 3.39-.01v4.13c-.93-.24-1.99-.21-2.9.15-.99.37-1.84 1.19-2.11 2.2-.28 1.05.02 2.23.75 3.03.62.72 1.58 1.13 2.5 1.13 1.06 0 2.1-.55 2.65-1.45.45-.71.49-1.58.49-2.39V.02z" />
  </svg>
);

export function Footer() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "general")
        .single();
      if (data?.value?.logo_url) setLogoUrl(data.value.logo_url);
    };
    fetchBranding();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        toast.info("You're already in our inner circle! Stay tuned for updates.");
        setEmail("");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.trim().toLowerCase() });

      if (error) throw error;
      toast.success("Welcome! You've successfully subscribed to our updates.");
      setEmail("");
    } catch (error: any) {
      console.error("Subscription Error:", error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400">
      <div className="container mx-auto px-4 py-20">

        {/* ── Brand block — centered, full width ─────────────────────── */}
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
          <div>
            {logoUrl ? (
              <BrandLogo src={logoUrl} alt="Mary's Thrift Services" size="sm" />
            ) : (
              <span className="text-2xl font-black text-white tracking-tighter">
                Mary's Thrift<span className="text-emerald-500">.</span>
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-500 max-w-sm">
            Redefining personalized savings for the digital age. Save, grow, and prosper with an
            assisted disciplined system.
          </p>
        </div>

        {/* ── Separator ──────────────────────────────────────────────── */}
        <div className="border-t border-slate-800/60 mb-14" />

        {/* ── Four columns ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">

          {/* Platform */}
          <div className="space-y-5">
            <h4 className="text-white font-bold uppercase tracking-widest text-[11px]">Platform</h4>
            <ul className="space-y-3">
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#plans" },
                { label: "Contact", href: "#contact" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm hover:text-emerald-400 transition-colors font-medium">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-5">
            <h4 className="text-white font-bold uppercase tracking-widest text-[11px]">Legal</h4>
            <ul className="space-y-3">
              {[
                { name: "Privacy Policy", href: "/privacy" },
                { name: "Terms of Service", href: "/terms" },
                { name: "Compliance", href: "/compliance" },
                { name: "Security", href: "/security" },
              ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm hover:text-emerald-400 transition-colors font-medium">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-5">
            <h4 className="text-white font-bold uppercase tracking-widest text-[11px]">Connect</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
                  <Mail className="size-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Email</div>
                  <a href="mailto:marysthriftservices@gmail.com" className="text-sm hover:text-white transition-colors font-semibold text-slate-300 break-all">
                    marysthriftservices@gmail.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
                  <Phone className="size-4 text-emerald-500" />
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Phone</div>
                  <a href="tel:+2349074049667" className="text-sm hover:text-white transition-colors font-semibold text-slate-300">
                    09074049667
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Stay Updated */}
          <div className="space-y-5">
            <h4 className="text-white font-bold uppercase tracking-widest text-[11px]">Stay Updated</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Get updates on new plans, features, and community news.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                required
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-900 border-slate-800 rounded-xl focus:ring-emerald-500 text-white h-10 flex-1 min-w-0 text-sm"
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 px-3 shadow-lg shadow-emerald-500/20 shrink-0"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </form>
            <div className="flex gap-3">
              <a
                href="https://instagram.com/marysthriftservices"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 hover:border-emerald-500/50 hover:text-white transition-all"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://tiktok.com/@marysthriftservices"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 hover:border-emerald-500/50 hover:text-white transition-all"
              >
                <TikTokIcon className="size-4" />
              </a>
            </div>
          </div>

        </div>

        {/* ── Bottom bar ──────────────────────────────────────────────── */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p className="font-medium text-slate-500">
            &copy; {new Date().getFullYear()} Mary's Thrift Services. All rights reserved.
          </p>
          <a
            href="https://devunomieta.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-600 hover:text-slate-400 transition-colors tracking-wide"
          >
            Developed by{" "}
            <span className="text-slate-500 font-bold hover:text-emerald-500 transition-colors">
              @devunomieta
            </span>
          </a>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-500 uppercase tracking-widest">
              CAC Registered BN-8950808
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
