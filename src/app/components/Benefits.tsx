import { motion } from "motion/react";
import { Zap, Shield, HeartHandshake, TrendingUp, Smartphone, Lock } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Instant Setup",
    description: "Create your account and start saving in under 3 minutes",
    gradient: "from-yellow-400 to-orange-500"
  },
  {
    icon: Shield,
    title: "Protected Funds",
    description: "Your money is insured and protected by regulatory standards",
    gradient: "from-blue-400 to-indigo-500"
  },
  {
    icon: HeartHandshake,
    title: "Community Support",
    description: "Join a supportive community of savers helping each other succeed",
    gradient: "from-pink-400 to-rose-500"
  },
  {
    icon: TrendingUp,
    title: "Financial Growth",
    description: "Earn competitive interest rates on all your contributions",
    gradient: "from-emerald-400 to-teal-500"
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Manage your savings anywhere with our mobile-optimized platform",
    gradient: "from-purple-400 to-violet-500"
  },
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "256-bit encryption keeps your data and funds secure",
    gradient: "from-cyan-400 to-blue-500"
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
          <h2 className="text-3xl md:text-4xl lg:text-5xl">
            Built for <span className="text-emerald-600">Your Success</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the perfect blend of traditional Ajo values with modern technology
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
