export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ActiveSession {
  id: string;
  token: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  isCurrent?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  redirect?: boolean;
}

export interface SessionResponse {
  session: Session;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name: string;
  image?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}

// Modelos del Plugin Better Auth Organization
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | string;
  createdAt: string;
  user?: User;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  expiresAt: string;
  createdAt: string;
  inviterId: string;
}

export interface FullOrganization extends Organization {
  members: Member[];
  invitations: Invitation[];
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  logo?: string;
  metadata?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | string;
  organizationId?: string;
}
