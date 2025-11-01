// src/components/feed/CreatePostDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, X, Image, Link, FileText } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreatePostDialogProps {
  onPostCreated: () => void;
}

const CreatePostDialog: React.FC<CreatePostDialogProps> = ({ onPostCreated }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'link'>('text');
  const [mediaUrl, setMediaUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [creating, setCreating] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleCreate = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const response = await apiPost('/posts/create', {
        content: content.trim(),
        post_type: postType,
        media_url: postType === 'image' ? mediaUrl : null,
        link_url: postType === 'link' ? linkUrl : null,
        link_title: postType === 'link' ? linkTitle : null,
        link_description: postType === 'link' ? linkDescription : null,
        tags
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Post created successfully"
        });
        setOpen(false);
        resetForm();
        onPostCreated();
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setPostType('text');
    setMediaUrl('');
    setLinkUrl('');
    setLinkTitle('');
    setLinkDescription('');
    setTags([]);
    setTagInput('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="hero-gradient text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a New Post</DialogTitle>
          <DialogDescription>
            Share your research updates, insights, or questions with your community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post Type Selector */}
          <div>
            <Label>Post Type</Label>
            <Select value={postType} onValueChange={(value) => setPostType(value as 'text' | 'image' | 'link')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Text Only
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center">
                    <Image className="w-4 h-4 mr-2" />
                    With Image
                  </div>
                </SelectItem>
                <SelectItem value="link">
                  <div className="flex items-center">
                    <Link className="w-4 h-4 mr-2" />
                    Share Link
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind? Share your research updates, findings, or questions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {content.length}/5000 characters
            </p>
          </div>

          {/* Image Upload (if type is image) */}
          {postType === 'image' && (
            <div>
              <Label htmlFor="mediaUrl">Upload Image</Label>
              <div className="mt-2">
                <ImageUpload
                  value={mediaUrl}
                  onChange={setMediaUrl}
                  onRemove={() => setMediaUrl('')}
                  imageType="post"
                  aspectRatio="video"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Upload an image from your computer (max 10MB)
              </p>
            </div>
          )}

          {/* Link Details (if type is link) */}
          {postType === 'link' && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="linkUrl">Link URL *</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="linkTitle">Link Title</Label>
                <Input
                  id="linkTitle"
                  placeholder="Title of the article or resource"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="linkDescription">Link Description</Label>
                <Textarea
                  id="linkDescription"
                  placeholder="Brief description of the link"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="tags"
                placeholder="Add tags (e.g., AI, ML, Research)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} size="sm">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating || !content.trim()}
              className="hero-gradient text-white"
            >
              {creating ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
