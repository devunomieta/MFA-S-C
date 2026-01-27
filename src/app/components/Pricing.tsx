import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for individuals just getting started",
    features: [
      "Join up to 2 groups",
      "Basic savings tracking",
      "Monthly contributions",
      "Email notifications",
      "Standard support"
    ],
    popular: false
  },
  {
    name: "Premium",
    price: "₦500",
    period: "/month",
    description: "Best for active savers and group creators",
    features: [
      "Unlimited groups",
      "Advanced analytics",
      "Daily/Weekly/Monthly options",
      "Priority SMS & Email alerts",
      "Priority support",
      "Custom group settings",
      "Auto-save features"
    ],
    popular: true
  },
  {
    name: "Business",
    price: "₦2,000",
    period: "/month",
    description: "For organizations and large groups",
    features: [
      "Everything in Premium",
      "Dedicated account manager",
      "Custom integrations",
      "Advanced reporting",
      "Multi-admin support",
      "Bulk member management",
      "API access",
      "White-label options"
    ],
    popular: false
  }
];

export function Pricing() {
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
            Simple, <span className="text-emerald-600">Transparent Pricing</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a plan that fits your savings goals. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="relative"
            >
              {plan.popular && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-1 rounded-full text-sm flex items-center gap-1">
                    <Sparkles className="size-4" />
                    Most Popular
                  </div>
                </motion.div>
              )}
              
              <Card className={`h-full ${plan.popular ? 'border-emerald-500 border-2 shadow-xl' : 'border-2'}`}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                  <div className="pt-4">
                    <span className="text-4xl">{plan.price}</span>
                    {plan.period && <span className="text-gray-600">{plan.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.1 + featureIndex * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-0.5">
                          <Check className="size-5 text-emerald-600" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12 text-gray-600"
        >
          <p>All plans include bank-grade security and 24/7 customer support</p>
        </motion.div>
      </div>
    </section>
  );
}
