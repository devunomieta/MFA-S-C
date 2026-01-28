import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* About */}
          <div>
            <div className="text-2xl text-white mb-4">
              {logoUrl ? (
                <img src={logoUrl} alt="AjoSave" className="h-8 w-auto object-contain bg-white/10 p-1 rounded" />
              ) : (
                "AjoSave"
              )}
            </div>
            <p className="text-sm mb-4">
              The modern platform for group savings and contributions. Save together, grow together.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Facebook className="size-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Twitter className="size-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Instagram className="size-5" />
              </a>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                <Linkedin className="size-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Blog</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Compliance</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Security</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="size-5 flex-shrink-0 mt-0.5" />
                <a href="mailto:support@ajosave.com" className="hover:text-emerald-400 transition-colors">
                  support@ajosave.com
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="size-5 flex-shrink-0 mt-0.5" />
                <a href="tel:+2348012345678" className="hover:text-emerald-400 transition-colors">
                  +234 801 234 5678
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="size-5 flex-shrink-0 mt-0.5" />
                <span>123 Savings Street, Lagos, Nigeria</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; 2026 AjoSave. All rights reserved.</p>
            <p className="text-gray-400">
              Licensed and regulated by the Central Bank of Nigeria
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
