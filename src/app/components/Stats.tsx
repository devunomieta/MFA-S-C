import { motion } from "framer-motion";
import { DollarSign, Users, Target, Award } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";

const stats = [
  {
    icon: DollarSign,
    value: "₦2.5B+",
    label: "Total Savings Pooled",
    description: "Collectively saved by our members",
    color: "from-emerald-600 to-teal-600"
  },
  {
    icon: Users,
    value: "50,000+",
    label: "Active Savers",
    description: "Trust our platform daily",
    color: "from-blue-600 to-emerald-600"
  },
  {
    icon: Target,
    value: "95%",
    label: "Goals Achieved",
    description: "Members reaching their targets",
    color: "from-emerald-600 to-teal-600"
  },
  {
    icon: Award,
    value: "4.9/5",
    label: "Average Rating",
    description: "From satisfied users",
    color: "from-emerald-600 to-teal-600"
  }
];

export function Stats() {
  return (
    <section className="py-24 md:py-32 bg-white relative overflow-hidden">
      {/* Subtle background patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-50 rounded-full filter blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-50 rounded-full filter blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-black text-slate-950">
            Our <span className="text-emerald-600">Impact</span> in Numbers
          </h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
            Real results from real people building their financial future together
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                <Card className="bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-500 h-full rounded-[2rem] overflow-hidden group">
                  <CardContent className="pt-8 p-8">
                    <motion.div
                      className={`mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-emerald-500/20`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="size-8 text-white" />
                    </motion.div>
                    <motion.div
                      className="text-4xl font-black text-slate-950 mb-2 tracking-tighter"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 + 0.3, type: "spring" }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-lg font-bold text-slate-900 mb-1">{stat.label}</div>
                    <div className="text-sm font-medium text-slate-500">{stat.description}</div>
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
