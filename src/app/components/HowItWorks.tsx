import { UserPlus, Users2, Wallet, PartyPopper } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    icon: UserPlus,
    step: "Step 1",
    title: "Create Your Account",
    description: "Sign up in minutes with just your phone number and basic information. It's quick, easy, and secure."
  },
  {
    icon: Users2,
    step: "Step 2",
    title: "Join or Create a Group",
    description: "Start your own savings group or join an existing one. Invite friends, family, or trusted members."
  },
  {
    icon: Wallet,
    step: "Step 3",
    title: "Make Contributions",
    description: "Set up automatic contributions or make manual deposits. Track everyone's progress in real-time."
  },
  {
    icon: PartyPopper,
    step: "Step 4",
    title: "Receive Your Payout",
    description: "When it's your turn, receive the pooled amount directly to your account. Use it for your goals!"
  }
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl">
            How <span className="text-emerald-600">It Works</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Getting started is simple. Follow these four easy steps to begin your savings journey.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
              >
                {/* Connecting Line - Hidden on last item */}
                {index < steps.length - 1 && (
                  <motion.div
                    className="hidden lg:block absolute top-16 left-1/2 w-full h-0.5 bg-emerald-200 z-0"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.2 + 0.5 }}
                  />
                )}
                
                <motion.div
                  className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow z-10"
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-600 text-white"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="size-8" />
                  </motion.div>
                  
                  <div className="text-sm text-emerald-600 mb-2">{item.step}</div>
                  <h3 className="text-xl mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}