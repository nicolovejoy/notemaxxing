export type Permission = 'read' | 'write'
export type ResourceType = 'folder' | 'notebook'

export interface ShareInvitation {
  id: string
  resource_type: ResourceType
  resource_id: string
  invited_email: string
  permission: Permission
  invited_by: string
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export interface ResourcePermission {
  id: string
  resource_type: ResourceType
  resource_id: string
  user_id: string
  permission: Permission
  granted_by: string
  created_at: string
}

export interface SharedResource {
  id: string
  type: 'shared_by' | 'shared_with' | 'pending_invitation'
  resourceType: ResourceType
  resourceId: string
  resourceName: string
  resourceColor: string
  permission: Permission
  user?: {
    id: string
    email: string
    name: string
  }
  invitedBy?: {
    email: string
    name: string
  }
  createdAt: string
  expiresAt?: string
}

export interface ShareInviteRequest {
  resourceType: ResourceType
  resourceId: string
  invitedEmail: string
  permission: Permission
}

export interface ShareListResponse {
  sharedByMe: SharedResource[]
  sharedWithMe: SharedResource[]
  pendingInvitations: SharedResource[]
}
