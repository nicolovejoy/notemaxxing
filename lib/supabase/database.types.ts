// This file will be auto-generated after setting up Supabase
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts

export type Database = {
  public: {
    Tables: {
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      notebooks: {
        Row: {
          id: string
          user_id: string
          folder_id: string
          name: string
          color: string
          archived: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id: string
          name: string
          color: string
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string
          name?: string
          color?: string
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          notebook_id: string
          title: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notebook_id: string
          title: string
          content?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notebook_id?: string
          title?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          user_id: string
          subject: string
          questions: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          questions?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          questions?: any
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}