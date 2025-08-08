/**
 * Alert Center Component
 * Displays and manages critical alerts with acknowledgment and snooze functionality
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  X,
  Settings,
  Filter,
  Search,
  Bell,
  BellOff,
  Pause,
  Play,
  MoreVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Modal } from './Modal';
import { alertService, Alert, AlertSeverity, AlertStatus } from '../../services/alertService';

const severityIcons = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

const severityStyles = {
  low: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  },
  medium: {
    container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    message: 'text-yellow-700 dark:text-yellow-300',
    badge: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  },
  high: {
    container: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
    title: 'text-orange-900 dark:text-orange-100',
    message: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  },
  critical: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 ring-2 ring-red-500/20',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    message: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  },
};

const statusStyles = {
  active: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  acknowledged: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  resolved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  snoozed: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
  escalated: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
};

interface AlertItemProps {
  alert: Alert;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onSnooze: (alertId: string, duration: number) => void;
  compact?: boolean;
}

const AlertItem: React.FC<AlertItemProps> = ({
  alert,
  onAcknowledge,
  onResolve,
  onSnooze,
  compact = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const Icon = severityIcons[alert.severity];
  const styles = severityStyles[alert.severity];

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatSnoozeTime = (snoozedUntil: Date) => {
    const now = new Date();
    const diff = snoozedUntil.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const snoozeOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '8 hours', value: 480 },
  ];

  return (
    <motion.div
      className={cn(
        'relative rounded-lg border shadow-sm backdrop-blur-sm',
        'transition-all duration-200',
        styles.container,
        compact ? 'p-3' : 'p-4',
        alert.severity === 'critical' && 'animate-pulse'
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      layout
    >
      {/* Severity indicator */}
      <div className="absolute top-0 left-0 w-1 h-full bg-current rounded-l-lg opacity-50" />

      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          <Icon size={compact ? 16 : 20} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={cn('font-semibold', compact ? 'text-sm' : 'text-base', styles.title)}>
                  {alert.title}
                </h4>
                
                {/* Status badge */}
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  statusStyles[alert.status]
                )}>
                  {alert.status}
                </span>

                {/* Severity badge */}
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  styles.badge
                )}>
                  {alert.severity}
                </span>

                {/* Escalation level */}
                {alert.escalationLevel > 0 && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                    L{alert.escalationLevel}
                  </span>
                )}
              </div>

              {/* Message */}
              {alert.message && (
                <p className={cn(
                  compact ? 'text-sm' : 'text-base',
                  'mb-2',
                  styles.message
                )}>
                  {alert.message}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center space-x-1">
                  <Clock size={12} />
                  <span>{formatTime(alert.timestamp)}</span>
                </span>
                
                <span>Category: {alert.category}</span>
                <span>Source: {alert.source}</span>

                {alert.snoozedUntil && (
                  <span className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                    <Pause size={12} />
                    <span>Snoozed for {formatSnoozeTime(alert.snoozedUntil)}</span>
                  </span>
                )}
              </div>

              {/* Tags */}
              {alert.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {alert.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 ml-2">
              {alert.status === 'active' && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onAcknowledge(alert.id)}
                    className="text-xs"
                  >
                    Acknowledge
                  </Button>
                  
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
                      className="text-xs"
                    >
                      <Pause size={14} />
                    </Button>
                    
                    {showSnoozeOptions && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                        {snoozeOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              onSnooze(alert.id, option.value);
                              setShowSnoozeOptions(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {(alert.status === 'active' || alert.status === 'acknowledged') && (
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onResolve(alert.id)}
                  className="text-xs"
                >
                  Resolve
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreVertical size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div>
                {alert.acknowledgedBy && (
                  <span>Acknowledged by {alert.acknowledgedBy} at {alert.acknowledgedAt?.toLocaleTimeString()}</span>
                )}
                {alert.resolvedBy && (
                  <span>Resolved by {alert.resolvedBy} at {alert.resolvedAt?.toLocaleTimeString()}</span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Delivery attempts: {alert.deliveryAttempts.length}</span>
                <span>Escalation level: {alert.escalationLevel}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface AlertCenterProps {
  className?: string;
  compact?: boolean;
  maxAlerts?: number;
  showFilters?: boolean;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  className,
  compact = false,
  maxAlerts = 50,
  showFilters = true,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'all'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    // Subscribe to alert updates
    const unsubscribe = alertService.subscribe((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    // Load initial alerts
    setAlerts(alertService.getActiveAlerts());

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Filter alerts based on search and filters
    let filtered = alerts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by severity
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === selectedSeverity);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(alert => alert.status === selectedStatus);
    }

    // Filter resolved alerts
    if (!showResolved) {
      filtered = filtered.filter(alert => alert.status !== 'resolved');
    }

    // Limit results
    filtered = filtered.slice(0, maxAlerts);

    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, selectedSeverity, selectedStatus, showResolved, maxAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    await alertService.acknowledgeAlert(alertId, 'current-user');
  };

  const handleResolve = async (alertId: string) => {
    await alertService.resolveAlert(alertId, 'current-user');
  };

  const handleSnooze = async (alertId: string, duration: number) => {
    await alertService.snoozeAlert(alertId, duration, 'current-user');
  };

  const getAlertStats = () => {
    const stats = alertService.getAlertStatistics();
    return {
      total: stats.active + stats.acknowledged + stats.escalated,
      critical: stats.bySeverity.critical,
      high: stats.bySeverity.high,
      medium: stats.bySeverity.medium,
      low: stats.bySeverity.low,
    };
  };

  const stats = getAlertStats();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Alert Center
            </h2>
          </div>
          
          {/* Stats */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
              {stats.critical} Critical
            </span>
            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
              {stats.high} High
            </span>
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
              {stats.medium} Medium
            </span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              {stats.low} Low
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? <EyeOff size={16} /> : <Eye size={16} />}
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={16} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={16} />}
                clearable
                onClear={() => setSearchTerm('')}
              />
            </div>
            
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as AlertSeverity | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as AlertStatus | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="snoozed">Snoozed</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </Card>
      )}

      {/* Alert List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onSnooze={handleSnooze}
                compact={compact}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-500 dark:text-gray-400"
            >
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">All systems are running smoothly</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Alert Settings"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">In-App Notifications</label>
                  <p className="text-sm text-gray-500">Show alerts in the application</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Email Notifications</label>
                  <p className="text-sm text-gray-500">Send alerts via email</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Push Notifications</label>
                  <p className="text-sm text-gray-500">Send push notifications</p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Escalation Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Auto-escalation</label>
                  <p className="text-sm text-gray-500">Automatically escalate unacknowledged alerts</p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
              
              <div>
                <label className="block font-medium mb-2">Escalation Delay (minutes)</label>
                <input
                  type="number"
                  defaultValue={15}
                  min={1}
                  max={60}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AlertCenter;