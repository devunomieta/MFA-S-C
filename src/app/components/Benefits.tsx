import { motion } from "motion/react";
import { Zap, Shield, TrendingUp, Users, Bell, Award, Lock, Star } from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "Group Savings",
    description: "Save together with friends and family towards common financial goals",
    gradient: "from-emerald-400 to-teal-500"
  },
  {
    icon: Shield,
    title: "100% Secure",
    description: "Bank-grade encryption ensures your funds and data are always protected",
    gradient: "from-blue-400 to-indigo-500"
  },
  {
    icon: TrendingUp,
    title: "Earn More",
    description: "Enjoy competitive interest rates that help your savings grow faster",
    gradient: "from-rose-400 to-pink-500"
  },
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Start your savings journey in minutes with our streamlined registration",
    gradient: "from-amber-400 to-orange-500"
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Automated alerts so you never miss a contribution or payout turn",
    gradient: "from-purple-400 to-violet-500"
  },
  {
    icon: Award,
    title: "Trusted Platform",
    description: "Join thousands of successful savers in our growing community",
    gradient: "from-cyan-400 to-sky-500"
  }
];

export function Benefits() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Built for <span className="text-emerald-600">Your Success</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Combining traditional P2P savings values with world-class modern technology
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="relative group"
              >
                {/* Gradient background */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                />

                {/* Card content */}
                <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow border-2 border-gray-100 group-hover:border-emerald-200 h-full">
                  {/* Animated icon container */}
                  <motion.div
                    className={`mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.gradient}`}
                    whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="size-8 text-white" />
                  </motion.div>

                  <h3 className="text-xl mb-3">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>

                  {/* Decorative corner element */}
                  <motion.div
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ scale: 1.2 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-gray-600 mb-4">
            Ready to experience the future of group savings?
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Start Saving Today
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
