import { motion } from "framer-motion";
import { Check, X, Shield, AlertTriangle } from "lucide-react";

export function Comparison() {
  const points = [
    {
      feature: "Money Safety",
      traditional: "Person fit run with your money",
      platform: "Your money is 100% secured",
      better: true,
    },
    {
      feature: "See your Balance",
      traditional: "You no fit know how much you get",
      platform: "Check your balance any time",
      better: true,
    },
    {
      feature: "Commitment",
      traditional: "Hard to save every time",
      platform: "Automated daily/weekly savings",
      better: true,
    },
    {
      feature: "Trust",
      traditional: "Saving with person you no know",
      platform: "CAC Registered & Legally Secure",
      better: true,
    },
    {
      feature: "Rules",
      traditional: "People fit fail to pay",
      platform: "System makes sure everyone pays",
      better: true,
    },
  ];

  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Why upgrade from <span className="text-slate-400">Manual Ajo?</span>
          </h2>
          <p className="text-lg text-slate-600 font-medium">
            Stop the old risky way of saving. Mary's Thrift Services is the smarter and safer way to
            reach your goals.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Traditional */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm opacity-60"
            >
              <div className="flex items-center gap-3 mb-8 text-slate-500">
                <AlertTriangle className="size-6" />
                <h3 className="text-xl font-bold">Traditional Ajo</h3>
              </div>
              <ul className="space-y-6">
                {points.map((p, i) => (
                  <li key={i} className="flex flex-col">
                    <span className="text-xs font-bold text-slate-400 uppercase mb-1">
                      {p.feature}
                    </span>
                    <div className="flex items-center gap-3">
                      <X className="size-4 text-red-500 shrink-0" />
                      <span className="text-slate-600 font-medium text-sm">{p.traditional}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Mary's Thrift Services */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="bg-emerald-900 p-8 rounded-[2rem] border-4 border-emerald-400/30 shadow-2xl relative md:-my-4"
            >
              <div className="absolute top-4 right-4 bg-emerald-400 text-emerald-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                Recommended
              </div>
              <div className="flex items-center gap-3 mb-8 text-emerald-400">
                <Shield className="size-6" />
                <h3 className="text-xl font-bold text-white">Mary's Thrift Services Digital</h3>
              </div>
              <ul className="space-y-6">
                {points.map((p, i) => (
                  <li key={i} className="flex flex-col">
                    <span className="text-xs font-bold text-emerald-300/60 uppercase mb-1">
                      {p.feature}
                    </span>
                    <div className="flex items-center gap-3">
                      <Check className="size-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-50 font-bold text-sm">{p.platform}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Impact */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex flex-col justify-center p-8 bg-emerald-50 rounded-3xl border border-emerald-100"
            >
              <h4 className="text-2xl font-black text-emerald-900 mb-4 tracking-tighter">
                The Simple Truth
              </h4>
              <p className="text-emerald-800 font-medium mb-8 leading-relaxed text-sm">
                With Mary's Thrift Services, you no fit lose your money. We help you save small
                small until you reach your target. No story.
              </p>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-600 tracking-tighter">Safe</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">100% Guaranteed</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                  <div className="text-2xl font-black text-emerald-600 tracking-tighter">Fast</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">
                    Receive Money Quick
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
