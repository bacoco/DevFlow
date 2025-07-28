import { DatabaseConfig } from '../config/database';
import { UserService } from '../services/user.service';
import { BackupService } from '../services/backup.service';
import { UserModel } from '../models/user.model';
import { TeamModel } from '../models/team.model';
import { ProjectModel } from '../models/project.model';
import { User, Team, Project, UserRole } from '../types';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'error',
  transports: []
});

describe('MongoDB Database Integration', () => {
  let dbConfig: DatabaseConfig;
  let userService: UserService;
  let backupService: BackupService;

  beforeAll(async () => {
    dbConfig = new DatabaseConfig(logger);
    userService = new UserService(logger);
    backupService = new BackupService(logger);
  });

  describe('User Management', () => {
    it('should create and retrieve users with proper validation', async () => {
      const userData: Omit<User, '_id' | 'id' | 'createdAt' | 'updatedAt'> = {
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {
          dataCollection: {
            ideTelemetry: true,
            gitActivity: true,
            communicationData: false,
            granularControls: {}
          },
          sharing: {
            teamMetrics: true,
            individualMetrics: false,
            anonymousAggregation: true
          },
          retention: {
            personalData: 730,
            aggregatedData: 1825,
            auditLogs: 365
          },
          anonymization: 'partial' as any
        },
        preferences: {
          theme: 'dark',
          timezone: 'UTC',
          language: 'en',
          notifications: {
            email: true,
            inApp: true,
            slack: false,
            teams: false,
            frequency: 'daily'
          },
          dashboard: {
            defaultView: 'overview',
            refreshInterval: 300000,
            showTutorials: true,
            compactMode: false
          }
        },
        lastLoginAt: new Date(),
        isActive: true
      };

      const createdUser = await userService.createUser(userData);
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.id).toBeDefined();

      const retrievedUser = await userService.getUserById(createdUser.id!);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser!.email).toBe(userData.email);
    });

    it('should handle user updates and team management', async () => {
      const user = await userService.createUser({
        email: 'update@example.com',
        name: 'Update User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      });

      // Update user
      const updatedUser = await userService.updateUser(user.id!, {
        name: 'Updated Name',
        role: UserRole.TEAM_LEAD
      });

      expect(updatedUser!.name).toBe('Updated Name');
      expect(updatedUser!.role).toBe(UserRole.TEAM_LEAD);

      // Add to team
      const userWithNewTeam = await userService.addUserToTeam(user.id!, 'team2');
      expect(userWithNewTeam!.teamIds).toContain('team2');

      // Remove from team
      const userWithRemovedTeam = await userService.removeUserFromTeam(user.id!, 'team1');
      expect(userWithRemovedTeam!.teamIds).not.toContain('team1');
    });

    it('should handle privacy settings and preferences updates', async () => {
      const user = await userService.createUser({
        email: 'privacy@example.com',
        name: 'Privacy User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      });

      // Update privacy settings
      const updatedPrivacy = await userService.updatePrivacySettings(user.id!, {
        dataCollection: {
          ideTelemetry: false,
          gitActivity: true,
          communicationData: true,
          granularControls: { 'custom_metric': false }
        }
      } as any);

      expect(updatedPrivacy!.privacySettings.dataCollection.ideTelemetry).toBe(false);

      // Update preferences
      const updatedPreferences = await userService.updatePreferences(user.id!, {
        theme: 'light',
        notifications: {
          email: false,
          inApp: true,
          slack: true,
          teams: false,
          frequency: 'immediate'
        }
      } as any);

      expect(updatedPreferences!.preferences.theme).toBe('light');
      expect(updatedPreferences!.preferences.notifications.email).toBe(false);
    });

    it('should handle user queries and filtering', async () => {
      // Create multiple users
      const users = await Promise.all([
        userService.createUser({
          email: 'dev1@example.com',
          name: 'Developer 1',
          role: UserRole.DEVELOPER,
          teamIds: ['team1'],
          privacySettings: {} as any,
          preferences: {} as any,
          isActive: true
        }),
        userService.createUser({
          email: 'dev2@example.com',
          name: 'Developer 2',
          role: UserRole.DEVELOPER,
          teamIds: ['team1', 'team2'],
          privacySettings: {} as any,
          preferences: {} as any,
          isActive: true
        }),
        userService.createUser({
          email: 'lead@example.com',
          name: 'Team Lead',
          role: UserRole.TEAM_LEAD,
          teamIds: ['team1'],
          privacySettings: {} as any,
          preferences: {} as any,
          isActive: true
        })
      ]);

      // Get users by team
      const team1Users = await userService.getUsersByTeam('team1');
      expect(team1Users.length).toBe(3);

      // Get users by role
      const developers = await userService.getUsersByRole(UserRole.DEVELOPER);
      expect(developers.length).toBe(2);

      // Search users
      const searchResults = await userService.searchUsers('Developer');
      expect(searchResults.length).toBe(2);

      // Get user count
      const totalCount = await userService.getUserCount();
      expect(totalCount).toBe(3);
    });
  });

  describe('Team Management', () => {
    it('should create and manage teams with proper validation', async () => {
      const teamData: Omit<Team, '_id' | 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Team',
        description: 'A test team',
        memberIds: ['user1', 'user2'],
        projectIds: ['project1'],
        settings: {
          workingHours: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' }
          },
          timezone: 'UTC',
          sprintDuration: 2,
          codeReviewSettings: {
            requiredReviewers: 2,
            autoAssignment: true,
            maxReviewTime: 24
          },
          privacyLevel: 'restricted'
        },
        isActive: true
      };

      const team = new TeamModel(teamData);
      const savedTeam = await team.save();

      expect(savedTeam.name).toBe(teamData.name);
      expect(savedTeam.memberIds).toEqual(teamData.memberIds);
      expect(savedTeam.settings.sprintDuration).toBe(2);

      // Test team methods
      await savedTeam.addMember('user3');
      expect(savedTeam.memberIds).toContain('user3');

      await savedTeam.removeMember('user1');
      expect(savedTeam.memberIds).not.toContain('user1');

      await savedTeam.addProject('project2');
      expect(savedTeam.projectIds).toContain('project2');
    });

    it('should handle team queries and relationships', async () => {
      const team1 = new TeamModel({
        name: 'Team Alpha',
        memberIds: ['user1', 'user2'],
        projectIds: ['project1'],
        settings: {} as any,
        isActive: true
      });

      const team2 = new TeamModel({
        name: 'Team Beta',
        memberIds: ['user2', 'user3'],
        projectIds: ['project2'],
        settings: {} as any,
        isActive: true
      });

      await Promise.all([team1.save(), team2.save()]);

      // Find teams by member
      const user2Teams = await TeamModel.findByMember('user2');
      expect(user2Teams.length).toBe(2);

      // Find team by project
      const project1Team = await TeamModel.findByProject('project1');
      expect(project1Team!.name).toBe('Team Alpha');

      // Find active teams
      const activeTeams = await TeamModel.findActive();
      expect(activeTeams.length).toBe(2);
    });
  });

  describe('Project Management', () => {
    it('should create and manage projects with integrations', async () => {
      const projectData: Omit<Project, '_id' | 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Test Project',
        description: 'A test project',
        teamId: 'team1',
        repositoryUrl: 'https://github.com/test/repo',
        settings: {
          trackingEnabled: true,
          metricsConfig: {
            flowMetrics: true,
            codeQuality: true,
            collaboration: true,
            customMetrics: {}
          },
          integrations: {
            git: {
              provider: 'github',
              repositoryUrl: 'https://github.com/test/repo',
              webhookUrl: 'https://api.devflow.com/webhooks/git'
            },
            ci: {
              provider: 'github_actions',
              webhookUrl: 'https://api.devflow.com/webhooks/ci'
            },
            communication: {
              slack: {
                workspaceId: 'workspace123',
                channelId: 'channel456'
              }
            }
          }
        },
        isActive: true
      };

      const project = new ProjectModel(projectData);
      const savedProject = await project.save();

      expect(savedProject.name).toBe(projectData.name);
      expect(savedProject.settings.trackingEnabled).toBe(true);
      expect(savedProject.settings.integrations.git.provider).toBe('github');

      // Test project methods
      await savedProject.disableTracking();
      expect(savedProject.settings.trackingEnabled).toBe(false);

      await savedProject.enableTracking();
      expect(savedProject.settings.trackingEnabled).toBe(true);

      await savedProject.updateMetricsConfig({
        flowMetrics: false,
        customMetrics: { 'custom_metric': true }
      });
      expect(savedProject.settings.metricsConfig.flowMetrics).toBe(false);
    });

    it('should handle project queries and relationships', async () => {
      const projects = await Promise.all([
        new ProjectModel({
          name: 'Project A',
          teamId: 'team1',
          settings: {
            trackingEnabled: true,
            metricsConfig: {} as any,
            integrations: {
              git: {
                provider: 'github',
                repositoryUrl: 'https://github.com/test/a'
              }
            } as any
          },
          isActive: true
        }).save(),
        new ProjectModel({
          name: 'Project B',
          teamId: 'team1',
          settings: {
            trackingEnabled: true,
            metricsConfig: {} as any,
            integrations: {
              git: {
                provider: 'gitlab',
                repositoryUrl: 'https://gitlab.com/test/b'
              }
            } as any
          },
          isActive: true
        }).save()
      ]);

      // Find projects by team
      const team1Projects = await ProjectModel.findByTeam('team1');
      expect(team1Projects.length).toBe(2);

      // Find project by repository
      const projectA = await ProjectModel.findByRepository('https://github.com/test/a');
      expect(projectA!.name).toBe('Project A');

      // Find active projects
      const activeProjects = await ProjectModel.findActive();
      expect(activeProjects.length).toBe(2);
    });
  });

  describe('Database Performance and Indexing', () => {
    it('should perform efficient queries with proper indexing', async () => {
      // Create test data
      const users = await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
          userService.createUser({
            email: `user${i}@example.com`,
            name: `User ${i}`,
            role: i % 2 === 0 ? UserRole.DEVELOPER : UserRole.TEAM_LEAD,
            teamIds: [`team${i % 5}`],
            privacySettings: {} as any,
            preferences: {} as any,
            isActive: true
          })
        )
      );

      // Test query performance
      const startTime = Date.now();
      
      const results = await userService.getUsers(
        { teamId: 'team1' },
        { limit: 10, sort: { createdAt: -1 } }
      );

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(100); // Should complete within 100ms
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle concurrent operations safely', async () => {
      const user = await userService.createUser({
        email: 'concurrent@example.com',
        name: 'Concurrent User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      });

      // Simulate concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) =>
        userService.updateUser(user.id!, { name: `Updated Name ${i}` })
      );

      const results = await Promise.all(updates);
      const successfulUpdates = results.filter(r => r !== null);
      expect(successfulUpdates.length).toBe(10);
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should enforce unique constraints', async () => {
      const userData = {
        email: 'unique@example.com',
        name: 'Unique User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      };

      await userService.createUser(userData);

      // Try to create another user with same email
      await expect(userService.createUser(userData)).rejects.toThrow();
    });

    it('should validate data formats and constraints', async () => {
      // Invalid email format
      await expect(userService.createUser({
        email: 'invalid-email',
        name: 'Test User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      })).rejects.toThrow();

      // Name too short
      await expect(userService.createUser({
        email: 'test@example.com',
        name: 'A',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      })).rejects.toThrow();
    });
  });

  describe('Backup and Recovery', () => {
    it('should validate backup functionality', async () => {
      // Create some test data
      await userService.createUser({
        email: 'backup@example.com',
        name: 'Backup User',
        role: UserRole.DEVELOPER,
        teamIds: ['team1'],
        privacySettings: {} as any,
        preferences: {} as any,
        isActive: true
      });

      // Test backup validation (without actually creating files in test)
      const backups = await backupService.listBackups();
      expect(Array.isArray(backups)).toBe(true);
    });
  });
});