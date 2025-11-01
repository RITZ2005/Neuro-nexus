// src/components/feed/PostCard.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit,
  Send,
  Briefcase,
  MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_domain?: string;
  content: string;
  created_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  author_domain?: string;
  author_institution?: string;
  content: string;
  post_type: string;
  media_url?: string;
  document_id?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  tags?: string[];
  likes_count: number;
  comments_count: number;
  liked_by_user: boolean;
  comments?: Comment[];
  created_at: string;
  updated_at?: string;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onUpdate: () => void;
  onDelete: (postId: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onUpdate, onDelete }) => {
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked_by_user);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const isAuthor = post.author_id === currentUserId;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLike = async () => {
    try {
      const response = await apiPost(`/posts/${post.id}/like`, {});
      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikesCount(data.likes_count);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
      });
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;

    setCommenting(true);
    try {
      const response = await apiPost(`/posts/${post.id}/comment`, {
        content: newComment.trim()
      });

      if (response.ok) {
        setNewComment('');
        setShowComments(true);
        onUpdate();
        toast({
          title: "Success",
          description: "Comment added"
        });
      }
    } catch (error) {
      console.error('Error commenting:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    } finally {
      setCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await apiDelete(`/posts/${post.id}`);
      if (response.ok) {
        toast({
          title: "Success",
          description: "Post deleted"
        });
        onDelete(post.id);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-soft border-card-border hover-lift">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                  {getInitials(post.author_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{post.author_name}</p>
                {post.author_domain && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    <Briefcase className="w-3 h-3 mr-1" />
                    {post.author_domain}
                  </Badge>
                )}
                {post.author_institution && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {post.author_institution}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  {post.updated_at && ' (edited)'}
                </p>
              </div>
            </div>

            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDeletePost}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Content */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm">{post.content}</p>
          </div>

          {/* Image */}
          {post.post_type === 'image' && post.media_url && (
            <div className="rounded-lg overflow-hidden border">
              <img
                src={post.media_url}
                alt="Post media"
                className="w-full object-cover max-h-96"
              />
            </div>
          )}

          {/* Link Preview */}
          {post.post_type === 'link' && post.link_url && (
            <a
              href={post.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {post.link_title && (
                    <p className="font-medium text-sm mb-1">{post.link_title}</p>
                  )}
                  {post.link_description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {post.link_description}
                    </p>
                  )}
                  <p className="text-xs text-primary flex items-center">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {new URL(post.link_url).hostname}
                  </p>
                </div>
              </div>
            </a>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={liked ? 'text-red-500' : ''}
              >
                <Heart className={`w-4 h-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                <span className="text-sm">{likesCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">{post.comments_count}</span>
              </Button>

              <Button variant="ghost" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3 border-t"
              >
                {/* Existing Comments */}
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-primary/5">
                            {getInitials(comment.author_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-xs">{comment.author_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="flex space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/10 to-primary/5">
                      You
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleComment();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleComment}
                      disabled={commenting || !newComment.trim()}
                      className="hero-gradient text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PostCard;
