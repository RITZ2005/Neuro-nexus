import { useState, useEffect, useRef } from 'react'
import { Send, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDistanceToNow } from 'date-fns'
import { apiGet } from '@/lib/api'

interface ChatMessage {
  id: string
  user_id: string
  user_name: string
  content: string
  timestamp: string
}

interface TypingUser {
  user_id: string
  user_name: string
}

interface ProjectChatProps {
  projectId: string
}

export const ProjectChat = ({ projectId }: ProjectChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: { name: string; color?: string; status?: string } }>({})
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  
  const currentUserId = localStorage.getItem('userId') || 'anonymous'
  const currentUserName = localStorage.getItem('userName') || 'Anonymous'
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Load message history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await apiGet(`/chat/project/${projectId}/messages?limit=50`)
        const data = await response.json() as { messages: ChatMessage[] }
        setMessages(data.messages.reverse()) // Reverse to show oldest first
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load chat history:', error)
        setIsLoading(false)
      }
    }
    
    loadHistory()
  }, [projectId])
  
  // Connect to WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token') || ''
    
    try {
      const websocket = new WebSocket(
        `ws://localhost:8000/ws/chat/${projectId}?token=${token}`
      )
      
      websocket.onopen = () => {
        setIsConnected(true)
        console.log('Chat WebSocket connected')
      }
      
      websocket.onclose = () => {
        setIsConnected(false)
        console.log('Chat WebSocket disconnected')
      }
      
      websocket.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
        setIsConnected(false)
      }
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'message') {
          setMessages(prev => [...prev, data.data])
        } else if (data.type === 'user_joined') {
          setOnlineUsers(prev => ({
            ...prev,
            [data.user_id]: { name: data.user_name, color: data.user_color }
          }))
        } else if (data.type === 'user_left') {
          setOnlineUsers(prev => {
            const newUsers = { ...prev }
            delete newUsers[data.user_id]
            return newUsers
          })
        } else if (data.type === 'presence') {
          setOnlineUsers(data.users)
        } else if (data.type === 'typing') {
          if (data.is_typing) {
            setTypingUsers(prev => {
              const exists = prev.find(u => u.user_id === data.user_id)
              if (!exists) {
                return [...prev, { user_id: data.user_id, user_name: data.user_name }]
              }
              return prev
            })
          } else {
            setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id))
          }
        }
      }
      
      setWs(websocket)
      
      return () => {
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
          websocket.close()
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setIsConnected(false)
    }
  }, [projectId])
  
  const sendMessage = () => {
    if (ws && newMessage.trim() && isConnected) {
      ws.send(JSON.stringify({
        type: 'message',
        content: newMessage
      }))
      setNewMessage('')
      
      // Send typing stopped
      ws.send(JSON.stringify({
        type: 'typing',
        is_typing: false
      }))
    }
  }
  
  const handleTyping = () => {
    if (ws && isConnected) {
      // Send typing indicator
      ws.send(JSON.stringify({
        type: 'typing',
        is_typing: true
      }))
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (ws && isConnected) {
          ws.send(JSON.stringify({
            type: 'typing',
            is_typing: false
          }))
        }
      }, 1000)
    }
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Project Chat</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <Badge variant="secondary" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {Object.keys(onlineUsers).length} online
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start a conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isCurrentUser = msg.user_id === currentUserId
              
              return (
                <div key={msg.id} className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 ${isCurrentUser ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${isCurrentUser ? 'order-1' : ''}`}>
                        {isCurrentUser ? 'You' : msg.user_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div 
                      className={`inline-block px-3 py-2 rounded-lg text-sm ${
                        isCurrentUser 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex gap-3 text-muted-foreground">
                <div className="text-sm italic">
                  {typingUsers.map(u => u.user_name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      <Separator />
      
      {/* Input */}
      <div className="p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!isConnected || !newMessage.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {!isConnected && (
          <p className="text-xs text-muted-foreground mt-2">
            Connecting to chat...
          </p>
        )}
      </div>
    </div>
  )
}
