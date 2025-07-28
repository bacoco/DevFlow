import mongoose, { Schema, Document } from 'mongoose';
import { Project, ProjectSettings, MetricsConfig, ProjectIntegrations } from '../types';

interface ProjectDocument extends Project, Document {}

const metricsConfigSchema = new Schema({
  flowMetrics: { type: Boolean, default: true },
  codeQuality: { type: Boolean, default: true },
  collaboration: { type: Boolean, default: true },
  customMetrics: { type: Map, of: Boolean, default: new Map() }
}, { _id: false });

const gitIntegrationSchema = new Schema({
  provider: { type: String, enum: ['github', 'gitlab', 'bitbucket'], required: true },
  repositoryUrl: { type: String, required: true },
  webhookUrl: { type: String },
  accessToken: { type: String, select: false } // Don't include in queries by default
}, { _id: false });

const ciIntegrationSchema = new Schema({
  provider: { type: String, enum: ['jenkins', 'github_actions', 'gitlab_ci'], required: true },
  webhookUrl: { type: String },
  accessToken: { type: String, select: false }
}, { _id: false });

const slackIntegrationSchema = new Schema({
  workspaceId: { type: String, required: true },
  channelId: { type: String, required: true },
  botToken: { type: String, select: false }
}, { _id: false });

const teamsIntegrationSchema = new Schema({
  tenantId: { type: String, required: true },
  channelId: { type: String, required: true },
  webhookUrl: { type: String }
}, { _id: false });

const communicationIntegrationSchema = new Schema({
  slack: { type: slackIntegrationSchema },
  teams: { type: teamsIntegrationSchema }
}, { _id: false });

const projectIntegrationsSchema = new Schema({
  git: { type: gitIntegrationSchema, required: true },
  ci: { type: ciIntegrationSchema },
  communication: { type: communicationIntegrationSchema }
}, { _id: false });

const projectSettingsSchema = new Schema({
  trackingEnabled: { type: Boolean, default: true },
  metricsConfig: {
    type: metricsConfigSchema,
    required: true,
    default: () => ({})
  },
  integrations: {
    type: projectIntegrationsSchema,
    required: true
  }
}, { _id: false });

const projectSchema = new Schema<ProjectDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  teamId: {
    type: String,
    required: true
  },
  repositoryUrl: {
    type: String,
    validate: {
      validator: (url: string) => /^https?:\/\/.+/.test(url),
      message: 'Invalid repository URL format'
    }
  },
  settings: {
    type: projectSettingsSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound unique index
projectSchema.index({ name: 1, teamId: 1 }, { unique: true });
projectSchema.index({ teamId: 1 });
projectSchema.index({ isActive: 1 });

// Virtual for project ID
projectSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Instance methods
projectSchema.methods.updateSettings = function(settings: Partial<ProjectSettings>) {
  this.settings = { ...this.settings, ...settings };
  return this.save();
};

projectSchema.methods.enableTracking = function() {
  this.settings.trackingEnabled = true;
  return this.save();
};

projectSchema.methods.disableTracking = function() {
  this.settings.trackingEnabled = false;
  return this.save();
};

projectSchema.methods.updateMetricsConfig = function(config: Partial<MetricsConfig>) {
  this.settings.metricsConfig = { ...this.settings.metricsConfig, ...config };
  return this.save();
};

projectSchema.methods.updateIntegrations = function(integrations: Partial<ProjectIntegrations>) {
  this.settings.integrations = { ...this.settings.integrations, ...integrations };
  return this.save();
};

// Static methods
projectSchema.statics.findByTeam = function(teamId: string) {
  return this.find({ teamId, isActive: true });
};

projectSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

projectSchema.statics.findByRepository = function(repositoryUrl: string) {
  return this.findOne({ repositoryUrl, isActive: true });
};

export const ProjectModel = mongoose.model<ProjectDocument>('Project', projectSchema);