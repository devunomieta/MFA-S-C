import { Hero } from "@/app/components/Hero";
import { Comparison } from "@/app/components/Comparison";
import { Benefits } from "@/app/components/Benefits";
import { HowItWorks } from "@/app/components/HowItWorks";
import { Pricing } from "@/app/components/Pricing";
import { Testimonials } from "@/app/components/Testimonials";
import { Contact } from "@/app/components/Contact";
import { CTA } from "@/app/components/CTA";
import { WhatsAppFloating } from "@/app/components/WhatsAppFloating";

export function Landing() {
    return (
        <>
            <Hero />
            <Comparison />
            <Benefits />
            <section id="how-it-works">
                <HowItWorks />
            </section>
            <Pricing />
            <Testimonials />
            <section id="contact">
                <Contact />
            </section>
            <CTA />
            <WhatsAppFloating />
        </>
    );
}
