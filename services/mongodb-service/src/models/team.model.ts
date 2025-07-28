import mongoose, { Schema, Document } from 'mongoose';
import { Team, TeamSettings, WorkingHours, CodeReviewSettings } from '../types';

interface TeamDocument extends Team, Document {}

const timeRangeSchema = new Schema({
  start: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
  end: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ }
}, { _id: false });

const workingHoursSchema = new Schema({
  monday: { type: timeRangeSchema, required: true },
  tuesday: { type: timeRangeSchema, required: true },
  wednesday: { type: timeRangeSchema, required: true },
  thursday: { type: timeRangeSchema, required: true },
  friday: { type: timeRangeSchema, required: true },
  saturday: { type: timeRangeSchema },
  sunday: { type: timeRangeSchema }
}, { _id: false });

const codeReviewSettingsSchema = new Schema({
  requiredReviewers: { type: Number, min: 1, max: 10, default: 2 },
  autoAssignment: { type: Boolean, default: true },
  maxReviewTime: { type: Number, min: 1, max: 168, default: 24 } // hours
}, { _id: false });

const teamSettingsSchema = new Schema({
  workingHours: {
    type: workingHoursSchema,
    required: true,
    default: () => ({
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' }
    })
  },
  timezone: { type: String, default: 'UTC' },
  sprintDuration: { type: Number, min: 1, max: 4, default: 2 }, // weeks
  codeReviewSettings: {
    type: codeReviewSettingsSchema,
    required: true,
    default: () => ({})
  },
  privacyLevel: {
    type: String,
    enum: ['open', 'restricted', 'private'],
    default: 'restricted'
  }
}, { _id: false });

const teamSchema = new Schema<TeamDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  memberIds: [{
    type: String,
    required: true
  }],
  projectIds: [{
    type: String
  }],
  settings: {
    type: teamSettingsSchema,
    required: true,
    default: () => ({})
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
teamSchema.index({ name: 1 }, { unique: true });
teamSchema.index({ memberIds: 1 });
teamSchema.index({ isActive: 1 });

// Virtual for team ID
teamSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Instance methods
teamSchema.methods.addMember = function(userId: string) {
  if (!this.memberIds.includes(userId)) {
    this.memberIds.push(userId);
  }
  return this.save();
};

teamSchema.methods.removeMember = function(userId: string) {
  this.memberIds = this.memberIds.filter(id => id !== userId);
  return this.save();
};

teamSchema.methods.addProject = function(projectId: string) {
  if (!this.projectIds.includes(projectId)) {
    this.projectIds.push(projectId);
  }
  return this.save();
};

teamSchema.methods.removeProject = function(projectId: string) {
  this.projectIds = this.projectIds.filter(id => id !== projectId);
  return this.save();
};

teamSchema.methods.updateSettings = function(settings: Partial<TeamSettings>) {
  this.settings = { ...this.settings, ...settings };
  return this.save();
};

teamSchema.methods.getMemberCount = function() {
  return this.memberIds.length;
};

teamSchema.methods.getProjectCount = function() {
  return this.projectIds.length;
};

// Static methods
teamSchema.statics.findByMember = function(userId: string) {
  return this.find({ memberIds: userId, isActive: true });
};

teamSchema.statics.findByProject = function(projectId: string) {
  return this.findOne({ projectIds: projectId, isActive: true });
};

teamSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

export const TeamModel = mongoose.model<TeamDocument>('Team', teamSchema);