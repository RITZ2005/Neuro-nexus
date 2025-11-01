// Re-export the supabase client from integrations to avoid duplicate instances
export { supabase } from '@/integrations/supabase/client'

// Database Types - Imported from Supabase generated types
import type { Database } from '@/integrations/supabase/types'

type DatabaseUser = Database['public']['Tables']['users']['Row']
type DatabasePost = Database['public']['Tables']['posts']['Row']
type DatabaseConnection = Database['public']['Tables']['connections']['Row']

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string | null
  title?: string | null
  company?: string | null
  location?: string | null
  bio?: string | null
  skills: string[]
  education: any[]
  experience: any[]
  certifications: any[]
  created_at: string
  updated_at?: string | null
}

// Helper function to convert database user to our User type
export const convertDatabaseUser = (dbUser: DatabaseUser): User => ({
  ...dbUser,
  education: Array.isArray(dbUser.education) ? dbUser.education : [],
  experience: Array.isArray(dbUser.experience) ? dbUser.experience : [],
  certifications: Array.isArray(dbUser.certifications) ? dbUser.certifications : []
})

export interface Post {
  id: string
  user_id: string
  content: string
  image_url?: string
  likes_count: number
  comments_count: number
  created_at: string
  user: User
}

export interface Connection {
  id: string
  follower_id: string
  following_id: string
  status: 'pending' | 'accepted'
  created_at: string
  follower: User
  following: User
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  user: User
}