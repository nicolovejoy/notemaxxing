export type Permission = 'none' | 'read' | 'write' | 'admin'
export type ResourceType = 'folder' | 'notebook' | 'note'

export interface ShareInvitation {
  id: string
  resource_type: ResourceType
  resource_id: string
  invitee_email: string
  permission_level: Permission
  invited_by: string
  created_at: string | null
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  token: string
  transfer_ownership_on_accept: boolean | null
}

export interface ResourcePermission {
  id: string
  resource_type: ResourceType
  resource_id: string
  user_id: string
  permission_level: Permission
  granted_by: string
  created_at: string | null
  updated_at: string | null
  expires_at: string | null
}

export interface SharedResource {
  id: string
  type: 'shared_by' | 'shared_with' | 'pending_invitation'
  resourceType: ResourceType
  resourceId: string
  resourceName: string
  resourceColor: string
  permission_level: Permission
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
  permission_level: Permission
}

export interface ShareListResponse {
  sharedByMe: SharedResource[]
  sharedWithMe: SharedResource[]
  pendingInvitations: SharedResource[]
}
