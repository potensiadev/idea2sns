import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Target, Clock, TrendingUp, Shield, CheckCircle2, ArrowRight, Star, X, MessageSquare, Users, Edit3, Quote } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    {
      icon: Zap,
      title: t("landing.features.multiPlatform.title"),
      description: t("landing.features.multiPlatform.description"),
    },
    {
      icon: Target,
      title: t("landing.features.optimized.title"),
      description: t("landing.features.optimized.description"),
    },
    {
      icon: Clock,
      title: t("landing.features.timeSaving.title"),
      description: t("landing.features.timeSaving.description"),
    },
  ];

  const benefits = [
    t("landing.benefits.noRewriting"),
    t("landing.benefits.platformOptimized"),
    t("landing.benefits.aiPowered"),
    t("landing.benefits.instantGeneration"),
    t("landing.benefits.professionalQuality"),
    t("landing.benefits.multilingual"),
  ];

  const stats = [
    { number: "4", label: t("landing.stats.platforms") },
    { number: "90%", label: t("landing.stats.timeSaved") },
    { number: "10K+", label: t("landing.stats.users") },
  ];

  const beforeItems = t("landing.beforeAfter.before.items", { returnObjects: true }) as string[];
  const afterItems = t("landing.beforeAfter.after.items", { returnObjects: true }) as string[];
  const howItWorksSteps = t("landing.howItWorks.steps", { returnObjects: true }) as { title: string; description: string }[];
  const testimonials = t("landing.testimonials.items", { returnObjects: true }) as { quote: string; author: string }[];
  const freeFeatures = t("landing.pricing.free.features", { returnObjects: true }) as string[];
  const proFeatures = t("landing.pricing.pro.features", { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">idea2sns</span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/auth")} className="font-semibold">
              {t("landing.nav.login")}
            </Button>
            <Button onClick={() => navigate("/generate")} className="font-semibold">
              {t("landing.nav.getStarted")}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight">
            {t("landing.hero.title.part1")}
            <br className="hidden sm:block" />
            {t("landing.hero.title.part2")}
          </h2>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-6 leading-relaxed">
            {t("landing.hero.subtitle")}
          </p>

          <p className="text-lg md:text-xl text-primary font-semibold max-w-2xl mx-auto mb-12">
            {t("landing.hero.tagline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              className="h-16 px-8 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl"
              onClick={() => navigate("/generate")}
            >
              {t("landing.hero.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-16 px-8 text-lg font-semibold rounded-xl"
              onClick={() => {
                const exampleSection = document.getElementById('example-section');
                exampleSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t("landing.hero.tryDemo")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-sm md:text-base text-muted-foreground font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Output Section */}
      <section id="example-section" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.example.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("landing.example.subtitle")}</p>
          </div>

          {/* Input Example */}
          <div className="mb-12">
            <Card className="p-6 border-2 border-primary/20 bg-primary/5 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <Edit3 className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary">{t("landing.example.inputLabel")}</span>
              </div>
              <p className="text-lg font-medium">"{t("landing.example.inputExample")}"</p>
            </Card>
          </div>

          {/* Platform Outputs */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-black rounded-lg">
                  <X className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">X / Twitter</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("landing.example.outputs.twitter")}</p>
            </Card>

            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-[#0A66C2] rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">LinkedIn</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("landing.example.outputs.linkedin")}</p>
            </Card>

            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-[#FF4500] rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">Reddit</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("landing.example.outputs.reddit")}</p>
            </Card>

            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-black rounded-lg">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold">Threads</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("landing.example.outputs.threads")}</p>
            </Card>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-bold rounded-xl"
              onClick={() => navigate("/generate")}
            >
              {t("landing.example.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Before / After Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.beforeAfter.title")}</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <Card className="p-8 border-2 border-destructive/20 bg-destructive/5">
              <h3 className="text-2xl font-bold mb-6 text-destructive">{t("landing.beforeAfter.before.title")}</h3>
              <div className="space-y-4">
                {beforeItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-1 bg-destructive/10 rounded-full mt-1">
                      <X className="h-4 w-4 text-destructive" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* After */}
            <Card className="p-8 border-2 border-primary/20 bg-primary/5">
              <h3 className="text-2xl font-bold mb-6 text-primary">{t("landing.beforeAfter.after.title")}</h3>
              <div className="space-y-4">
                {afterItems.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-1 bg-primary/10 rounded-full mt-1">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.features.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("landing.features.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-8 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="p-4 bg-primary/10 rounded-2xl w-fit mb-6">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.howItWorks.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("landing.howItWorks.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {howItWorksSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-white">{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-bold rounded-xl"
              onClick={() => navigate("/generate")}
            >
              {t("landing.howItWorks.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.testimonials.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("landing.testimonials.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 border-0 shadow-lg">
                <Quote className="h-8 w-8 text-primary/30 mb-4" />
                <p className="text-lg mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">— {testimonial.author}</span>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <p className="text-lg font-semibold text-muted-foreground">{t("landing.testimonials.stats")}</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.benefits.title")}</h2>
              <p className="text-xl text-muted-foreground mb-8">{t("landing.benefits.subtitle")}</p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-1 bg-primary/10 rounded-full mt-1">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                className="mt-10 h-14 px-8 text-lg font-bold rounded-xl"
                onClick={() => navigate("/generate")}
              >
                {t("landing.benefits.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full"></div>
              <Card className="relative p-8 border-0 shadow-2xl bg-gradient-card">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("landing.showcase.engagement")}</div>
                      <div className="text-2xl font-bold">+250%</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <Clock className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("landing.showcase.timeSaved")}</div>
                      <div className="text-2xl font-bold">5 {t("landing.showcase.hours")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <Shield className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t("landing.showcase.quality")}</div>
                      <div className="text-2xl font-bold">{t("landing.showcase.professional")}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("landing.pricing.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("landing.pricing.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <Card className="p-8 border-2">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{t("landing.pricing.free.name")}</h3>
                <div className="text-4xl font-bold">{t("landing.pricing.free.price")}</div>
              </div>
              <div className="space-y-4 mb-8">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="lg"
                className="w-full h-12 font-bold"
                onClick={() => navigate("/generate")}
              >
                {t("landing.pricing.free.cta")}
              </Button>
            </Card>

            {/* Pro Plan */}
            <Card className="p-8 border-2 border-primary bg-primary/5 relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary">Popular</Badge>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{t("landing.pricing.pro.name")}</h3>
                <div className="text-4xl font-bold">{t("landing.pricing.pro.price")}</div>
              </div>
              <div className="space-y-4 mb-8">
                {proFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className="w-full h-12 font-bold"
                onClick={() => navigate("/generate")}
              >
                {t("landing.pricing.pro.cta")}
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-primary">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{t("landing.cta.title")}</h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">{t("landing.cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="h-16 px-10 text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl"
              onClick={() => navigate("/generate")}
            >
              {t("landing.cta.button")}
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-16 px-10 text-lg font-bold rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => {
                const exampleSection = document.getElementById('example-section');
                exampleSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t("landing.cta.secondary")}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">idea2sns</span>
            </div>

            <div className="text-sm text-muted-foreground">© 2025 idea2sns. {t("landing.footer.rights")}</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
