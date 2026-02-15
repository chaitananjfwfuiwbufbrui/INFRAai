import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import Landing from "./pages/Landing";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import Deployment from "./pages/Deployment";
import Infrastructure from "./pages/Infrastructure";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AppLayoutWithChat from "./layouts/AppLayoutWithChat";
import AppLayoutNoChat from "./layouts/AppLayoutNoChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Routes WITHOUT chat overlay */}
            <Route element={<AppLayoutNoChat />}>
              <Route path="/" element={<Landing />} />
              <Route path="/landingpage" element={<LandingPage />} />
            </Route>

            {/* Routes WITH chat overlay */}
            <Route element={<AppLayoutWithChat />}>
              <Route path="/canvas" element={<Index />} />
              <Route path="/deployment" element={<Deployment />} />
              <Route path="/infrastructure" element={<Infrastructure />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
