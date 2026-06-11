import { useState } from "react";

import { Benefits } from "@/app/components/Benefits";
import { Comparison } from "@/app/components/Comparison";
import { Contact } from "@/app/components/Contact";
import { CTA } from "@/app/components/CTA";
import { Hero } from "@/app/components/Hero";
import { HowItWorks } from "@/app/components/HowItWorks";
import { PlanRecommender } from "@/app/components/PlanRecommender";
import { Pricing } from "@/app/components/Pricing";
import { ScrollToTop } from "@/app/components/ScrollToTop";
import { Testimonials } from "@/app/components/Testimonials";
import { WhatsAppFloating } from "@/app/components/WhatsAppFloating";

export function Landing() {
  const [showRecommender, setShowRecommender] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"quiz" | "compare">("quiz");

  const triggerRecommender = (tab: "quiz" | "compare" = "quiz") => {
    setDefaultTab(tab);
    setShowRecommender(true);
  };

  return (
    <>
      <Hero onExplorePlans={triggerRecommender} />
      <Comparison />
      <Benefits />
      <section id="how-it-works">
        <HowItWorks />
      </section>
      <Pricing />
      <Testimonials />
      <section id="contact">
        <Contact onExplorePlans={triggerRecommender} />
      </section>
      <CTA />
      <WhatsAppFloating />
      <ScrollToTop />
      <PlanRecommender
        open={showRecommender}
        onOpenChange={setShowRecommender}
        defaultTab={defaultTab}
      />
    </>
  );
}
