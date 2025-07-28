import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createLogger, format, transports } from 'winston';
import { DatabaseConfig } from './config/database';
import { UserService } from './services/user.service';
import { BackupService } from './services/backup.service';
import { UserModel } from './models/user.model';
import { TeamModel } from './models/team.model';
import { ProjectModel } from './models/project.model';
import { User, Team, Project, QueryOptions, FilterOptions } from './types';

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/mongodb-service.log' })
  ]
});

class MongoDBService {
  private app: express.Application;
  private dbConfig: DatabaseConfig;
  private userService: UserService;
  private backupService: BackupService;

  constructor() {
    this.app = express();
    this.dbConfig = new DatabaseConfig(logger);
    this.userService = new UserService(logger);
    this.backupService = new BackupService(logger);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      const isHealthy = await this.dbConfig.healthCheck();
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      });
    });

    // Database stats
    this.app.get('/stats', async (req, res) => {
      try {
        const stats = await this.dbConfig.getStats();
        res.json(stats);
      } catch (error) {
        logger.error('Failed to get database stats:', error);
        res.status(500).json({ error: 'Failed to get database stats' });
      }
    });

    // User endpoints
    this.app.post('/users', async (req, res) => {
      try {
        const user = await this.userService.createUser(req.body);
        res.status(201).json(user);
      } catch (error) {
        logger.error('Failed to create user:', error);
        res.status(500).json({ error: 'Failed to create user' });
      }
    });

    this.app.get('/users/:id', async (req, res) => {
      try {
        const user = await this.userService.getUserById(req.params.id);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        logger.error('Failed to get user:', error);
        res.status(500).json({ error: 'Failed to get user' });
      }
    });

    this.app.put('/users/:id', async (req, res) => {
      try {
        const user = await this.userService.updateUser(req.params.id, req.body);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        logger.error('Failed to update user:', error);
        res.status(500).json({ error: 'Failed to update user' });
      }
    });

    this.app.delete('/users/:id', async (req, res) => {
      try {
        const success = await this.userService.deleteUser(req.params.id);
        if (!success) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
      }
    });

    this.app.get('/users', async (req, res) => {
      try {
        const filters: FilterOptions = {};
        const options: QueryOptions = {};

        if (req.query.teamId) filters.teamId = req.query.teamId as string;
        if (req.query.limit) options.limit = parseInt(req.query.limit as string);
        if (req.query.skip) options.skip = parseInt(req.query.skip as string);

        const users = await this.userService.getUsers(filters, options);
        res.json(users);
      } catch (error) {
        logger.error('Failed to get users:', error);
        res.status(500).json({ error: 'Failed to get users' });
      }
    });

    this.app.post('/users/:id/teams/:teamId', async (req, res) => {
      try {
        const user = await this.userService.addUserToTeam(req.params.id, req.params.teamId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        logger.error('Failed to add user to team:', error);
        res.status(500).json({ error: 'Failed to add user to team' });
      }
    });

    this.app.put('/users/:id/privacy', async (req, res) => {
      try {
        const user = await this.userService.updatePrivacySettings(req.params.id, req.body);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        logger.error('Failed to update privacy settings:', error);
        res.status(500).json({ error: 'Failed to update privacy settings' });
      }
    });

    this.app.put('/users/:id/preferences', async (req, res) => {
      try {
        const user = await this.userService.updatePreferences(req.params.id, req.body);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
      } catch (error) {
        logger.error('Failed to update preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
      }
    });

    // Team endpoints
    this.app.post('/teams', async (req, res) => {
      try {
        const team = new TeamModel(req.body);
        const savedTeam = await team.save();
        res.status(201).json(savedTeam.toJSON());
      } catch (error) {
        logger.error('Failed to create team:', error);
        res.status(500).json({ error: 'Failed to create team' });
      }
    });

    this.app.get('/teams/:id', async (req, res) => {
      try {
        const team = await TeamModel.findById(req.params.id);
        if (!team) {
          return res.status(404).json({ error: 'Team not found' });
        }
        res.json(team.toJSON());
      } catch (error) {
        logger.error('Failed to get team:', error);
        res.status(500).json({ error: 'Failed to get team' });
      }
    });

    // Project endpoints
    this.app.post('/projects', async (req, res) => {
      try {
        const project = new ProjectModel(req.body);
        const savedProject = await project.save();
        res.status(201).json(savedProject.toJSON());
      } catch (error) {
        logger.error('Failed to create project:', error);
        res.status(500).json({ error: 'Failed to create project' });
      }
    });

    this.app.get('/projects/:id', async (req, res) => {
      try {
        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.json(project.toJSON());
      } catch (error) {
        logger.error('Failed to get project:', error);
        res.status(500).json({ error: 'Failed to get project' });
      }
    });

    // Backup endpoints
    this.app.post('/backup', async (req, res) => {
      try {
        const backupPath = await this.backupService.createBackup();
        res.json({ success: true, backupPath });
      } catch (error) {
        logger.error('Failed to create backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
      }
    });

    this.app.get('/backups', async (req, res) => {
      try {
        const backups = await this.backupService.listBackups();
        res.json(backups);
      } catch (error) {
        logger.error('Failed to list backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
      }
    });

    this.app.post('/restore', async (req, res) => {
      try {
        const { backupPath } = req.body;
        await this.backupService.restoreBackup(backupPath);
        res.json({ success: true });
      } catch (error) {
        logger.error('Failed to restore backup:', error);
        res.status(500).json({ error: 'Failed to restore backup' });
      }
    });
  }

  async start(port: number = 3004): Promise<void> {
    try {
      await this.dbConfig.connect();
      await this.dbConfig.createIndexes();
      
      // Schedule automatic backups
      await this.backupService.scheduleBackup();
      
      this.app.listen(port, () => {
        logger.info(`MongoDB service listening on port ${port}`);
      });
    } catch (error) {
      logger.error('Failed to start MongoDB service:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.backupService.stopAllScheduledBackups();
      await this.dbConfig.disconnect();
      logger.info('MongoDB service shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

// Start service if run directly
if (require.main === module) {
  const service = new MongoDBService();
  
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await service.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await service.shutdown();
    process.exit(0);
  });

  service.start();
}

export { MongoDBService, DatabaseConfig, UserService, BackupService };