import { Button } from "@/app/components/ui/button";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="text-2xl text-emerald-600 font-bold">
            AjoSave
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-emerald-600 transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Testimonials
            </a>
            <a href="#contact" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Contact
            </a>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-700 hover:text-emerald-600"
            >
              {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <a
                href="#features"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}