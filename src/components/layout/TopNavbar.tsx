import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, Moon, Sun, Monitor, MapPin, Award, BookOpen, Briefcase, Link as LinkIcon, Github, Linkedin, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  domain?: string;
  institution?: string;
  bio?: string;
  research_interests?: string[];
  skills?: string[];
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  orcid?: string;
  is_connected: boolean;
  mutual_interests: string[];
  connection_score: number;
  publications_count: number;
  projects_count: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_pic_url?: string;
}

export function TopNavbar() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const ThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await apiGet('/users/me');
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  // Fetch notification count
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiGet('/notifications');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread_count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      if (searchQuery.length < 2) return;
      
      setIsSearching(true);
      try {
        const response = await apiGet(`/feed/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data || []);
          setShowSearchDialog(true);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleConnect = async (userId: string) => {
    try {
      await apiPost(`/feed/connect`, { receiver_id: userId });
      // Update local state
      setSearchResults(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, is_connected: true } : user
        )
      );
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.header 
      className="h-16 border-b border-card-border bg-background/95 backdrop-blur-sm sticky top-0 z-40"
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-6">
          <SidebarTrigger className="p-2 hover:bg-accent rounded-lg transition-colors" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search researchers, papers, projects..."
              className="w-80 pl-10 bg-accent/50 border-card-border focus:bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchDialog(true)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Search Results Dialog */}
        <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Search Results for "{searchQuery}"</DialogTitle>
            </DialogHeader>
            
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No researchers found matching your search</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <Card key={user.id} className="p-6 border-card-border hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16 border-2 border-primary/20">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent text-lg font-semibold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold hover:text-primary cursor-pointer" onClick={() => {
                              navigate(`/profile/${user.id}`);
                              setShowSearchDialog(false);
                            }}>
                              {user.name}
                            </h3>
                            {user.institution && (
                              <p className="text-sm text-muted-foreground">{user.institution}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {user.connection_score > 0 && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                {user.connection_score}% Match
                              </Badge>
                            )}
                            {user.is_connected ? (
                              <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                                Connected
                              </Badge>
                            ) : (
                              <Button size="sm" onClick={() => handleConnect(user.id)}>
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>

                        {user.domain && (
                          <div className="flex items-center gap-2 text-sm">
                            <Award className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">{user.domain}</span>
                          </div>
                        )}

                        {user.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
                        )}

                        {user.mutual_interests.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground">Shared interests:</span>
                            {user.mutual_interests.slice(0, 5).map((interest, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-primary/5 text-primary text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {user.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{user.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span>{user.publications_count} publications</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{user.projects_count} projects</span>
                          </div>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center gap-2">
                          {user.website && (
                            <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <LinkIcon className="w-4 h-4" />
                            </a>
                          )}
                          {user.github && (
                            <a href={`https://github.com/${user.github}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <Github className="w-4 h-4" />
                            </a>
                          )}
                          {user.linkedin && (
                            <a href={`https://linkedin.com/in/${user.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                          {user.twitter && (
                            <a href={`https://twitter.com/${user.twitter}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                              <Twitter className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-10 h-10 p-0 rounded-lg border-card-border">
                <ThemeIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-card-border">
              <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center">
                <Sun className="w-4 h-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center">
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center">
                <Monitor className="w-4 h-4 mr-2" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button 
            variant="outline" 
            size="sm" 
            className="relative w-10 h-10 p-0 rounded-lg border-card-border"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs bg-destructive text-destructive-foreground flex items-center justify-center">
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-card-border">
                  <AvatarImage src={userProfile?.profile_pic_url || "/placeholder-avatar.jpg"} alt="Profile" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {userProfile ? getInitials(userProfile.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 border-card-border" align="end" forceMount>
              <DropdownMenuItem className="font-normal p-4">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">
                    {userProfile?.name || 'Loading...'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userProfile?.email || ''}
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}