import jwt from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-express';
import { User, UserRole } from '@devflow/shared-types';

export interface AuthContext {
  user?: User;
  token?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export const createAuthContext = async (req: any): Promise<AuthContext> => {
  const token = extractToken(req);
  
  if (!token) {
    return {};
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JWTPayload;
    
    // In production, you would fetch the full user from database
    // For now, we'll create a minimal user object from the token
    const user: User = {
      id: decoded.userId,
      email: decoded.email,
      name: '', // Would be fetched from DB
      role: decoded.role,
      teamIds: [], // Would be fetched from DB
      privacySettings: {} as any, // Would be fetched from DB
      preferences: {} as any, // Would be fetched from DB
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    return {
      user,
      token
    };
  } catch (error) {
    // Invalid token - return empty context (user will be undefined)
    return {};
  }
};

const extractToken = (req: any): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies for browser requests
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
};

export const requireAuth = (context?: AuthContext): User => {
  if (!context?.user) {
    throw new AuthenticationError('Authentication required');
  }
  return context.user;
};

// Express middleware version for REST endpoints
export const requireAuthMiddleware = async (req: any, res: any, next: any) => {
  try {
    const context = await createAuthContext(req);
    if (!context.user) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }
    req.user = context.user;
    req.token = context.token;
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid authentication token' 
    });
  }
};

export const requireRole = (context: AuthContext, requiredRole: UserRole): User => {
  const user = requireAuth(context);
  
  // Admin can access everything
  if (user.role === UserRole.ADMIN) {
    return user;
  }
  
  // Check if user has required role
  const roleHierarchy = {
    [UserRole.DEVELOPER]: 0,
    [UserRole.TEAM_LEAD]: 1,
    [UserRole.MANAGER]: 2,
    [UserRole.ADMIN]: 3
  };
  
  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    throw new AuthenticationError('Insufficient permissions');
  }
  
  return user;
};

// Express middleware version for REST endpoints
export const requireRoleMiddleware = (requiredRole: UserRole) => {
  return async (req: any, res: any, next: any) => {
    try {
      const context = await createAuthContext(req);
      const user = requireRole(context, requiredRole);
      req.user = user;
      req.token = context.token;
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(error.message.includes('permissions') ? 403 : 401).json({
          error: error.message.includes('permissions') ? 'Forbidden' : 'Unauthorized',
          message: error.message
        });
      }
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Authentication check failed' 
      });
    }
  };
};

export const generateToken = (user: User): string => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};