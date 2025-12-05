import { useEffect } from 'react';
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

export const AppLayout = () => {
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
            <Link to="/create" className="flex items-center gap-2 font-bold text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              <span>idea2sns</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/create">
                <Button variant="ghost" size="sm">Create</Button>
              </Link>
              <Link to="/history">
                <Button variant="ghost" size="sm">History</Button>
              </Link>
              <Link to="/brand-voice">
                <Button variant="ghost" size="sm">Brand Voice</Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Usage Badge */}
            <Badge variant={isPro ? "default" : "secondary"} className="hidden sm:flex">
              {usageText} today
            </Badge>

            {/* Upgrade Button */}
            {!isPro && (
              <Button size="sm" variant="default" asChild>
                <Link to="/account">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Upgrade to Pro
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
                      {isPro ? 'Pro Plan' : 'Free Plan'}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/account">Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
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
