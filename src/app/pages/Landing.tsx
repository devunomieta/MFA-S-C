import { Hero } from "@/app/components/Hero";
import { Benefits } from "@/app/components/Benefits";
import { HowItWorks } from "@/app/components/HowItWorks";
import { Stats } from "@/app/components/Stats";
import { Pricing } from "@/app/components/Pricing";
import { Testimonials } from "@/app/components/Testimonials";
import { Contact } from "@/app/components/Contact";
import { CTA } from "@/app/components/CTA";

export function Landing() {
    return (
        <>
            <Hero />
            <Benefits />
            <section id="how-it-works">
                <HowItWorks />
            </section>
            <Stats />
            <Pricing />
            <section id="testimonials">
                <Testimonials />
            </section>
            <section id="contact">
                <Contact />
            </section>
            <CTA />
        </>
    );
}
