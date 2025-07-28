import mongoose, { Schema, Document } from 'mongoose';
import { User, UserRole, PrivacySettings, UserPreferences, AnonymizationLevel } from '../types';

interface UserDocument extends User, Document {}

const privacySettingsSchema = new Schema({
  dataCollection: {
    ideTelemetry: { type: Boolean, default: true },
    gitActivity: { type: Boolean, default: true },
    communicationData: { type: Boolean, default: false },
    granularControls: { type: Map, of: Boolean, default: new Map() }
  },
  sharing: {
    teamMetrics: { type: Boolean, default: true },
    individualMetrics: { type: Boolean, default: false },
    anonymousAggregation: { type: Boolean, default: true }
  },
  retention: {
    personalData: { type: Number, default: 730 }, // 2 years
    aggregatedData: { type: Number, default: 1825 }, // 5 years
    auditLogs: { type: Number, default: 365 } // 1 year
  },
  anonymization: {
    type: String,
    enum: Object.values(AnonymizationLevel),
    default: AnonymizationLevel.PARTIAL
  }
}, { _id: false });

const userPreferencesSchema = new Schema({
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
  timezone: { type: String, default: 'UTC' },
  language: { type: String, default: 'en' },
  notifications: {
    email: { type: Boolean, default: true },
    inApp: { type: Boolean, default: true },
    slack: { type: Boolean, default: false },
    teams: { type: Boolean, default: false },
    frequency: { type: String, enum: ['immediate', 'hourly', 'daily', 'weekly'], default: 'daily' }
  },
  dashboard: {
    defaultView: { type: String, default: 'overview' },
    refreshInterval: { type: Number, default: 300000 }, // 5 minutes
    showTutorials: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false }
  }
}, { _id: false });

const userSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Invalid email format'
    }
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true,
    default: UserRole.DEVELOPER
  },
  teamIds: [{
    type: String,
    required: true
  }],
  privacySettings: {
    type: privacySettingsSchema,
    required: true,
    default: () => ({})
  },
  preferences: {
    type: userPreferencesSchema,
    required: true,
    default: () => ({})
  },
  lastLoginAt: {
    type: Date
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

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ teamIds: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: 1 });

// Virtual for user ID
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Pre-save middleware for validation
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Instance methods
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

userSchema.methods.addToTeam = function(teamId: string) {
  if (!this.teamIds.includes(teamId)) {
    this.teamIds.push(teamId);
  }
  return this.save();
};

userSchema.methods.removeFromTeam = function(teamId: string) {
  this.teamIds = this.teamIds.filter(id => id !== teamId);
  return this.save();
};

userSchema.methods.updatePrivacySettings = function(settings: Partial<PrivacySettings>) {
  this.privacySettings = { ...this.privacySettings, ...settings };
  return this.save();
};

userSchema.methods.updatePreferences = function(preferences: Partial<UserPreferences>) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

userSchema.statics.findByTeam = function(teamId: string) {
  return this.find({ teamIds: teamId, isActive: true });
};

userSchema.statics.findByRole = function(role: UserRole) {
  return this.find({ role, isActive: true });
};

export const UserModel = mongoose.model<UserDocument>('User', userSchema);