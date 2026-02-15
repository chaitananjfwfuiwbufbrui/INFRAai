import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Plus, RefreshCw, MessageSquare, Zap, Clock, HelpCircle, Users,
  ArrowRight, Play, Github, Check, Rocket, Code, Shield, BarChart3,
  Cloud, Cpu, Database, Globe, Lock, Layers, ChevronRight, ExternalLink,
  BookOpen, Briefcase, GraduationCap, Building2, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Header ───
const Header = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <motion.header
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5 }}
    className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl"
  >
    <nav className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] backdrop-blur-md rounded-full shadow-lg">
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-6 h-6 text-white" />
        <span className="text-white font-bold text-lg">Kairos<span className="text-[#e8603c]">.AI</span></span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
        <a href="#problem" className="hover:text-white transition-colors flex items-center gap-1.5"><HelpCircle className="w-3.5 h-3.5" /> Problem</a>
        <a href="#features" className="hover:text-white transition-colors flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Features</a>
        <a href="#usecases" className="hover:text-white transition-colors flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Use Cases</a>
        <a href="#roadmap" className="hover:text-white transition-colors flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Roadmap</a>
      </div>
      <button
        onClick={onWaitlist}
        className="bg-[#e8603c] hover:bg-[#d4532f] text-white rounded-full px-5 py-2 text-sm font-medium transition-colors"
      >
        Join Waitlist
      </button>
    </nav>
  </motion.header>
);

// ─── Hero ───
const HeroSection = ({ onWaitlist, onDemo }: { onWaitlist: () => void; onDemo: () => void }) => (
  <section className="pt-36 pb-16 px-4 sm:px-6 text-center">
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
      <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground mb-8">
        <span className="w-2 h-2 rounded-full bg-accent" />
        The first AI-native cloud architect
      </motion.div>

      <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-7xl font-normal leading-[1.1] mb-6 tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Design Cloud Architecture{' '}
        <br className="hidden sm:block" />
        using <span className="italic relative">
          plain English.
          <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8 C 50 2, 100 2, 150 6 S 250 10, 298 4" stroke="hsl(25, 95%, 53%)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
          </svg>
        </span>
      </motion.h1>

      <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
        Kairos.AI is an AI-powered cloud canvas that turns your requirements into an
        editable cloud diagram instantly. Describe your system → get a clean architecture → refine it visually.
      </motion.p>

      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button onClick={onWaitlist} className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-full px-8 py-3.5 text-base font-medium transition-colors inline-flex items-center gap-2">
          Join the Waitlist <Sparkles className="w-4 h-4" />
        </button>
        <button onClick={onDemo} className="border border-border hover:border-foreground/30 bg-background text-foreground rounded-full px-8 py-3.5 text-base font-medium transition-colors inline-flex items-center gap-2">
          <Play className="w-4 h-4 fill-current" /> Watch Demo
        </button>
      </motion.div>
    </motion.div>
  </section>
);

