import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Card, CardContent } from "@/app/components/ui/card";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const testimonials = [
  {
    name: "Chioma Adeyemi",
    role: "Small Business Owner",
    image: "https://images.unsplash.com/photo-1681545303529-b6beb2e19f02?auto=format&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBzbWlsaW5nfGVufDF8fHx8MTc2OTQzODg2MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    content: "This platform transformed how I save! I was able to raise capital for my business through our group savings. Transparent and stress-free.",
    rating: 5
  },
  {
    name: "Ibrahim Okonkwo",
    role: "Process Engineer",
    image: "https://images.unsplash.com/photo-1627161683077-e34782c24d81?auto=format&fit=crop&q=80&w=1080",
    content: "Digital Ajo is a game-changer. The reminders and automated tracking keeps our circle accountable. Highly recommended for discipline!",
    rating: 5
  },
  {
    name: "Amara Nwosu",
    role: "Educator",
    image: "https://images.unsplash.com/photo-1664575602554-2087b04935a5?auto=format&fit=crop&q=80&w=1080",
    content: "Started with small monthly contributions and saved enough for my professional certification in months. The support is amazing.",
    rating: 5
  },
  {
    name: "Samuel Etim",
    role: "Graphic Designer",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80&w=1080",
    content: "The easiest way to save with friends without the drama of physical meetings. Everything is handled securely by the platform.",
    rating: 5
  },
  {
    name: "Fatima Yusuf",
    role: "Chef & Caterer",
    image: "https://images.unsplash.com/photo-1607990281513-2c110a25bb8c?auto=format&fit=crop&q=80&w=1080",
    content: "AjoSave helped me manage my restaurant's expansion funds. The structured payouts are perfect for large capital projects.",
    rating: 5
  },
  {
    name: "David Balogun",
    role: "Tech Lead",
    image: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=1080",
    content: "Clean UI, robust security, and absolute transparency. This is how community finance should work in the 21st century.",
    rating: 5
  }
];

export function Testimonials() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);

  return (
    <section className="py-32 bg-white relative overflow-hidden" id="testimonials">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-20 space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full">
            <Quote className="size-4 fill-emerald-600" />
            <span className="text-xs font-black uppercase tracking-widest">Success Stories</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950">
            Loved by <span className="text-emerald-600">Thousands of Savers.</span>
          </h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
            Real stories from real people who have transformed their financial lives with AjoSave.
          </p>
        </motion.div>

        <div className="relative overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
          <div className="flex">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] md:flex-[0_0_400px] min-w-0 pl-8"
              >
                <Card className="bg-slate-50 border border-slate-100 p-0 rounded-[2rem] relative group transition-all hover:bg-white hover:shadow-2xl hover:shadow-emerald-500/10 overflow-hidden h-full">
                  <CardContent className="p-8 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex gap-1 mb-6">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="size-4 fill-emerald-500 text-emerald-500" />
                        ))}
                      </div>
                      <p className="text-slate-600 mb-8 font-medium leading-relaxed italic text-lg">"{testimonial.content}"</p>
                    </div>

                    <div className="flex items-center gap-4 mt-auto">
                      {testimonial.image ? (
                        <ImageWithFallback
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-950">{testimonial.name}</div>
                        <div className="text-sm text-slate-500 font-medium">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* Indicators */}
          <div className="flex justify-center mt-12 gap-3">
            {testimonials.map((_, i) => (
              <div key={i} className="h-1.5 w-1.5 bg-slate-200 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}