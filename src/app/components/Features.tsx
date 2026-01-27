import { Users, Shield, TrendingUp, Clock, Bell, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { motion } from "motion/react";

const features = [
  {
    icon: Users,
    title: "Group Savings",
    description: "Create or join savings groups with friends, family, or colleagues. Save together towards common goals."
  },
  {
    icon: Shield,
    title: "100% Secure",
    description: "Bank-grade security with encryption ensures your money and data are always protected."
  },
  {
    icon: TrendingUp,
    title: "Earn Interest",
    description: "Watch your savings grow with competitive interest rates on all your contributions."
  },
  {
    icon: Clock,
    title: "Flexible Schedules",
    description: "Daily, weekly, or monthly contributions. Choose a schedule that works for your lifestyle."
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Never miss a contribution with automated notifications and payment reminders."
  },
  {
    icon: Award,
    title: "Trusted Platform",
    description: "Join thousands of satisfied savers who have achieved their financial goals with us."
  }
];

export function Features() {
  return (
    <section className="py-20 md:py-32 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl">
            Why Choose Our <span className="text-emerald-600">Ajo Platform</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to save smarter, faster, and together with the people you trust.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card className="border-2 hover:border-emerald-200 transition-colors h-full">
                  <CardHeader>
                    <motion.div
                      className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-100"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon className="size-6 text-emerald-600" />
                    </motion.div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
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