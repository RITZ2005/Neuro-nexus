<<<<<<< HEAD
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Post, User, convertDatabaseUser } from '@/lib/supabase'
import { Heart, MessageCircle, Share2, Send, Camera, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Feed() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<User[]>([])

  useEffect(() => {
    if (user) {
      fetchPosts()
      fetchSuggestions()
    }
  }, [user])

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users(*)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      const convertedPosts = (data || []).map(post => ({
        ...post,
        user: convertDatabaseUser(post.user)
      }))
      setPosts(convertedPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', user?.id)
        .limit(5)

      if (error) throw error
      const convertedUsers = (data || []).map(convertDatabaseUser)
      setSuggestions(convertedUsers)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }

  const createPost = async () => {
    if (!newPost.trim() || !user) return

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPost,
          likes_count: 0,
          comments_count: 0,
        })

      if (error) throw error

      setNewPost('')
      fetchPosts()
      toast({
        title: "Success",
        description: "Post created successfully!",
      })
    } catch (error) {
      console.error('Error creating post:', error)
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      })
    }
  }

  const toggleLike = async (postId: string) => {
    if (!user) return

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      if (existingLike) {
        // Unlike
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        await supabase.rpc('decrement_likes', { post_id: postId })
      } else {
        // Like
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id })

        await supabase.rpc('increment_likes', { post_id: postId })
      }

      fetchPosts()
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const followUser = async (userId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          follower_id: user.id,
          following_id: userId,
          status: 'accepted'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Now following user!",
      })
      fetchSuggestions()
    } catch (error) {
      console.error('Error following user:', error)
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Create Post */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback>{user?.full_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{user?.full_name}</h3>
              <p className="text-sm text-muted-foreground">{user?.title}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={3}
          />
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Photo
              </Button>
            </div>
            <Button onClick={createPost} disabled={!newPost.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Posts Feed */}
        <div className="lg:col-span-3 space-y-6">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={post.user?.avatar_url} />
                      <AvatarFallback>{post.user?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{post.user?.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{post.user?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{post.content}</p>
                  {post.image_url && (
                    <img 
                      src={post.image_url} 
                      alt="Post image" 
                      className="w-full rounded-lg mb-4"
                    />
                  )}
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-6">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleLike(post.id)}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        {post.likes_count}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {post.comments_count}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sidebar - People Suggestions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center">
                <Users className="w-4 h-4 mr-2" />
                People you may know
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions.map((suggestedUser) => (
                <div key={suggestedUser.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={suggestedUser.avatar_url} />
                      <AvatarFallback>{suggestedUser.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{suggestedUser.full_name}</p>
                      <p className="text-xs text-muted-foreground">{suggestedUser.title}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => followUser(suggestedUser.id)}
                  >
                    Follow
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
=======
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, UserCheck, MapPin, Briefcase, Star, ExternalLink, Github, Linkedin, Twitter, Globe, Award, BookOpen, Code, Mail, UserMinus, Sparkles, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import CreatePostDialog from '@/components/feed/CreatePostDialog';
import PostCard, { Post } from '@/components/feed/PostCard';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  domain?: string;
  about?: string;
  location?: string;
  research_interests?: string[];
  skills?: string[];
  website?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  orcid?: string;
  is_connected: boolean;
  mutual_interests?: string[];
  connection_score?: number;
  publications_count?: number;
  projects_count?: number;
}

const Feed = () => {
  const { toast } = useToast();
  const [feedUsers, setFeedUsers] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    const userId = localStorage.getItem('userId') || '';
    setCurrentUserId(userId);
    loadFeed();
    loadConnections();
    loadSuggestions();
    loadPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading feed from /feed/personalized...');
      const response = await apiGet('/feed/personalized');
      console.log('📡 Feed response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Feed data received:', data);
        console.log('📊 Feed users count:', data.length);
        if (data.length > 0) {
          console.log('👤 Sample user:', data[0]);
        }
        setFeedUsers(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Feed request failed:', response.status, errorText);
        toast({
          title: "Error",
          description: `Failed to load feed: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error loading feed:', error);
      toast({
        title: "Error",
        description: "Failed to load personalized feed",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const response = await apiGet('/feed/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      console.log('🔄 Loading suggestions from /feed/suggestions...');
      const response = await apiGet('/feed/suggestions?limit=5');
      console.log('📡 Suggestions response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Suggestions data received:', data);
        console.log('📊 Suggestions count:', data.length);
        setSuggestions(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Suggestions request failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error loading suggestions:', error);
    }
  };

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      console.log('🔄 Loading posts from /posts/feed...');
      const response = await apiGet('/posts/feed?domain_filter=true&limit=20');
      console.log('📡 Posts response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Posts data received:', data);
        console.log('📊 Posts count:', data.length);
        setPosts(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Posts request failed:', response.status, errorText);
        toast({
          title: "Error",
          description: `Failed to load posts: ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('❌ Error loading posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setPostsLoading(false);
    }
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
  };

  const handleConnect = async (userId: string) => {
    try {
      const response = await apiPost('/feed/connect', {
        target_user_id: userId,
        message: "Let's collaborate!"
      });

      if (response.ok) {
        toast({
          title: "Connected!",
          description: "You are now connected with this researcher"
        });
        // Reload data
        loadFeed();
        loadConnections();
        loadSuggestions();
      }
    } catch (error) {
      console.error('Error connecting:', error);
      toast({
        title: "Error",
        description: "Failed to connect with user",
        variant: "destructive"
      });
    }
  };

  const handleDisconnect = async (userId: string) => {
    try {
      const response = await apiPost(`/feed/disconnect/${userId}`, {});

      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Connection removed"
        });
        loadFeed();
        loadConnections();
        loadSuggestions();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const UserCard = ({ user }: { user: UserProfile }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover-lift shadow-soft border-card-border overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-xl mb-1">{user.name}</CardTitle>
                {user.domain && (
                  <Badge variant="secondary" className="mb-2">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {user.domain}
                  </Badge>
                )}
                {user.location && (
                  <p className="text-sm text-muted-foreground flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {user.location}
                  </p>
                )}
              </div>
            </div>
            {user.connection_score && user.connection_score > 0 && (
              <div className="flex flex-col items-center">
                <Star className={`w-5 h-5 ${getScoreColor(user.connection_score)} fill-current`} />
                <span className={`text-xs font-medium ${getScoreColor(user.connection_score)}`}>
                  {user.connection_score}%
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* About */}
          {user.about && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {user.about}
            </p>
          )}

          {/* Mutual Interests */}
          {user.mutual_interests && user.mutual_interests.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                Shared Interests
              </p>
              <div className="flex flex-wrap gap-1">
                {user.mutual_interests.slice(0, 3).map((interest, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-primary/5">
                    {interest}
                  </Badge>
                ))}
                {user.mutual_interests.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.mutual_interests.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Research Interests */}
          {user.research_interests && user.research_interests.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                <BookOpen className="w-3 h-3 mr-1" />
                Research Interests
              </p>
              <div className="flex flex-wrap gap-1">
                {user.research_interests.slice(0, 4).map((interest, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {interest}
                  </Badge>
                ))}
                {user.research_interests.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{user.research_interests.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                <Code className="w-3 h-3 mr-1" />
                Skills
              </p>
              <div className="flex flex-wrap gap-1">
                {user.skills.slice(0, 5).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {user.skills.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.skills.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-1" />
              <span>{user.publications_count || 0} Publications</span>
            </div>
            <div className="flex items-center">
              <Briefcase className="w-4 h-4 mr-1" />
              <span>{user.projects_count || 0} Projects</span>
            </div>
          </div>

          {/* Social Links */}
          {(user.website || user.github || user.linkedin || user.twitter || user.orcid) && (
            <div className="flex items-center space-x-2 pt-2">
              {user.website && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(user.website, '_blank')}
                >
                  <Globe className="w-4 h-4" />
                </Button>
              )}
              {user.github && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(`https://github.com/${user.github}`, '_blank')}
                >
                  <Github className="w-4 h-4" />
                </Button>
              )}
              {user.linkedin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(`https://linkedin.com/in/${user.linkedin}`, '_blank')}
                >
                  <Linkedin className="w-4 h-4" />
                </Button>
              )}
              {user.twitter && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(`https://twitter.com/${user.twitter}`, '_blank')}
                >
                  <Twitter className="w-4 h-4" />
                </Button>
              )}
              {user.orcid && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => window.open(`https://orcid.org/${user.orcid}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {user.is_connected ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleDisconnect(user.id)}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button
                className="w-full hero-gradient text-white"
                onClick={() => handleConnect(user.id)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const LoadingSkeleton = () => (
    <Card className="shadow-soft border-card-border">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Users className="w-8 h-8 mr-3" />
              Research Community
            </h1>
            <p className="text-muted-foreground">
              Share updates, discover researchers, and collaborate in your domain
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center gap-4">
            <Card className="shadow-soft border-card-border">
              <CardContent className="p-4">
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{posts.length}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{connections.length}</p>
                    <p className="text-xs text-muted-foreground">Connections</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <CreatePostDialog onPostCreated={loadPosts} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="posts">
              <FileText className="w-4 h-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="feed">
              <Sparkles className="w-4 h-4 mr-2" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="connections">
              <UserCheck className="w-4 h-4 mr-2" />
              Connections
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <Star className="w-4 h-4 mr-2" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {postsLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <LoadingSkeleton key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <Card className="shadow-medium border-card-border">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to share an update with your research community!
                  </p>
                  <CreatePostDialog onPostCreated={loadPosts} />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onUpdate={loadPosts}
                    onDelete={handlePostDeleted}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feed" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <LoadingSkeleton key={i} />
                ))}
              </div>
            ) : feedUsers.length === 0 ? (
              <Card className="shadow-medium border-card-border">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No suggestions yet</h3>
                  <p className="text-muted-foreground">
                    Complete your profile with research interests and domain to get personalized suggestions
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {feedUsers.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="mt-6">
            {connections.length === 0 ? (
              <Card className="shadow-medium border-card-border">
                <CardContent className="p-12 text-center">
                  <UserCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start connecting with researchers to build your network
                  </p>
                  <Button onClick={() => setActiveTab('feed')}>
                    Explore Feed
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connections.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-6">
            {suggestions.length === 0 ? (
              <Card className="shadow-medium border-card-border">
                <CardContent className="p-12 text-center">
                  <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No suggestions available</h3>
                  <p className="text-muted-foreground">
                    Update your profile to get better suggestions
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions.map((user) => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Feed;
>>>>>>> e634e94 (Update every feature)
