import { SeedDataOptions, SeedTemplate } from './types'
import { apiFetch } from '@/lib/firebase/api-fetch'
import { defaultSeedTemplate } from './default-with-tutorials'

// Template registry
const TEMPLATES: Record<string, SeedTemplate> = {
  'default-with-tutorials': defaultSeedTemplate,
  'chemistry-gen-z': defaultSeedTemplate, // Keep for backwards compatibility
}

export class SeedService {
  async seedUserData(options: SeedDataOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const template =
        options.customData || TEMPLATES[options.templateId || 'default-with-tutorials']

      if (!template) {
        throw new Error('No valid template found')
      }

      for (const folderData of template.folders || []) {
        const folderRes = await apiFetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderData.name, color: folderData.color }),
        })
        if (!folderRes.ok) {
          console.error('Error creating folder:', await folderRes.text())
          continue
        }
        const folder = await folderRes.json()

        for (const notebookData of folderData.notebooks) {
          const notebookRes = await apiFetch('/api/notebooks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: notebookData.name,
              color: notebookData.color,
              folder_id: folder.id,
            }),
          })
          if (!notebookRes.ok) {
            console.error('Error creating notebook:', await notebookRes.text())
            continue
          }
          const notebook = await notebookRes.json()

          for (const noteData of notebookData.notes) {
            const noteRes = await apiFetch('/api/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: noteData.title,
                content: noteData.content,
                notebook_id: notebook.id,
                folder_id: folder.id,
              }),
            })
            if (!noteRes.ok) {
              console.error('Error creating note:', await noteRes.text())
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

  async checkIfUserHasData(): Promise<boolean> {
    const res = await apiFetch('/api/views/folders')
    if (!res.ok) return false
    const data = await res.json()
    return data?.folders?.length > 0
  }

  getAvailableTemplates() {
    return Object.entries(TEMPLATES).map(([id, template]) => ({
      id,
      name: template.name,
      description: template.description,
      metadata: template.metadata,
    }))
  }

  async generateCustomTemplate(_interests: string[], _style?: string): Promise<SeedTemplate> {
    return defaultSeedTemplate
  }
}
