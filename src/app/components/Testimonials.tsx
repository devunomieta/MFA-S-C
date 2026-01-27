import { Card, CardContent } from "@/app/components/ui/card";
import { Star } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { motion } from "motion/react";

const testimonials = [
  {
    name: "Chioma Adeyemi",
    role: "Small Business Owner",
    image: "https://images.unsplash.com/photo-1681545303529-b6beb2e19f02?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZnJpY2FuJTIwd29tYW4lMjBzbWlsaW5nfGVufDF8fHx8MTc2OTQzODg2MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    content: "This platform transformed how I save! I was able to raise capital for my business through our group savings. The process was transparent and stress-free."
  },
  {
    name: "Ibrahim Okonkwo",
    role: "Engineer",
    image: null,
    content: "I've been using traditional Ajo for years, but this digital version is a game-changer. The reminders and tracking features keep everyone accountable."
  },
  {
    name: "Amara Nwosu",
    role: "Teacher",
    image: null,
    content: "Started with ₦5,000 monthly contributions and saved enough for my dream vacation in just 8 months. The group support kept me motivated!"
  }
];

export function Testimonials() {
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
            What Our <span className="text-emerald-600">Savers Say</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of satisfied members who are achieving their financial goals.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="border-2 h-full">
                <CardContent className="pt-6">
                  <motion.div
                    className="flex gap-1 mb-4"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.1 + 0.4 + i * 0.05 }}
                      >
                        <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      </motion.div>
                    ))}
                  </motion.div>
                  
                  <p className="text-gray-600 mb-6">{testimonial.content}</p>
                  
                  <div className="flex items-center gap-4">
                    {testimonial.image ? (
                      <ImageWithFallback
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}