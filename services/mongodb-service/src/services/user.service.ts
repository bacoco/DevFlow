import { UserModel } from '../models/user.model';
import { User, UserRole, PrivacySettings, UserPreferences, QueryOptions, FilterOptions } from '../types';
import { Logger } from 'winston';

export class UserService {
  constructor(private logger: Logger) {}

  async createUser(userData: Omit<User, '_id' | 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const user = new UserModel(userData);
      const savedUser = await user.save();
      this.logger.info(`User created: ${savedUser.email}`);
      return savedUser.toJSON();
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(id);
      return user ? user.toJSON() : null;
    } catch (error) {
      this.logger.error(`Failed to get user by ID ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await UserModel.findByEmail(email);
      return user ? user.toJSON() : null;
    } catch (error) {
      this.logger.error(`Failed to get user by email ${email}:`, error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const user = await UserModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      if (user) {
        this.logger.info(`User updated: ${user.email}`);
        return user.toJSON();
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );
      
      if (result) {
        this.logger.info(`User deactivated: ${result.email}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async getUsers(filters: FilterOptions = {}, options: QueryOptions = {}): Promise<User[]> {
    try {
      const query = UserModel.find(this.buildUserFilter(filters));
      
      if (options.sort) {
        query.sort(options.sort);
      }
      
      if (options.skip) {
        query.skip(options.skip);
      }
      
      if (options.limit) {
        query.limit(options.limit);
      }
      
      if (options.projection) {
        query.select(options.projection);
      }

      const users = await query.exec();
      return users.map(user => user.toJSON());
    } catch (error) {
      this.logger.error('Failed to get users:', error);
      throw error;
    }
  }

  async getUsersByTeam(teamId: string): Promise<User[]> {
    try {
      const users = await UserModel.findByTeam(teamId);
      return users.map(user => user.toJSON());
    } catch (error) {
      this.logger.error(`Failed to get users by team ${teamId}:`, error);
      throw error;
    }
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const users = await UserModel.findByRole(role);
      return users.map(user => user.toJSON());
    } catch (error) {
      this.logger.error(`Failed to get users by role ${role}:`, error);
      throw error;
    }
  }

  async addUserToTeam(userId: string, teamId: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }

      await user.addToTeam(teamId);
      this.logger.info(`User ${user.email} added to team ${teamId}`);
      return user.toJSON();
    } catch (error) {
      this.logger.error(`Failed to add user ${userId} to team ${teamId}:`, error);
      throw error;
    }
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }

      await user.removeFromTeam(teamId);
      this.logger.info(`User ${user.email} removed from team ${teamId}`);
      return user.toJSON();
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from team ${teamId}:`, error);
      throw error;
    }
  }

  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<User | null> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }

      await user.updatePrivacySettings(settings);
      this.logger.info(`Privacy settings updated for user ${user.email}`);
      return user.toJSON();
    } catch (error) {
      this.logger.error(`Failed to update privacy settings for user ${userId}:`, error);
      throw error;
    }
  }

  async updatePreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User | null> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }

      await user.updatePreferences(preferences);
      this.logger.info(`Preferences updated for user ${user.email}`);
      return user.toJSON();
    } catch (error) {
      this.logger.error(`Failed to update preferences for user ${userId}:`, error);
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<User | null> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }

      await user.updateLastLogin();
      return user.toJSON();
    } catch (error) {
      this.logger.error(`Failed to update last login for user ${userId}:`, error);
      throw error;
    }
  }

  async getUserCount(filters: FilterOptions = {}): Promise<number> {
    try {
      return await UserModel.countDocuments(this.buildUserFilter(filters));
    } catch (error) {
      this.logger.error('Failed to get user count:', error);
      throw error;
    }
  }

  async searchUsers(searchTerm: string, options: QueryOptions = {}): Promise<User[]> {
    try {
      const query = UserModel.find({
        $and: [
          { isActive: true },
          {
            $or: [
              { name: { $regex: searchTerm, $options: 'i' } },
              { email: { $regex: searchTerm, $options: 'i' } }
            ]
          }
        ]
      });

      if (options.limit) {
        query.limit(options.limit);
      }

      const users = await query.exec();
      return users.map(user => user.toJSON());
    } catch (error) {
      this.logger.error(`Failed to search users with term "${searchTerm}":`, error);
      throw error;
    }
  }

  private buildUserFilter(filters: FilterOptions): any {
    const filter: any = {};

    if (filters.userId) {
      filter._id = filters.userId;
    }

    if (filters.teamId) {
      filter.teamIds = filters.teamId;
    }

    if (filters.isActive !== undefined) {
      filter.isActive = filters.isActive;
    } else {
      filter.isActive = true; // Default to active users
    }

    if (filters.dateRange) {
      filter.createdAt = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    return filter;
  }
}