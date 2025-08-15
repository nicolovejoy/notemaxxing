export interface SeedNote {
  title: string
  content: string
}

export interface SeedNotebook {
  name: string
  color: string
  notes: SeedNote[]
}

export interface SeedFolder {
  name: string
  color: string
  notebooks: SeedNotebook[]
}

export interface SeedTemplate {
  id: string
  name: string
  description: string
  folders: SeedFolder[]
  metadata?: {
    interests?: string[]
    level?: 'beginner' | 'intermediate' | 'advanced'
    style?: 'casual' | 'academic' | 'fun'
    targetAge?: 'teen' | 'college' | 'adult'
  }
}

export interface SeedDataOptions {
  templateId?: string
  customData?: Partial<SeedTemplate>
  userId: string
}
