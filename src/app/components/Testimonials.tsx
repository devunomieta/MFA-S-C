import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Card, CardContent } from "@/app/components/ui/card";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function Testimonials() {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center' }, [Autoplay({ delay: 5000, stopOnInteraction: false })]);
  const [testimonialsList, setTestimonialsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTestimonialsList(data || []);
      } catch (err) {
        console.error("Error fetching testimonials:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  if (loading) return null;
  if (testimonialsList.length === 0) return null;

  return (
    <section className="py-32 bg-white relative overflow-hidden" id="testimonials">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-50 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />
        
        <Quote className="absolute top-20 left-10 size-32 text-slate-50 rotate-12 opacity-50" />
        <Quote className="absolute bottom-20 right-10 size-32 text-slate-50 -rotate-12 opacity-50" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-24 space-y-6"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-100/50 text-emerald-700 px-5 py-2 rounded-full border border-emerald-200/50 backdrop-blur-sm">
            <Quote className="size-4 fill-emerald-600" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Wall of Trust</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
            Savers Who <span className="text-emerald-600">Dream Big.</span>
          </h2>
          <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Join thousands of smart Nigerians who are hitting their financial goals faster than ever.
          </p>
        </motion.div>

        <div className="relative overflow-hidden py-10 px-4" ref={emblaRef}>
          <div className="flex -ml-8">
            {testimonialsList.map((testimonial, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] md:flex-[0_0_450px] min-w-0 pl-8"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="bg-white border border-slate-100 p-0 rounded-[3rem] relative group transition-all duration-500 hover:border-emerald-200 hover:shadow-[0_20px_50px_rgba(16,185,129,0.1)] overflow-hidden h-full">
                    <CardContent className="p-10 flex flex-col h-full relative">
                      <div className="absolute top-10 right-10 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Quote className="size-12 text-emerald-600 rotate-180" />
                      </div>
                      
                      <div>
                        <div className="flex gap-1.5 mb-8">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`size-4 ${i < (testimonial.rating || 5) ? "fill-emerald-500 text-emerald-500" : "text-slate-200"}`} 
                            />
                          ))}
                        </div>
                        <p className="text-slate-700 mb-10 font-bold leading-relaxed text-lg md:text-xl">
                          "{testimonial.content}"
                        </p>
                      </div>

                      <div className="flex items-center gap-5 mt-auto bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                        <div className="relative">
                          {testimonial.image_url ? (
                            <ImageWithFallback
                              src={testimonial.image_url}
                              alt={testimonial.name}
                              className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white shadow-md"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-600/20">
                              {testimonial.name[0]}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white">
                            <CheckCircle2 className="size-3" />
                          </div>
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-base">{testimonial.name}</div>
                          <div className="text-xs text-emerald-600 font-black uppercase tracking-widest">{testimonial.role || "Verified Saver"}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Navigation Dots */}
        <div className="flex justify-center mt-12 gap-3">
          {testimonialsList.map((_, i) => (
            <motion.div 
              key={i} 
              className="h-2 w-2 rounded-full bg-slate-200"
              whileHover={{ scale: 1.5, backgroundColor: '#10b981' }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

import { CheckCircle2 } from "lucide-react";