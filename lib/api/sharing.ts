import type { ShareInviteRequest, ShareListResponse, Permission, ResourceType } from '@/lib/types/sharing'

const API_BASE = '/api/shares'

export const sharingApi = {
  async sendInvitation(data: ShareInviteRequest) {
    const response = await fetch(`${API_BASE}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send invitation')
    }
    
    return response.json()
  },

  async generateShareLink(data: { resourceType: ResourceType; resourceId: string; permission: Permission; email: string }) {
    const response = await fetch(`${API_BASE}/generate-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate share link')
    }
    
    return response.json()
  },

  async acceptInvitation(invitationId: string) {
    const response = await fetch(`${API_BASE}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to accept invitation')
    }
    
    return response.json()
  },

  async listShares(): Promise<ShareListResponse> {
    const response = await fetch(`${API_BASE}/list`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to list shares')
    }
    
    return response.json()
  },

  async revokePermission(permissionId: string) {
    // Try DELETE first, fallback to POST if 404
    let response = await fetch(`${API_BASE}/revoke`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionId }),
    })
    
    // If DELETE returns 404, try POST as fallback
    if (response.status === 404) {
      response = await fetch(`${API_BASE}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionId }),
      })
    }
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to revoke permission')
    }
    
    return response.json()
  },
}