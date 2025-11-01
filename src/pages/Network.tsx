import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, User, Connection, convertDatabaseUser } from '@/lib/supabase'
import { Search, UserPlus, Users, CheckCircle, Clock, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Network() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAllUsers(),
        fetchConnections(),
        fetchPendingRequests()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', user?.id)

      if (error) throw error
      const convertedUsers = (data || []).map(convertDatabaseUser)
      setAllUsers(convertedUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          follower:users!connections_follower_id_fkey(*),
          following:users!connections_following_id_fkey(*)
        `)
        .or(`follower_id.eq.${user?.id},following_id.eq.${user?.id}`)
        .eq('status', 'accepted')

      if (error) throw error
      const convertedConnections = (data || []).map(conn => ({
        ...conn,
        status: conn.status as 'pending' | 'accepted',
        follower: convertDatabaseUser(conn.follower),
        following: convertDatabaseUser(conn.following)
      }))
      setConnections(convertedConnections)
    } catch (error) {
      console.error('Error fetching connections:', error)
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          follower:users!connections_follower_id_fkey(*),
          following:users!connections_following_id_fkey(*)
        `)
        .eq('following_id', user?.id)
        .eq('status', 'pending')

      if (error) throw error
      const convertedRequests = (data || []).map(conn => ({
        ...conn,
        status: conn.status as 'pending' | 'accepted',
        follower: convertDatabaseUser(conn.follower),
        following: convertDatabaseUser(conn.following)
      }))
      setPendingRequests(convertedRequests)
    } catch (error) {
      console.error('Error fetching pending requests:', error)
    }
  }

  const sendConnectionRequest = async (userId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          follower_id: user.id,
          following_id: userId,
          status: 'pending'
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Connection request sent!",
      })
      fetchData()
    } catch (error) {
      console.error('Error sending connection request:', error)
      toast({
        title: "Error",
        description: "Failed to send connection request",
        variant: "destructive",
      })
    }
  }

  const acceptConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Connection request accepted!",
      })
      fetchData()
    } catch (error) {
      console.error('Error accepting connection:', error)
      toast({
        title: "Error",
        description: "Failed to accept connection",
        variant: "destructive",
      })
    }
  }

  const rejectConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Connection request rejected",
      })
      fetchData()
    } catch (error) {
      console.error('Error rejecting connection:', error)
    }
  }

  const filteredUsers = allUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const connectedUserIds = new Set(
    connections.flatMap(conn => 
      conn.follower_id === user?.id ? [conn.following_id] : [conn.follower_id]
    )
  )

  const pendingUserIds = new Set(
    [...pendingRequests.map(req => req.follower_id)]
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Network</h1>
        <p className="text-muted-foreground">Manage your professional connections</p>
      </div>

      <Tabs defaultValue="discover" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discover">Discover People</TabsTrigger>
          <TabsTrigger value="connections">
            My Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-4">
                <Search className="w-5 h-5" />
                <Input
                  placeholder="Search people by name, title, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((person) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full">
                  <CardHeader className="text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-4">
                      <AvatarImage src={person.avatar_url} />
                      <AvatarFallback>{person.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{person.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{person.title}</p>
                    <p className="text-sm text-muted-foreground">{person.company}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {person.skills?.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {connectedUserIds.has(person.id) ? (
                        <Badge variant="default" className="w-full justify-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Connected
                        </Badge>
                      ) : pendingUserIds.has(person.id) ? (
                        <Badge variant="outline" className="w-full justify-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Pending
                        </Badge>
                      ) : (
                        <Button 
                          className="w-full" 
                          onClick={() => sendConnectionRequest(person.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Connect
                        </Button>
                      )}
                      <Button variant="outline" className="w-full">
                        <Mail className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => {
              const connectedUser = connection.follower_id === user?.id 
                ? connection.following 
                : connection.follower
              
              return (
                <motion.div
                  key={connection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader className="text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-4">
                        <AvatarImage src={connectedUser?.avatar_url} />
                        <AvatarFallback>{connectedUser?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold">{connectedUser?.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{connectedUser?.title}</p>
                      <p className="text-sm text-muted-foreground">{connectedUser?.company}</p>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        <Mail className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRequests.map((request) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader className="text-center">
                    <Avatar className="h-16 w-16 mx-auto mb-4">
                      <AvatarImage src={request.follower?.avatar_url} />
                      <AvatarFallback>{request.follower?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">{request.follower?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{request.follower?.title}</p>
                    <p className="text-sm text-muted-foreground">{request.follower?.company}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => acceptConnection(request.id)}
                    >
                      Accept
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => rejectConnection(request.id)}
                    >
                      Decline
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}