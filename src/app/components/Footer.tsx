import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

export function Footer() {
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
    <footer className="bg-slate-950 text-slate-400">
      <div className="container mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <ImageWithFallback src={logoUrl} alt="AjoSave" className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-2xl font-black text-white tracking-tighter">AjoSave<span className="text-emerald-500">.</span></span>
              )}
            </div>
            <p className="text-lg font-medium leading-relaxed max-w-sm">
              Reinventing community finance for the digital age. Save, grow, and prosper with the people you trust.
            </p>
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Stay Updated</h4>
              <div className="flex gap-2 max-w-sm">
                <Input
                  placeholder="Enter your email"
                  className="bg-slate-900 border-slate-800 rounded-xl focus:ring-emerald-500 text-white h-12"
                />
                <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 px-4 shadow-lg shadow-emerald-500/20">
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-5">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 hover:border-emerald-500/50 hover:text-white transition-all">
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Groups */}
          <div className="lg:col-span-1" /> {/* Spacer */}

          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Platform</h4>
            <ul className="space-y-4">
              <li><a href="#how-it-works" className="hover:text-emerald-400 transition-colors font-medium">How It Works</a></li>
              <li><a href="#features" className="hover:text-emerald-400 transition-colors font-medium">Features</a></li>
              <li><a href="#plans" className="hover:text-emerald-400 transition-colors font-medium">Pricing</a></li>
              <li><a href="#contact" className="hover:text-emerald-400 transition-colors font-medium">Contact</a></li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Legal</h4>
            <ul className="space-y-4">
              {["Privacy Policy", "Terms of Service", "Compliance", "Security"].map((item) => (
                <li key={item}><a href="#" className="hover:text-emerald-400 transition-colors font-medium">{item}</a></li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-3 space-y-6">
            <h4 className="text-white font-bold uppercase tracking-widest text-xs">Connect</h4>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
                  <Mail className="size-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Email Us</div>
                  <a href="mailto:support@ajosave.com" className="hover:text-white transition-colors font-bold text-slate-200">support@ajosave.com</a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
                  <Phone className="size-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Call Us</div>
                  <a href="tel:+2348012345678" className="hover:text-white transition-colors font-bold text-slate-200">+234 801 234 5678</a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm font-medium">
            &copy; 2026 AjoSave. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CAC Registered BN-8950808</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