// ─── Canvas Mockup ───
const CanvasMockup = () => (
  <section className="px-4 sm:px-6 pb-20">
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="max-w-5xl mx-auto"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex">
          {/* Left toolbar */}
          <div className="border-r border-border p-3 flex flex-col gap-3">
            {[Sparkles, Plus, RefreshCw, MessageSquare].map((Icon, i) => (
              <div key={i} className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            ))}
          </div>

          {/* Canvas area */}
          <div className="flex-1 p-8 bg-secondary/30 min-h-[300px] relative">
            {/* Prompt bar */}
            <div className="absolute top-4 left-4 right-4 sm:right-auto sm:w-96 bg-card border border-border rounded-xl p-3 shadow-sm">
              <p className="text-xs text-muted-foreground mb-1">Design a scalable e-commerce backend with AWS...</p>
              <div className="flex justify-end">
                <span className="text-xs font-medium text-primary">Generate</span>
              </div>
            </div>

            {/* VPC Group */}
            <div className="mt-20 flex justify-center">
              <div className="border-2 border-dashed border-border rounded-xl p-6 relative">
                <span className="absolute -top-3 left-4 bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-md">
                  VPC Region (us-east-1)
                </span>
                <div className="flex gap-6 mt-4">
                  {[
                    { icon: Cpu, name: 'EC2 Auto-scaling', detail: 't3.medium', color: 'hsl(var(--node-compute))' },
                    { icon: Database, name: 'Aurora RDS', detail: 'Multi-AZ enabled', color: 'hsl(var(--node-storage))' },
                    { icon: Lock, name: 'IAM Roles', detail: 'Read-write access', color: 'hsl(var(--node-security))' },
                    { icon: Globe, name: 'CloudFront', detail: 'Global edge', color: 'hsl(var(--node-networking))' },
                  ].map((node, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-3 min-w-[140px] shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: node.color + '20' }}>
                          <node.icon className="w-3.5 h-3.5" style={{ color: node.color }} />
                        </div>
                        <span className="text-xs font-semibold">{node.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-9">{node.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="hidden lg:block border-l border-border p-5 w-56">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Service Config</p>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Instance Type</p>
                <div className="bg-secondary rounded-lg px-3 py-2 text-xs">t3.medium</div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">High Availability</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Enabled</span>
                  <div className="w-9 h-5 bg-accent rounded-full relative">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                  </div>
                </div>
              </div>
              <Button size="sm" className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs">
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </section>
);

// ─── Pain Point ───
const PainPointSection = () => {
  const pains = [
    { icon: Clock, title: 'Slow & Manual', desc: 'Engineers lose the first 4 hours of any project just translating requirements into a messy icon-based drag-and-drop mess.' },
    { icon: HelpCircle, title: 'Decision Paralysis', desc: 'With 200+ AWS services, beginners often struggle to choose the right tools for compute, storage, or networking needs.' },
    { icon: Users, title: 'De-synced Teams', desc: 'Confluence diagrams are outdated by the time they are saved. Terraform and code rarely look like their design counterparts.' },
  ];

  return (
    <section id="problem" className="py-24 px-4 sm:px-6">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
        <motion.p variants={fadeUp} className="text-sm text-muted-foreground mb-2">The Pain Point</motion.p>
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-12" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Diagramming shouldn't take hours.
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          {pains.map((p, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 hover:border-foreground/20 transition-colors">
              <p className="text-lg font-semibold mb-2">{p.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

// ─── Features ───
const FeaturesSection = () => {
  const features = [
    { title: 'Editable Canvas', desc: 'Real architecture is iterative. Drag nodes, delete services, and reconnect links manually after the AI does the heavy lifting.' },
    { title: 'Service Mapping', desc: 'Input "Auth" and get Identity Services. Input "Global" and get CloudFront. We map your intent directly into cloud-native services.' },
    { title: 'Parameter Control', desc: 'Configure regions, instance types, and storage classes within the diagram. Your visual tool becomes "infra-ready".' },
    { title: 'Predictive Iteration', desc: 'Add "cost-optimized" or "high availability" to your requirements and watch the AI update nodes and connections automatically.' },
    { title: 'Zero Spaghetti', desc: 'Our automated wiring engine handles logical groupings and readable spacing so your diagrams always look presentation-ready.' },
  ];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 bg-secondary/30">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
        <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">01. Intelligent Synthesis</motion.p>
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Prompt to <span className="italic">Architecture Diagram</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="text-muted-foreground mb-12 max-w-2xl">
          Type your infrastructure requirement in plain English. Infra AI extracts app type, components, and non-functional needs like scalability instantly.
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
          <motion.div variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
              <Layers className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Reasoning + Graph + Canvas</h3>
            <p className="text-sm text-muted-foreground">Unlike text-only AI or static diagram tools, we bridge the gap between architectural thought and editable reality.</p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

// ─── How It Works ───
const HowItWorks = () => {
  const steps = [
    { num: '01', title: 'Extract Intent', desc: 'Understanding app type, frontend, backend and DB needs.', icon: BookOpen },
    { num: '02', title: 'Service Mapping', desc: 'Mapping abstract needs to vendor-specific cloud services.', icon: Cloud },
    { num: '03', title: 'Graph Engine', desc: 'Generating structured metadata (nodes, edges, regions).', icon: Code },
    { num: '04', title: 'Canvas Render', desc: 'Interactive rendering on the design cloud canvas.', icon: Layers },
  ];

  return (
    <section className="py-24 px-4 sm:px-6">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-3 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          How it works
        </motion.h2>
        <motion.p variants={fadeUp} className="text-muted-foreground text-center mb-14">
          From human thought to structured cloud graphs.
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <motion.div key={i} variants={fadeUp} className="relative">
              <span className="text-7xl font-bold text-muted-foreground/10 absolute -top-6 left-0 select-none" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {s.num}
              </span>
              <div className="pt-10">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <s.icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

// ─── Use Cases / Prompt Gallery ───
const UseCases = () => {
  const prompts = [
    { tag: 'E-Commerce', prompt: '"Build a scalable e-commerce app with payments, inventory, DB, cache, and monitoring."' },
    { tag: 'Data Science', prompt: '"Design an ML training pipeline with data ingestion, preprocessing, and a deployment endpoint."' },
    { tag: 'SaaS Startup', prompt: '"Create a secure SaaS backend with auth, API gateway, microservices, and CI/CD."' },
  ];

  return (
    <section id="usecases" className="py-24 px-4 sm:px-6 bg-secondary/30">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto text-center">
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Start with a prompt
        </motion.h2>
        <motion.p variants={fadeUp} className="text-muted-foreground mb-10">
          See what others are building on the Kairos.AI canvas.
        </motion.p>

        <div className="grid sm:grid-cols-3 gap-5">
          {prompts.map((p, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 text-left hover:border-foreground/20 transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.tag}</span>
              <p className="text-sm mt-3 mb-4 leading-relaxed">{p.prompt}</p>
              <span className="text-sm font-medium text-primary flex items-center gap-1 cursor-pointer hover:gap-2 transition-all">
                Generate <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

// ─── Who It's For ───
const WhoItsFor = () => {
  const personas = [
    { icon: Rocket, title: 'Startups', desc: 'Quickly plan infrastructure, understand components, and align with your dev team from day one.' },
    { icon: Cpu, title: 'Cloud Engineers', desc: 'Generate faster first-drafts and explore architectural alternatives without manual diagram repetitive work.' },
    { icon: Briefcase, title: 'Product Teams', desc: 'Ensure alignment between product needs and engineering reality through better design reviews and sync.' },
    { icon: GraduationCap, title: 'Beginners', desc: 'Learn cloud services by seeing how they connect. Build complex architectural skills 10x faster.' },
  ];

  return (
    <section className="py-24 px-4 sm:px-6">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
        <motion.p variants={fadeUp} className="text-sm text-muted-foreground mb-2">Who it's for</motion.p>
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-12" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Empowering every cloud builder.
        </motion.h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {personas.map((p, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 hover:border-foreground/20 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

// ─── Roadmap ───
const RoadmapSection = () => {
  const items = [
    { icon: Code, title: 'IAC Export', desc: 'Direct export to Terraform, Pulumi, and CloudFormation.' },
    { icon: Cloud, title: 'Multi-Cloud support', desc: 'Native support for Azure and GCP service mappings.' },
    { icon: Shield, title: 'Security Guardrails', desc: 'Automated IAM and networking security best practices.' },
    { icon: BarChart3, title: 'Cost Estimation', desc: 'Real-time AWS pricing estimation based on your design.' },
  ];

  return (
    <section id="roadmap" className="py-24 px-4 sm:px-6 bg-secondary/30">
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-5xl mx-auto">
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-3 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Our Roadmap
        </motion.h2>
        <motion.p variants={fadeUp} className="text-muted-foreground text-center mb-4 max-w-2xl mx-auto">
          We're building the future of infrastructure as design. Here's what's coming next for the Kairos.AI platform.
        </motion.p>
        <motion.div variants={fadeUp} className="flex justify-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Current Status: Public Beta
          </span>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-card border border-border rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

// ─── Final CTA ───
const FinalCTA = ({ onWaitlist }: { onWaitlist: () => void }) => (
  <section className="py-24 px-4 sm:px-6">
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
      className="max-w-3xl mx-auto text-center"
    >
      <motion.p variants={fadeUp} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Coming Next</motion.p>
      <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-semibold mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
        Stop designing the hard way.
      </motion.h2>
      <motion.p variants={fadeUp} className="text-muted-foreground mb-8">
        Join the waitlist to access the first AI-native cloud architect.
      </motion.p>
      <motion.div variants={fadeUp}>
        <Button onClick={onWaitlist} size="lg" className="rounded-xl px-10 gap-2 text-base bg-foreground text-background hover:bg-foreground/90">
          Join the Waitlist <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </motion.div>
  </section>
);

// ─── Footer ───
const Footer = () => (
  <footer className="py-8 px-4 sm:px-6 border-t border-border">
    <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} Kairos.AI</span>
      <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
        <Github className="w-4 h-4" />
      </a>
    </div>
  </footer>
);

// ─── Main Page ───
const LandingPage = () => {
  const navigate = useNavigate();

  const handleWaitlist = () => {
    navigate('/');
  };

  const handleDemo = () => {
    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Playfair Display now loaded globally via index.css */}

      <Header onWaitlist={handleWaitlist} />
      <HeroSection onWaitlist={handleWaitlist} onDemo={handleDemo} />
      <CanvasMockup />
      <PainPointSection />
      <FeaturesSection />
      <HowItWorks />
      <UseCases />
      <WhoItsFor />
      <RoadmapSection />
      <FinalCTA onWaitlist={handleWaitlist} />
      <Footer />
    </div>
  );
};

export default LandingPage;
