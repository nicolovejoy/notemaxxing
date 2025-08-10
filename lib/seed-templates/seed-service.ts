import type { SupabaseClient } from '@supabase/supabase-js'
import { SeedDataOptions, SeedTemplate } from './types'
import { defaultSeedTemplate } from './default-with-tutorials'

// Template registry
const TEMPLATES: Record<string, SeedTemplate> = {
  'default-with-tutorials': defaultSeedTemplate,
  'chemistry-gen-z': defaultSeedTemplate, // Keep for backwards compatibility
}

export class SeedService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabase: SupabaseClient<any>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(supabase: SupabaseClient<any>) {
    this.supabase = supabase
  }

  async seedUserData(options: SeedDataOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // Get template or use custom data
      const template =
        options.customData || TEMPLATES[options.templateId || 'default-with-tutorials']

      if (!template) {
        throw new Error('No valid template found')
      }

      // Create folders
      for (const folderData of template.folders || []) {
        const { data: folder, error: folderError } = await this.supabase
          .from('folders')
          .insert({
            name: folderData.name,
            color: folderData.color,
            user_id: options.userId,
          })
          .select()
          .single()

        if (folderError) {
          console.error('Error creating folder:', folderError)
          continue
        }

        // Create notebooks in folder
        for (const notebookData of folderData.notebooks) {
          const { data: notebook, error: notebookError } = await this.supabase
            .from('notebooks')
            .insert({
              name: notebookData.name,
              color: notebookData.color,
              folder_id: folder.id,
              user_id: options.userId,
            })
            .select()
            .single()

          if (notebookError) {
            console.error('Error creating notebook:', notebookError)
            continue
          }

          // Create notes in notebook
          for (const noteData of notebookData.notes) {
            const { error: noteError } = await this.supabase.from('notes').insert({
              title: noteData.title,
              content: noteData.content,
              notebook_id: notebook.id,
              user_id: options.userId,
            })

            if (noteError) {
              console.error('Error creating note:', noteError)
            }
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Seed data error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  async checkIfUserHasData(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('folders')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    return !error && data && data.length > 0
  }

  getAvailableTemplates() {
    return Object.entries(TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      metadata: template.metadata,
    }))
  }

  // Future method for AI-generated custom templates
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateCustomTemplate(interests: string[], style?: string): Promise<SeedTemplate> {
    // This will use AI to generate a custom template based on interests
    // For now, return default template as fallback
    return defaultSeedTemplate
  }
}
