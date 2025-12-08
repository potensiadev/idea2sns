import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, User, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const AppLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, plan, limits, dailyUsed, loading, loadProfileAndLimits, loadDailyUsage, reset } = useAppStore();

  useEffect(() => {
    loadProfileAndLimits();
    loadDailyUsage();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        reset();
        navigate('/auth');
      } else if (event === 'SIGNED_IN' && session) {
        loadProfileAndLimits();
        loadDailyUsage();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    reset();
    navigate('/auth');
  };

  const isPro = plan === 'pro';
  const usageText = limits.daily_generations
    ? `${dailyUsed}/${limits.daily_generations}`
    : `${dailyUsed}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>idea2sns</span>
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link to="/generate">
                <Button variant="ghost" size="sm">{t('appLayout.nav.generate')}</Button>
              </Link>
              <Link to="/blog-to-sns">
                <Button variant="ghost" size="sm">{t('appLayout.nav.blogToSns')}</Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Usage Badge */}
            <Badge variant={isPro ? "default" : "secondary"} className="hidden sm:flex">
              {t('appLayout.usage.today', { count: usageText })}
            </Badge>

            {/* Upgrade Button */}
            {!isPro && (
              <Button size="sm" variant="default" asChild>
                <Link to="/settings">
                  <Sparkles className="h-4 w-4 mr-1" />
                  {t('appLayout.upgradeToPro')}
                </Link>
              </Button>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">{user?.email}</span>
                    <Badge variant={isPro ? "default" : "secondary"} className="w-fit">
                      {isPro ? t('appLayout.userMenu.proPlan') : t('appLayout.userMenu.freePlan')}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">{t('appLayout.userMenu.settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('appLayout.userMenu.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
