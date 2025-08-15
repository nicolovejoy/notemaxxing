export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.12 (cd3cf9e)'
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          expires_at: string
          id: string
          invited_by: string
          invitee_email: string
          permission_level: Database['public']['Enums']['permission_level']
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          token: string
          transfer_ownership_on_accept: boolean | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          invited_by: string
          invitee_email: string
          permission_level: Database['public']['Enums']['permission_level']
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          token: string
          transfer_ownership_on_accept?: boolean | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          invitee_email?: string
          permission_level?: Database['public']['Enums']['permission_level']
          resource_id?: string
          resource_type?: Database['public']['Enums']['resource_type']
          token?: string
          transfer_ownership_on_accept?: boolean | null
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          color: string
          created_at: string | null
          folder_id: string
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          color: string
          created_at?: string | null
          folder_id: string
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          color?: string
          created_at?: string | null
          folder_id?: string
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders_with_stats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'shared_folders'
            referencedColumns: ['id']
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          notebook_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          notebook_id: string
          title: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          notebook_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notes_notebook_id_fkey'
            columns: ['notebook_id']
            isOneToOne: false
            referencedRelation: 'notebooks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_notebook_id_fkey'
            columns: ['notebook_id']
            isOneToOne: false
            referencedRelation: 'notebooks_with_stats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notes_notebook_id_fkey'
            columns: ['notebook_id']
            isOneToOne: false
            referencedRelation: 'shared_notebooks'
            referencedColumns: ['id']
          },
        ]
      }
      ownership: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          resource_id?: string
          resource_type?: Database['public']['Enums']['resource_type']
          user_id?: string
        }
        Relationships: []
      }
      permission_audit: {
        Row: {
          action: string
          created_at: string | null
          granted_by: string
          id: string
          metadata: Json | null
          new_permission: Database['public']['Enums']['permission_level'] | null
          old_permission: Database['public']['Enums']['permission_level'] | null
          reason: string | null
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          granted_by: string
          id?: string
          metadata?: Json | null
          new_permission?: Database['public']['Enums']['permission_level'] | null
          old_permission?: Database['public']['Enums']['permission_level'] | null
          reason?: string | null
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          granted_by?: string
          id?: string
          metadata?: Json | null
          new_permission?: Database['public']['Enums']['permission_level'] | null
          old_permission?: Database['public']['Enums']['permission_level'] | null
          reason?: string | null
          resource_id?: string
          resource_type?: Database['public']['Enums']['resource_type']
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_by: string
          id: string
          permission_level: Database['public']['Enums']['permission_level']
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_by: string
          id?: string
          permission_level: Database['public']['Enums']['permission_level']
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string
          id?: string
          permission_level?: Database['public']['Enums']['permission_level']
          resource_id?: string
          resource_type?: Database['public']['Enums']['resource_type']
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string | null
          id: string
          questions: Json
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          questions?: Json
          subject: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          questions?: Json
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resource_states: {
        Row: {
          access_state: Database['public']['Enums']['access_state'] | null
          archived_at: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          updated_at: string | null
          visibility_state: Database['public']['Enums']['visibility_state'] | null
        }
        Insert: {
          access_state?: Database['public']['Enums']['access_state'] | null
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          resource_id: string
          resource_type: Database['public']['Enums']['resource_type']
          updated_at?: string | null
          visibility_state?: Database['public']['Enums']['visibility_state'] | null
        }
        Update: {
          access_state?: Database['public']['Enums']['access_state'] | null
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          resource_id?: string
          resource_type?: Database['public']['Enums']['resource_type']
          updated_at?: string | null
          visibility_state?: Database['public']['Enums']['visibility_state'] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      folders_with_stats: {
        Row: {
          archived_count: number | null
          color: string | null
          created_at: string | null
          id: string | null
          last_activity: string | null
          name: string | null
          note_count: number | null
          notebook_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      notebooks_with_stats: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          color: string | null
          created_at: string | null
          folder_id: string | null
          id: string | null
          last_note_date: string | null
          name: string | null
          note_count: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders_with_stats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'shared_folders'
            referencedColumns: ['id']
          },
        ]
      }
      shared_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string | null
          is_owner: boolean | null
          name: string | null
          permission_level: Database['public']['Enums']['permission_level'] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      shared_notebooks: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          color: string | null
          created_at: string | null
          folder_id: string | null
          id: string | null
          is_owner: boolean | null
          name: string | null
          permission_level: Database['public']['Enums']['permission_level'] | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'folders_with_stats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notebooks_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'shared_folders'
            referencedColumns: ['id']
          },
        ]
      }
      user_accessible_resources: {
        Row: {
          is_owner: boolean | null
          permission_level: Database['public']['Enums']['permission_level'] | null
          resource_id: string | null
          resource_type: Database['public']['Enums']['resource_type'] | null
          user_id: string | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          total_archived: number | null
          total_folders: number | null
          total_notebooks: number | null
          total_notes: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_user_data_admin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      create_starter_content_for_specific_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      delete_user_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      get_all_users_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          folder_count: number
          id: string
          last_sign_in_at: string
          note_count: number
          notebook_count: number
          quiz_count: number
        }[]
      }
      get_effective_permission: {
        Args: {
          p_resource_id: string
          p_resource_type: Database['public']['Enums']['resource_type']
          p_user_id: string
        }
        Returns: Database['public']['Enums']['permission_level']
      }
      get_user_stats: {
        Args: { target_user_id: string }
        Returns: {
          folders_count: number
          notebooks_count: number
          notes_count: number
          quizzes_count: number
        }[]
      }
      grant_admin_role: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      grant_permission: {
        Args: {
          p_expires_at?: string
          p_granted_by: string
          p_permission_level: Database['public']['Enums']['permission_level']
          p_resource_id: string
          p_resource_type: Database['public']['Enums']['resource_type']
          p_user_id: string
        }
        Returns: string
      }
      gtrgm_compress: {
        Args: { '': unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { '': unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { '': unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { '': unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { '': unknown }
        Returns: unknown
      }
      has_permission: {
        Args: {
          p_required_level: Database['public']['Enums']['permission_level']
          p_resource_id: string
          p_resource_type: Database['public']['Enums']['resource_type']
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_owner: {
        Args: {
          p_resource_id: string
          p_resource_type: Database['public']['Enums']['resource_type']
          p_user_id: string
        }
        Returns: boolean
      }
      reset_user_data_admin: {
        Args: { target_user_id: string }
        Returns: Json
      }
      seed_new_user_data: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      set_limit: {
        Args: { '': number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { '': string }
        Returns: string[]
      }
      transfer_ownership: {
        Args: {
          p_from_user: string
          p_keep_original_permission?: Database['public']['Enums']['permission_level']
          p_resource_id: string
          p_resource_type: Database['public']['Enums']['resource_type']
          p_to_user: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_state: 'locked' | 'unlocked'
      permission_level: 'none' | 'read' | 'write' | 'admin'
      resource_type: 'folder' | 'notebook' | 'note'
      visibility_state: 'active' | 'archived' | 'deleted' | 'purged'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      access_state: ['locked', 'unlocked'],
      permission_level: ['none', 'read', 'write', 'admin'],
      resource_type: ['folder', 'notebook', 'note'],
      visibility_state: ['active', 'archived', 'deleted', 'purged'],
    },
  },
} as const
