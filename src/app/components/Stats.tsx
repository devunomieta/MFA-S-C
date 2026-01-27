import { motion } from "motion/react";
import { DollarSign, Users, Target, Award } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";

const stats = [
  {
    icon: DollarSign,
    value: "₦2.5B+",
    label: "Total Savings Pooled",
    description: "Collectively saved by our members",
    color: "from-emerald-500 to-teal-500"
  },
  {
    icon: Users,
    value: "50,000+",
    label: "Active Savers",
    description: "Trust our platform daily",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Target,
    value: "95%",
    label: "Goals Achieved",
    description: "Members reaching their targets",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Award,
    value: "4.9/5",
    label: "Average Rating",
    description: "From satisfied users",
    color: "from-orange-500 to-yellow-500"
  }
];

export function Stats() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
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
            Our <span className="text-emerald-400">Impact</span> in Numbers
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Real results from real people building their financial future together
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 transition-all h-full">
                  <CardContent className="pt-6">
                    <motion.div
                      className={`mb-4 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${stat.color}`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="size-7 text-white" />
                    </motion.div>
                    <motion.div
                      className="text-4xl mb-2 text-white"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.3, type: "spring" }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-lg text-white mb-1">{stat.label}</div>
                    <div className="text-sm text-gray-400">{stat.description}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
