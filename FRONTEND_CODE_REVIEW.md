# Frontend Code Review

## Code Analysis

### 1. ProtectedComponent Issues

#### ❌ Issue 1: Role Case Mismatch
**Problem**: Backend uses lowercase `'superadmin'`, but frontend checks for `'SuperAdmin'` (capital S, capital A)

```typescript
// ❌ Current (won't work)
if (role === 'SuperAdmin') return true

// ✅ Should be
if (role === 'superadmin' || role === 'admin') return true
```

**Backend Roles** (from Role.model.js):
- `'superadmin'` (lowercase)
- `'admin'` (lowercase)
- `'hr'` (lowercase)
- `'manager'` (lowercase)
- `'employee'` (lowercase)

#### ❌ Issue 2: Permission Check Logic
**Problem**: Uses `some()` which means user needs ANY permission, but should check if user has ALL required permissions for critical operations.

```typescript
// Current: Returns true if user has ANY permission
return permissions.some(permission => userPerms?.includes(permission))

// Better: Check if user has ALL permissions (for critical operations)
// OR use 'some' for flexible permission checks
```

#### ⚠️ Issue 3: Missing Admin Role Check
**Problem**: Only checks `SuperAdmin`, but should also check `admin` role (which has all permissions in backend)

#### ⚠️ Issue 4: localStorage Access
**Problem**: Direct localStorage access in hook without error handling

---

### 2. AdminLayout Component

✅ **Good**: Simple wrapper around AppLayout
⚠️ **Missing**: No permission check - anyone can access admin routes

**Recommendation**: Wrap with ProtectedComponent

---

### 3. Layout Component

✅ **Good**: Flexible layout with optional title/subtitle
⚠️ **Missing**: No permission/role checking

---

## Recommended Fixes

### Fixed ProtectedComponent

```typescript
'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Shield, Lock, ArrowLeft } from 'lucide-react'

interface ProtectedComponentProps {
  children: ReactNode
  requiredPermissions?: string[]
  requiredRoles?: string[]
  userRole?: string
  userPermissions?: string[]
  fallback?: ReactNode
  redirectTo?: string
  requireAll?: boolean // If true, user must have ALL permissions
}

export default function ProtectedComponent({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  userRole,
  userPermissions = [],
  fallback,
  redirectTo = '/unauthorized',
  requireAll = false
}: ProtectedComponentProps) {
  const router = useRouter()

  // Check if user has required role
  const hasRequiredRole = () => {
    if (requiredRoles.length === 0) return true
    
    // Normalize role to lowercase for comparison
    const normalizedRole = userRole?.toLowerCase()
    
    // SuperAdmin and Admin have all access
    if (normalizedRole === 'superadmin' || normalizedRole === 'admin') {
      return true
    }
    
    return requiredRoles.some(role => 
      normalizedRole === role.toLowerCase()
    )
  }

  // Check if user has required permissions
  const hasRequiredPermissions = () => {
    if (requiredPermissions.length === 0) return true
    
    // SuperAdmin and Admin have all permissions
    const normalizedRole = userRole?.toLowerCase()
    if (normalizedRole === 'superadmin' || normalizedRole === 'admin') {
      return true
    }
    
    if (requireAll) {
      // User must have ALL required permissions
      return requiredPermissions.every(permission => 
        userPermissions?.includes(permission)
      )
    } else {
      // User must have ANY of the required permissions
      return requiredPermissions.some(permission => 
        userPermissions?.includes(permission)
      )
    }
  }

  // Check authorization
  const isAuthorized = hasRequiredRole() && hasRequiredPermissions()

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have the required permissions to access this resource.
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              <Lock className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {requiredRoles.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Required roles: {requiredRoles.join(', ')}
              </p>
            )}
            {requiredPermissions.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Required permissions: {requiredPermissions.join(', ')}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your role: {userRole || 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for checking permissions
export function usePermissions() {
  const checkPermission = (
    permissions: string[], 
    role?: string, 
    userPerms?: string[],
    requireAll: boolean = false
  ) => {
    // Normalize role to lowercase
    const normalizedRole = role?.toLowerCase()
    
    // SuperAdmin and Admin have all permissions
    if (normalizedRole === 'superadmin' || normalizedRole === 'admin') {
      return true
    }
    
    if (requireAll) {
      return permissions.every(permission => userPerms?.includes(permission))
    } else {
      return permissions.some(permission => userPerms?.includes(permission))
    }
  }

  const getUserPermissions = (): string[] => {
    if (typeof window === 'undefined') return []
    
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        return user.permissions || []
      }
    } catch (error) {
      console.error('Error reading user permissions:', error)
    }
    return []
  }

  const getUserRole = (): string | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        return user.role || null
      }
    } catch (error) {
      console.error('Error reading user role:', error)
    }
    return null
  }

  return {
    checkPermission,
    getUserPermissions,
    getUserRole,
    hasPermission: (permissions: string[], requireAll: boolean = false) => 
      checkPermission(permissions, getUserRole(), getUserPermissions(), requireAll)
  }
}
```

### Fixed AdminLayout

```typescript
'use client'

import { ReactNode } from 'react'
import AppLayout from '@/components/AppLayout'
import ProtectedComponent from '@/components/ProtectedComponent'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ProtectedComponent
      requiredRoles={['admin', 'superadmin']}
      requiredPermissions={['system_admin']}
    >
      <AppLayout>
        {children}
      </AppLayout>
    </ProtectedComponent>
  )
}
```

---

## Backend Role Reference

### Valid Roles (from backend):
- `'superadmin'` - Super Administrator (all permissions)
- `'admin'` - Administrator (all permissions)
- `'hr'` - Human Resources
- `'manager'` - Manager
- `'employee'` - Employee

### Common Permissions (from backend):
- `'read_users'`, `'write_users'`, `'create_users'`, `'update_users'`, `'delete_users'`
- `'read_attendance'`, `'write_attendance'`, `'approve_attendance'`
- `'read_reports'`, `'write_reports'`, `'export_reports'`
- `'system_admin'`, `'audit_logs'`, `'backup_restore'`
- And many more...

---

## Summary of Issues

1. ❌ **Role case mismatch**: `'SuperAdmin'` → should be `'superadmin'` or `'admin'`
2. ⚠️ **Missing admin check**: Only checks SuperAdmin, not admin
3. ⚠️ **Permission logic**: Should support both "any" and "all" checks
4. ⚠️ **Error handling**: Missing try-catch for localStorage
5. ⚠️ **AdminLayout**: No protection - should use ProtectedComponent

---

## Next Steps

1. Fix role case matching (lowercase)
2. Add admin role check (not just SuperAdmin)
3. Add error handling for localStorage
4. Wrap AdminLayout with ProtectedComponent
5. Test with actual backend roles/permissions

