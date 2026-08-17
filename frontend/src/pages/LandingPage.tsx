import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  Video,
  FileText,
  Search,
  CalendarDays,
  MessageSquare,
  ClipboardList,
  HeartPulse,
  Brain,
  Bone,
  Baby,
  Stethoscope,
  Ear,
  Ribbon,
  ScanFace,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Online Booking",
    description:
      "Book appointments with top doctors in seconds. Choose your preferred time slot and get instant confirmation.",
  },
  {
    icon: Video,
    title: "Video Consultations",
    description:
      "Connect with doctors from the comfort of your home through secure, high-quality video calls.",
  },
  {
    icon: FileText,
    title: "Digital Prescriptions",
    description:
      "Receive prescriptions digitally after your consultation. Access them anytime from your dashboard.",
  },
];

const STEPS = [
  {
    icon: Search,
    step: "01",
    title: "Search",
    description: "Find doctors by specialty, location, or availability",
  },
  {
    icon: CalendarDays,
    step: "02",
    title: "Book",
    description: "Pick a convenient time slot and confirm your appointment",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Consult",
    description: "Meet your doctor in-person or via secure video call",
  },
  {
    icon: ClipboardList,
    step: "04",
    title: "Get Prescription",
    description: "Receive your digital prescription and follow-up plan",
  },
];

const SPECIALTIES = [
  { name: "Cardiology", icon: HeartPulse },
  { name: "Dermatology", icon: ScanFace },
  { name: "Neurology", icon: Brain },
  { name: "Orthopedics", icon: Bone },
  { name: "Pediatrics", icon: Baby },
  { name: "General Medicine", icon: Stethoscope },
  { name: "ENT", icon: Ear },
  { name: "Gynecology", icon: Ribbon },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="h-full max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-900 flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-lg font-bold font-heading text-ink">
              Sehat<span className="text-primary-900">Setu</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-primary-900 hover:bg-primary-100 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 text-primary-900 text-sm font-semibold mb-6">
            <Activity size={16} />
            Trusted by 10,000+ patients across India
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-heading text-ink leading-tight mb-6">
            Your Health,
            <br />
            <span className="text-gradient">One Click Away</span>
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            Book appointments with verified doctors, consult via video, and manage
            your entire health journey — all from one platform built for modern
            India.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button size="lg" iconRight={ArrowRight}>
                Book an Appointment
              </Button>
            </Link>
            <Link to="/doctors">
              <Button variant="outline" size="lg" icon={Search}>
                Find a Doctor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-ink mb-3">
              Healthcare, Simplified
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Everything you need for a seamless healthcare experience, all in one
              place.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <Card key={feature.title} hover className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-5">
                  <feature.icon size={26} className="text-primary-900" />
                </div>
                <h3 className="text-lg font-bold font-heading text-ink mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-ink mb-3">
              How It Works
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Get from search to prescription in four simple steps.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.step} className="relative text-center group">
                <div className="text-5xl font-extrabold font-heading text-primary-100 mb-3 tabular-nums">
                  {s.step}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-900 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <s.icon size={22} className="text-white" />
                </div>
                <h3 className="text-base font-bold font-heading text-ink mb-1">
                  {s.title}
                </h3>
                <p className="text-sm text-muted">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialty Chips */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold font-heading text-ink mb-2">
              Browse by Specialty
            </h2>
            <p className="text-sm text-muted">
              Find the right specialist for your needs
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {SPECIALTIES.map((spec) => (
              <Link
                key={spec.name}
                to="/doctors"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-surface text-sm font-medium text-ink hover:border-primary-500 hover:bg-primary-50 hover:text-primary-900 transition-all duration-200"
              >
                <spec.icon size={16} />
                {spec.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-br from-primary-900 to-primary-500 p-12 text-white">
            <h2 className="text-3xl font-bold font-heading mb-3">
              Ready to Take Control of Your Health?
            </h2>
            <p className="text-primary-100 mb-8 max-w-lg mx-auto">
              Join thousands of patients and doctors who trust SehatSetu for
              seamless clinic bookings and telehealth consultations.
            </p>
            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                iconRight={ArrowRight}
              >
                Create Free Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white py-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center">
                  <Activity size={16} className="text-white" />
                </div>
                <span className="font-bold font-heading text-ink">
                  SehatSetu
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">
                Modern healthcare platform connecting patients with verified
                doctors across India.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><Link to="/doctors" className="hover:text-primary-900 transition-colors">Find Doctors</Link></li>
                <li><Link to="/register" className="hover:text-primary-900 transition-colors">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-primary-900 transition-colors">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-primary-900 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary-900 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-primary-900 transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted">
                <li><a href="#" className="hover:text-primary-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary-900 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary-900 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted">
            SehatSetu. Built with care for a healthier India.
          </div>
        </div>
      </footer>
    </div>
  );
}
