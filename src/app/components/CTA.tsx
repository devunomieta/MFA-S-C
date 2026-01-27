import { Button } from "@/app/components/ui/button";
import { ArrowRight, Smartphone } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { motion } from "motion/react";

export function CTA() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-emerald-600 to-teal-600 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <motion.div
        className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full filter blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-10 left-10 w-64 h-64 bg-white/10 rounded-full filter blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6 md:space-y-8"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl">
              Ready to Start Your Savings Journey?
            </h2>
            <p className="text-lg md:text-xl text-emerald-50">
              Join thousands of savers who are building wealth together. Create your account 
              today and take the first step towards financial freedom.
            </p>
            
            <div className="space-y-4">
              {[
                { title: "No hidden fees or charges", subtitle: "100% transparent pricing" },
                { title: "Start with as little as ₦1,000", subtitle: "Flexible contribution amounts" },
                { title: "Instant payouts when it's your turn", subtitle: "Fast and reliable transfers" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <div>{item.title}</div>
                    <div className="text-sm text-emerald-100">{item.subtitle}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50">
                Get Started Free
                <ArrowRight className="ml-2 size-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Smartphone className="mr-2 size-5" />
                Download App
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              className="absolute inset-0 bg-white/10 rounded-3xl transform -rotate-3"
              animate={{ rotate: [-3, -5, -3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1681826291722-70bd7e9e6fc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2JpbGUlMjBiYW5raW5nJTIwYXBwfGVufDF8fHx8MTc2OTM4NzMyN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="Mobile app preview"
              className="relative w-full h-[400px] lg:h-[500px] object-cover rounded-3xl shadow-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}