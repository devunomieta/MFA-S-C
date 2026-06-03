import { useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, MessageSquare, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { supabase } from "@/lib/supabase";

import { PlanRecommender } from "./PlanRecommender";

const contactInfo = [
  {
    icon: Mail,
    title: "Email Us",
    content: "marysthriftservice@gmail.com",
    description: "Response within 24 hours",
    color: "from-emerald-600 to-emerald-400",
  },
  {
    icon: Phone,
    title: "Call Us",
    content: "09074049667",
    description: "Mon-Fri, 8am - 6pm",
    color: "from-blue-600 to-blue-400",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    content: "Chat with our team",
    description: "Available 24/7",
    color: "from-indigo-600 to-indigo-400",
    action: () => window.open("https://wa.me/2349074049667", "_blank"),
  },
];

export function Contact() {
  const [showRecommender, setShowRecommender] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    website: "", // Honeypot
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.website) {
      console.warn("Contact Honeypot triggered");
      setSubmitted(true);
      return;
    }

    setLoading(true);
    try {
      // 1. Primary Action: Save to Database (Ensures we never lose a message)
      const { error: dbError } = await supabase.from("contact_inquiries").insert([
        {
          name: formData.name,
          email: formData.email,
          subject: formData.subject || `Inquiry from ${formData.name}`,
          message: formData.message,
        },
      ]);

      if (dbError) throw dbError;

      // 2. Secondary Action: Trigger Email Notification (May be blocked by Adblockers)
      try {
        const { error: funcError } = await supabase.functions.invoke("contact-handler", {
          body: {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message,
          },
        });

        if (funcError) {
          console.warn(
            "Edge Function email notification failed, but message is saved to DB:",
            funcError,
          );
        }
      } catch {
        // This is where "Network Error" (Adblockers) usually happens
        console.warn("Edge Function blocked by browser/network, message saved to DB fallback.");
      }

      // If we got here, the DB save succeeded at minimum
      setSubmitted(true);
      toast.success("Thank you! Your message has been received.");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        website: "",
      });
    } catch (error: any) {
      console.error("Contact Form Critical Error:", error);

      let errorMessage = "Failed to send message. Please try again.";
      if (error?.message?.includes("Failed to fetch") || error?.name === "TypeError") {
        errorMessage =
          "Network Error: Could not reach the server. Please check your internet connection and disable any Adblockers/VPNs.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-12 pb-4 relative overflow-hidden bg-white" id="contact">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side: Content & Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight">
                Get in <span className="text-emerald-600">Touch.</span>
              </h2>
              <p className="text-xl text-slate-600 font-medium leading-relaxed max-w-lg">
                Have questions about how Mary's Thrift Services works? Our team is here to help you
                achieve your financial goals.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {contactInfo.map((info, index) => (
                <div
                  key={index}
                  onClick={info.action}
                  className={`flex items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 group transition-all ${info.action ? "cursor-pointer hover:border-indigo-400 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5" : "hover:border-emerald-200"}`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${info.color} flex items-center justify-center shadow-lg shrink-0`}
                  >
                    <info.icon className="size-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950">{info.title}</h3>
                    <p className="text-sm text-slate-600 font-medium">{info.content}</p>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">
                      {info.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recommender Tool */}
          <PlanRecommender open={showRecommender} onOpenChange={setShowRecommender} />

          {/* Right Side: Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="border-0 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden min-h-[500px] flex items-center">
              <CardContent className="p-10 bg-white w-full">
                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center space-y-6 py-10"
                    >
                      <div className="size-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="size-10 text-emerald-600" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black text-slate-950 tracking-tight">
                          Message Sent!
                        </h3>
                        <p className="text-slate-600 font-medium">
                          Thank you for reaching out. Our team will get back to you within 24 hours.
                        </p>
                      </div>
                      <Button
                        onClick={() => setSubmitted(false)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 h-12"
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-bold text-slate-900 ml-1">
                          Full Name
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Jane Doe"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-bold text-slate-900 ml-1">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="jane@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-bold text-slate-900 ml-1">
                          Message
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="How can we help you?"
                          value={formData.message}
                          onChange={handleChange}
                          required
                          rows={4}
                          className="rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all focus:ring-emerald-500 p-4"
                        />
                      </div>

                      {/* Honeypot field - Hidden from users */}
                      <div className="hidden" aria-hidden="true">
                        <Input
                          type="text"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          tabIndex={-1}
                          autoComplete="off"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        size="lg"
                        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all"
                      >
                        {loading ? "Sending..." : "Send Inquiry"}
                        <Send className="ml-2 size-5" />
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Full Width Direct Support Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="p-10 md:p-12 bg-emerald-600 rounded-[2.5rem] border border-emerald-500 shadow-2xl shadow-emerald-600/20 relative overflow-hidden group text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-100">
                  <MessageSquare className="size-5" />
                  <span className="font-bold uppercase tracking-widest text-xs">
                    Direct Support
                  </span>
                </div>
                <h4 className="text-3xl md:text-4xl font-black tracking-tight">
                  Need Assisted Management?
                </h4>
                <p className="text-emerald-50/80 text-lg font-medium leading-relaxed max-w-xl">
                  Join our community of over 2,000 savers and get real-time assistance through our
                  dedicated channels. We can help you manage your plans and savings manually.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 md:justify-end">
                <Button
                  onClick={() => window.open("https://wa.me/2349074049667", "_blank")}
                  variant="outline"
                  className="bg-white text-emerald-700 hover:bg-emerald-50 border-0 font-bold rounded-2xl h-16 px-8 transition-all shadow-xl text-lg"
                >
                  <MessageSquare className="mr-2 size-6" />
                  Chat on WhatsApp
                </Button>
                <Button
                  onClick={() => setShowRecommender(true)}
                  className="bg-emerald-950/30 hover:bg-emerald-950/50 text-white border-white/20 border font-bold rounded-2xl h-16 px-8 transition-all text-lg"
                >
                  Explore Plans
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
