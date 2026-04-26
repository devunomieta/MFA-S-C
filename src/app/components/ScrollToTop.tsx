import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // 5% of total scrollable height
      const threshold = document.documentElement.scrollHeight * 0.05;
      setVisible(window.scrollY > threshold);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // check on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="scroll-top"
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          // Sits directly above the WhatsApp widget (bottom-6 + 56px widget + 8px gap = ~24)
          className="fixed bottom-24 right-6 z-[998] w-11 h-11 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white shadow-xl shadow-black/30 flex items-center justify-center transition-colors group"
        >
          <ArrowUp className="size-5 group-hover:-translate-y-0.5 transition-transform" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
