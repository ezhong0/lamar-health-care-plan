/**
 * Authentication and Authorization Middleware
 *
 * This module provides authentication and authorization utilities for API routes.
 * Currently set up as a structure for future implementation.
 *
 * FUTURE IMPLEMENTATION:
 * - Integrate NextAuth.js or similar auth provider
 * - Implement JWT token validation
 * - Add role-based access control (RBAC)
 * - Add API key authentication for programmatic access
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * User roles for RBAC
 */
export enum UserRole {
  ADMIN = 'admin',           // Full access to all operations including admin endpoints
  CLINICIAN = 'clinician',   // Can create/view/edit patients, orders, care plans
  PHARMACIST = 'pharmacist', // Can generate care plans, view patients
  READONLY = 'readonly',     // Can only view data
}

/**
 * Permissions for fine-grained access control
 */
export enum Permission {
  // Patient permissions
  CREATE_PATIENT = 'create:patient',
  READ_PATIENT = 'read:patient',
  UPDATE_PATIENT = 'update:patient',
  DELETE_PATIENT = 'delete:patient',

  // Order permissions
  CREATE_ORDER = 'create:order',
  READ_ORDER = 'read:order',
  UPDATE_ORDER = 'update:order',

  // Care plan permissions
  GENERATE_CARE_PLAN = 'generate:care_plan',
  READ_CARE_PLAN = 'read:care_plan',

  // Provider permissions
  CREATE_PROVIDER = 'create:provider',
  READ_PROVIDER = 'read:provider',

  // Admin permissions
  ADMIN_DELETE_ALL = 'admin:delete_all',
  ADMIN_CLEANUP = 'admin:cleanup',
  ADMIN_SEED = 'admin:seed',
}

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Admins have all permissions
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.DELETE_PATIENT,
    Permission.CREATE_ORDER,
    Permission.READ_ORDER,
    Permission.UPDATE_ORDER,
    Permission.GENERATE_CARE_PLAN,
    Permission.READ_CARE_PLAN,
    Permission.CREATE_PROVIDER,
    Permission.READ_PROVIDER,
    Permission.ADMIN_DELETE_ALL,
    Permission.ADMIN_CLEANUP,
    Permission.ADMIN_SEED,
  ],
  [UserRole.CLINICIAN]: [
    Permission.CREATE_PATIENT,
    Permission.READ_PATIENT,
    Permission.UPDATE_PATIENT,
    Permission.CREATE_ORDER,
    Permission.READ_ORDER,
    Permission.UPDATE_ORDER,
    Permission.GENERATE_CARE_PLAN,
    Permission.READ_CARE_PLAN,
    Permission.CREATE_PROVIDER,
    Permission.READ_PROVIDER,
  ],
  [UserRole.PHARMACIST]: [
    Permission.READ_PATIENT,
    Permission.READ_ORDER,
    Permission.GENERATE_CARE_PLAN,
    Permission.READ_CARE_PLAN,
    Permission.READ_PROVIDER,
  ],
  [UserRole.READONLY]: [
    Permission.READ_PATIENT,
    Permission.READ_ORDER,
    Permission.READ_CARE_PLAN,
    Permission.READ_PROVIDER,
  ],
};

/**
 * User authentication context
 * This should be populated by your auth provider (NextAuth.js, etc.)
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions?: Permission[];
}

/**
 * Extract user from request
 *
 * PLACEHOLDER: This should be implemented when auth provider is added.
 * For now, returns null (unauthenticated).
 *
 * @example With NextAuth.js:
 * ```typescript
 * import { getServerSession } from 'next-auth/next';
 * import { authOptions } from '@/app/api/auth/[...nextauth]/route';
 *
 * const session = await getServerSession(authOptions);
 * if (!session?.user) return null;
 *
 * return {
 *   id: session.user.id,
 *   email: session.user.email,
 *   name: session.user.name,
 *   role: session.user.role,
 * };
 * ```
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // PLACEHOLDER: Implement auth provider integration here
  // For development, you can bypass auth by returning a mock user:
  //
  // if (process.env.NODE_ENV === 'development') {
  //   return {
  //     id: 'dev-user',
  //     email: 'dev@example.com',
  //     name: 'Development User',
  //     role: UserRole.ADMIN,
  //   };
  // }

  return null; // Unauthenticated
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  // First check custom permissions (for fine-grained control)
  if (user.permissions?.includes(permission)) {
    return true;
  }

  // Then check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Require authentication middleware
 *
 * Returns 401 Unauthorized if user is not authenticated.
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const user = await requireAuth(req);
 *   if (!user) {
 *     // Response already sent (401 Unauthorized)
 *     return;
 *   }
 *
 *   // User is authenticated, proceed with operation
 *   const result = await service.operation(user.id);
 *   return NextResponse.json({ success: true, data: result });
 * }
 * ```
 */
export async function requireAuth(req: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(req);

  if (!user) {
    logger.warn('Unauthorized access attempt', {
      path: req.nextUrl.pathname,
      method: req.method,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Require specific permission middleware
 *
 * Returns 401 if not authenticated, 403 if authenticated but lacking permission.
 *
 * @example
 * ```typescript
 * export async function DELETE(req: NextRequest) {
 *   const authResult = await requirePermission(req, Permission.ADMIN_DELETE_ALL);
 *
 *   // If authResult is a NextResponse, authentication/authorization failed
 *   if (authResult instanceof NextResponse) {
 *     return authResult;
 *   }
 *
 *   // authResult is the authenticated user with the required permission
 *   const user = authResult;
 *   await deleteAllPatients();
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function requirePermission(
  req: NextRequest,
  permission: Permission
): Promise<AuthUser | NextResponse> {
  const authResult = await requireAuth(req);

  // If already returned a response (401 Unauthorized), pass it through
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult;

  // Check permission
  if (!hasPermission(user, permission)) {
    logger.warn('Forbidden access attempt', {
      userId: user.id,
      userRole: user.role,
      requiredPermission: permission,
      path: req.nextUrl.pathname,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
          details: {
            required: permission,
            userRole: user.role,
          },
        },
      },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Require specific role middleware
 *
 * Returns 401 if not authenticated, 403 if authenticated but lacking role.
 */
export async function requireRole(
  req: NextRequest,
  role: UserRole
): Promise<AuthUser | NextResponse> {
  const authResult = await requireAuth(req);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const user = authResult;

  if (user.role !== role) {
    logger.warn('Forbidden access attempt - insufficient role', {
      userId: user.id,
      userRole: user.role,
      requiredRole: role,
      path: req.nextUrl.pathname,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Insufficient role',
          code: 'FORBIDDEN',
          details: {
            required: role,
            current: user.role,
          },
        },
      },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Development-only bypass for authentication
 *
 * SECURITY WARNING: Only use this in development/test environments!
 * This allows all requests to proceed without authentication.
 */
export function isDevelopmentBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.AUTH_BYPASS === 'true';
}
