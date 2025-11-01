import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, X, User, Clock, Trash2, Users, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  sender_id: string;
  sender_name: string;
  sender_domain?: string;
  sender_avatar?: string;
  created_at: string;
  read: boolean;
}

interface ProjectInvitation {
  id: string;
  project_id: string;
  project_title: string;
  inviter_id: string;
  inviter_name: string;
  invitee_id: string;
  invitee_name: string;
  invitee_email: string;
  role: string;
  message: string;
  status: string;
  created_at: string;
}

const Notifications = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [projectInvitations, setProjectInvitations] = useState<ProjectInvitation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔔 Loading notifications...');
      
      // Load regular notifications
      const notifResponse = await apiGet('/notifications');
      if (notifResponse.ok) {
        const data = await notifResponse.json();
        console.log('✅ Notifications loaded:', data);
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
      
      // Load project invitations
      console.log('🔍 Fetching project invitations...');
      const invitationsResponse = await apiGet('/projects/invitations/pending');
      console.log('📨 Invitations response status:', invitationsResponse.status);
      
      if (invitationsResponse.ok) {
        const data = await invitationsResponse.json();
        console.log('✅ Project invitations data:', data);
        console.log('📊 Invitations count:', data.count);
        console.log('📋 Invitations array:', data.invitations);
        setProjectInvitations(data.invitations || []);
      } else {
        const errorText = await invitationsResponse.text();
        console.error('❌ Failed to load invitations:', invitationsResponse.status, errorText);
      }
      
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleAccept = async (notificationId: string) => {
    try {
      console.log('✅ Accepting connection request:', notificationId);
      const response = await apiPost('/notifications/accept-connection', {
        notification_id: notificationId
      });

      if (response.ok) {
        toast({
          title: "Connection Accepted!",
          description: "You are now connected"
        });
        loadNotifications();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to accept connection');
      }
    } catch (error: unknown) {
      console.error('❌ Error accepting connection:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept connection",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (notificationId: string) => {
    try {
      console.log('❌ Rejecting connection request:', notificationId);
      const response = await apiPost('/notifications/reject-connection', {
        notification_id: notificationId
      });

      if (response.ok) {
        toast({
          title: "Request Rejected",
          description: "Connection request declined"
        });
        loadNotifications();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reject connection');
      }
    } catch (error: unknown) {
      console.error('❌ Error rejecting connection:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject connection",
        variant: "destructive"
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiPost(`/notifications/mark-read/${notificationId}`, {});
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      const response = await apiGet('/notifications/clear-all');
      if (response.ok) {
        toast({
          title: "Notifications Cleared",
          description: "All read notifications have been deleted"
        });
        loadNotifications();
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleAcceptProjectInvitation = async (invitationId: string) => {
    try {
      console.log('✅ Accepting project invitation:', invitationId);
      const response = await apiPost('/projects/invitations/accept', {
        invitation_id: invitationId
      });

      if (response.ok) {
        toast({
          title: "Invitation Accepted!",
          description: "You've joined the project successfully"
        });
        loadNotifications();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to accept invitation');
      }
    } catch (error: unknown) {
      console.error('❌ Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invitation",
        variant: "destructive"
      });
    }
  };

  const handleRejectProjectInvitation = async (invitationId: string) => {
    try {
      console.log('❌ Rejecting project invitation:', invitationId);
      const response = await apiPost('/projects/invitations/reject', {
        invitation_id: invitationId
      });

      if (response.ok) {
        toast({
          title: "Invitation Rejected",
          description: "Project invitation declined"
        });
        loadNotifications();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reject invitation');
      }
    } catch (error: unknown) {
      console.error('❌ Error rejecting invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject invitation",
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

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`mb-4 ${notification.read ? 'opacity-60' : 'border-primary/50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent text-base font-semibold">
                  {getInitials(notification.sender_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold">{notification.sender_name}</h4>
                  {notification.sender_domain && (
                    <Badge variant="secondary" className="text-xs">
                      {notification.sender_domain}
                    </Badge>
                  )}
                  {!notification.read && (
                    <Badge variant="default" className="text-xs bg-primary">New</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </div>

                {notification.type === 'connection_request' && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(notification.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(notification.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                )}

                {notification.type === 'connection_accepted' && !notification.read && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsRead(notification.id)}
                    className="mt-2"
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const ProjectInvitationCard = ({ invitation }: { invitation: ProjectInvitation }) => {
    const getRoleColor = (role: string) => {
      switch (role) {
        case 'admin':
          return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'editor':
          return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'viewer':
          return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        default:
          return '';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="mb-4 border-blue-500/50 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-blue-500" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    Project Invitation
                    <Badge variant="default" className="text-xs bg-blue-500">New</Badge>
                  </h4>
                </div>
                
                <p className="text-sm mb-2">
                  <span className="font-medium">{invitation.inviter_name}</span>
                  {' '}invited you to join the project
                  {' '}<span className="font-medium">"{invitation.project_title}"</span>
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={`text-xs ${getRoleColor(invitation.role)}`}>
                    Role: {invitation.role}
                  </Badge>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground mb-3">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAcceptProjectInvitation(invitation.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectProjectInvitation(invitation.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Bell className="w-8 h-8 mr-3" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount + projectInvitations.length > 0 
                ? `${unreadCount + projectInvitations.length} unread notification${unreadCount + projectInvitations.length > 1 ? 's' : ''}` 
                : 'No unread notifications'}
            </p>
          </div>
          
          {notifications.some(n => n.read) && (
            <Button variant="outline" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 && projectInvitations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                You're all caught up! Check back later for updates.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            {/* Project Invitations Section */}
            {projectInvitations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-500" />
                  Project Invitations ({projectInvitations.length})
                </h2>
                {projectInvitations.map((invitation) => (
                  <ProjectInvitationCard key={invitation.id} invitation={invitation} />
                ))}
              </div>
            )}

            {/* Regular Notifications Section */}
            {notifications.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Activity Notifications ({notifications.length})
                </h2>
                {notifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Notifications;
