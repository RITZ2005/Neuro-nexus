import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Collaborators from "./pages/Collaborators";
import Projects from "./pages/Projects";
import ProjectSettings from "./pages/ProjectSettings";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Publish from "./pages/Publish";
import Feed from "./pages/Feed";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Network from "./pages/Network";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider defaultTheme="system" storageKey="open-science-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              
              {/* Protected Routes with Layout */}
              <Route path="/" element={<AppLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="collaborators" element={<Collaborators />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:projectId/settings" element={<ProjectSettings />} />
                <Route path="projects/:projectId/workspace" element={<ProjectWorkspace />} />
                <Route path="publish" element={<Publish />} />
                <Route path="feed" element={<Feed />} />
                <Route path="network" element={<Network />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </QueryClientProvider>
);

export default App;
