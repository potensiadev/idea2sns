import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { AppLayout } from "@/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Generate from "@/pages/Generate";
import BlogToSNS from "@/pages/BlogToSNS";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            {/* Protected Routes with AppLayout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/generate" element={<Generate />} />
              <Route path="/blog-to-sns" element={<BlogToSNS />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Redirects for old routes */}
            <Route path="/create" element={<Navigate to="/generate" replace />} />
            <Route path="/history" element={<Navigate to="/generate" replace />} />
            <Route path="/brand-voice" element={<Navigate to="/generate" replace />} />
            <Route path="/account" element={<Navigate to="/settings" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
