import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      // Check if token exists but wasn't decoded
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        console.error('RolesGuard: Token present but user not set. AuthGuard may have failed.');
        throw new ForbiddenException('Authentication failed. Please log in again.');
      }
      throw new ForbiddenException('Authentication required. Please provide a valid token.');
    }

    // Normalize roles for comparison (case-insensitive)
    const userRole = user.role?.toString().toLowerCase();
    const hasRole = requiredRoles.some((role) => {
      const normalizedRequiredRole = role?.toString().toLowerCase();
      return userRole === normalizedRequiredRole;
    });

    if (!hasRole) {
      console.error(`RolesGuard: Access denied. User role: "${user.role}", Required roles: ${requiredRoles.join(', ')}`);
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${user.role || 'none'}`
      );
    }

    return true;
  }
}

