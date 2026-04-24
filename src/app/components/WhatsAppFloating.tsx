import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export function WhatsAppFloating() {
  const phoneNumber = "+2349074049667";
  const message = "Hello Mary's Thrift Services, I'd like to learn more about how to start saving!";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-[999]"
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl hover:bg-[#128C7E] transition-colors relative group"
        aria-label="Contact on WhatsApp"
      >
        <MessageCircle className="size-8" />
        <span className="absolute right-full mr-4 px-3 py-1 bg-white text-slate-900 text-xs font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Chat with us!
        </span>
      </a>
    </motion.div>
  );
}
