import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Microscope, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

// inside LoginPage component
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.email,
        password: formData.password
      })
    });

    if (!res.ok) {
      const err = await res.json();
      toast({
        title: "Login Failed",
        description: err.detail || "Invalid credentials",
        variant: "destructive"
      });
      return;
    }
    const data = await res.json();
    // Save token & user
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("currentUser", JSON.stringify(data.user));
    
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in."
    });
    
    navigate("/dashboard");
  } catch (err) {
    console.error(err);
    toast({
      title: "Error",
      description: "Network error. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};

const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
  setIsLoading(true);
  try {
    const res = await fetch("http://127.0.0.1:8000/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: credentialResponse.credential
      })
    });

    if (!res.ok) {
      const err = await res.json();
      toast({
        title: "Google Sign-In Failed",
        description: err.detail || "Authentication failed",
        variant: "destructive"
      });
      return;
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("currentUser", JSON.stringify(data.user));
    
    toast({
      title: "Welcome!",
      description: `Signed in as ${data.user.name}`
    });
    
    navigate("/dashboard");
  } catch (err) {
    console.error(err);
    toast({
      title: "Error",
      description: "Network error. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};

const handleGoogleError = () => {
  toast({
    title: "Google Sign-In Failed",
    description: "Unable to sign in with Google. Please try again.",
    variant: "destructive"
  });
};


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
          <div className="w-16 h-16 mx-auto rounded-2xl hero-gradient flex items-center justify-center mb-4">
            <Microscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your research account</p>
        </div>

        <Card className="shadow-medium border-card-border">
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="researcher@university.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full hero-gradient text-white hover-lift"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              </div>

              <div className="text-center">
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Forgot your password?
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Sign up for free
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;