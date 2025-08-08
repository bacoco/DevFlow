import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface APIEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  body?: string;
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  description?: string;
  tags?: string[];
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  description?: string;
}

export interface APIResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  duration: number;
  timestamp: Date;
}

interface APIIntegrationToolsProps {
  endpoints: APIEndpoint[];
  webhooks: WebhookConfig[];
  onEndpointSave: (endpoint: APIEndpoint) => void;
  onEndpointDelete: (endpointId: string) => void;
  onWebhookSave: (webhook: WebhookConfig) => void;
  onWebhookDelete: (webhookId: string) => void;
  onWebhookToggle: (webhookId: string, active: boolean) => void;
  className?: string;
}

export const APIIntegrationTools: React.FC<APIIntegrationToolsProps> = ({
  endpoints,
  webhooks,
  onEndpointSave,
  onEndpointDelete,
  onWebhookSave,
  onWebhookDelete,
  onWebhookToggle,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'endpoints' | 'webhooks' | 'testing'>('endpoints');
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [testResponse, setTestResponse] = useState<APIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Default endpoint template
  const createNewEndpoint = useCallback((): APIEndpoint => ({
    id: `endpoint_${Date.now()}`,
    name: 'New Endpoint',
    url: 'https://api.example.com/data',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    authentication: {
      type: 'none'
    },
    tags: []
  }), []);

  // Default webhook template
  const createNewWebhook = useCallback((): WebhookConfig => ({
    id: `webhook_${Date.now()}`,
    name: 'New Webhook',
    url: 'https://your-app.com/webhook',
    events: ['data.updated'],
    active: true,
    retryPolicy: {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    }
  }), []);

  // Test API endpoint
  const testEndpoint = useCallback(async (endpoint: APIEndpoint) => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = { ...endpoint.headers };

      // Add authentication headers
      if (endpoint.authentication) {
        switch (endpoint.authentication.type) {
          case 'bearer':
            if (endpoint.authentication.token) {
              headers['Authorization'] = `Bearer ${endpoint.authentication.token}`;
            }
            break;
          case 'basic':
            if (endpoint.authentication.username && endpoint.authentication.password) {
              const credentials = btoa(`${endpoint.authentication.username}:${endpoint.authentication.password}`);
              headers['Authorization'] = `Basic ${credentials}`;
            }
            break;
          case 'api-key':
            if (endpoint.authentication.apiKey && endpoint.authentication.apiKeyHeader) {
              headers[endpoint.authentication.apiKeyHeader] = endpoint.authentication.apiKey;
            }
            break;
        }
      }

      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers
      };

      if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        requestOptions.body = endpoint.body;
      }

      const response = await fetch(endpoint.url, requestOptions);
      const data = await response.json().catch(() => response.text());
      const duration = Date.now() - startTime;

      const apiResponse: APIResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        duration,
        timestamp: new Date()
      };

      setTestResponse(apiResponse);
    } catch (error) {
      const duration = Date.now() - startTime;
      setTestResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: error.message },
        duration,
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save endpoint
  const saveEndpoint = useCallback(() => {
    if (selectedEndpoint) {
      onEndpointSave(selectedEndpoint);
      setIsEditing(false);
    }
  }, [selectedEndpoint, onEndpointSave]);

  // Save webhook
  const saveWebhook = useCallback(() => {
    if (selectedWebhook) {
      onWebhookSave(selectedWebhook);
      setIsEditing(false);
    }
  }, [selectedWebhook, onWebhookSave]);

  // Filter items based on search
  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredWebhooks = webhooks.filter(webhook =>
    webhook.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webhook.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    webhook.events.some(event => event.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Render endpoint form
  const renderEndpointForm = () => {
    if (!selectedEndpoint) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={selectedEndpoint.name}
              onChange={(e) => setSelectedEndpoint({ ...selectedEndpoint, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={!isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={selectedEndpoint.method}
              onChange={(e) => setSelectedEndpoint({ ...selectedEndpoint, method: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={!isEditing}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">URL</label>
          <input
            type="url"
            value={selectedEndpoint.url}
            onChange={(e) => setSelectedEndpoint({ ...selectedEndpoint, url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Headers (JSON)</label>
          <textarea
            value={JSON.stringify(selectedEndpoint.headers, null, 2)}
            onChange={(e) => {
              try {
                const headers = JSON.parse(e.target.value);
                setSelectedEndpoint({ ...selectedEndpoint, headers });
              } catch (error) {
                // Invalid JSON, ignore
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-mono text-sm"
            rows={4}
            disabled={!isEditing}
          />
        </div>

        {['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) && (
          <div>
            <label className="block text-sm font-medium mb-1">Request Body</label>
            <textarea
              value={selectedEndpoint.body || ''}
              onChange={(e) => setSelectedEndpoint({ ...selectedEndpoint, body: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-mono text-sm"
              rows={6}
              disabled={!isEditing}
              placeholder="Request body (JSON, XML, etc.)"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Authentication</label>
          <div className="space-y-3 p-3 border border-gray-300 dark:border-gray-600 rounded">
            <select
              value={selectedEndpoint.authentication?.type || 'none'}
              onChange={(e) => setSelectedEndpoint({
                ...selectedEndpoint,
                authentication: { ...selectedEndpoint.authentication, type: e.target.value as any }
              })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={!isEditing}
            >
              <option value="none">None</option>
              <option value="bearer">Bearer Token</option>
              <option value="basic">Basic Auth</option>
              <option value="api-key">API Key</option>
            </select>

            {selectedEndpoint.authentication?.type === 'bearer' && (
              <input
                type="password"
                placeholder="Bearer Token"
                value={selectedEndpoint.authentication.token || ''}
                onChange={(e) => setSelectedEndpoint({
                  ...selectedEndpoint,
                  authentication: { ...selectedEndpoint.authentication, token: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                disabled={!isEditing}
              />
            )}

            {selectedEndpoint.authentication?.type === 'basic' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Username"
                  value={selectedEndpoint.authentication.username || ''}
                  onChange={(e) => setSelectedEndpoint({
                    ...selectedEndpoint,
                    authentication: { ...selectedEndpoint.authentication, username: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  disabled={!isEditing}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={selectedEndpoint.authentication.password || ''}
                  onChange={(e) => setSelectedEndpoint({
                    ...selectedEndpoint,
                    authentication: { ...selectedEndpoint.authentication, password: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  disabled={!isEditing}
                />
              </div>
            )}

            {selectedEndpoint.authentication?.type === 'api-key' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Header Name (e.g., X-API-Key)"
                  value={selectedEndpoint.authentication.apiKeyHeader || ''}
                  onChange={(e) => setSelectedEndpoint({
                    ...selectedEndpoint,
                    authentication: { ...selectedEndpoint.authentication, apiKeyHeader: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  disabled={!isEditing}
                />
                <input
                  type="password"
                  placeholder="API Key"
                  value={selectedEndpoint.authentication.apiKey || ''}
                  onChange={(e) => setSelectedEndpoint({
                    ...selectedEndpoint,
                    authentication: { ...selectedEndpoint.authentication, apiKey: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  disabled={!isEditing}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={selectedEndpoint.description || ''}
            onChange={(e) => setSelectedEndpoint({ ...selectedEndpoint, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            rows={3}
            disabled={!isEditing}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={saveEndpoint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => testEndpoint(selectedEndpoint)}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => onEndpointDelete(selectedEndpoint.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render webhook form
  const renderWebhookForm = () => {
    if (!selectedWebhook) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={selectedWebhook.name}
              onChange={(e) => setSelectedWebhook({ ...selectedWebhook, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              disabled={!isEditing}
            />
          </div>
          
          <div className="flex items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedWebhook.active}
                onChange={(e) => setSelectedWebhook({ ...selectedWebhook, active: e.target.checked })}
                disabled={!isEditing}
              />
              Active
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Webhook URL</label>
          <input
            type="url"
            value={selectedWebhook.url}
            onChange={(e) => setSelectedWebhook({ ...selectedWebhook, url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Events (comma-separated)</label>
          <input
            type="text"
            value={selectedWebhook.events.join(', ')}
            onChange={(e) => setSelectedWebhook({
              ...selectedWebhook,
              events: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
            })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            disabled={!isEditing}
            placeholder="data.updated, user.created, task.completed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Secret (optional)</label>
          <input
            type="password"
            value={selectedWebhook.secret || ''}
            onChange={(e) => setSelectedWebhook({ ...selectedWebhook, secret: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            disabled={!isEditing}
            placeholder="Webhook secret for signature verification"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Custom Headers (JSON)</label>
          <textarea
            value={JSON.stringify(selectedWebhook.headers || {}, null, 2)}
            onChange={(e) => {
              try {
                const headers = JSON.parse(e.target.value);
                setSelectedWebhook({ ...selectedWebhook, headers });
              } catch (error) {
                // Invalid JSON, ignore
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 font-mono text-sm"
            rows={4}
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Retry Policy</label>
          <div className="grid grid-cols-3 gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max Retries</label>
              <input
                type="number"
                value={selectedWebhook.retryPolicy?.maxRetries || 3}
                onChange={(e) => setSelectedWebhook({
                  ...selectedWebhook,
                  retryPolicy: {
                    ...selectedWebhook.retryPolicy,
                    maxRetries: parseInt(e.target.value) || 3,
                    retryDelay: selectedWebhook.retryPolicy?.retryDelay || 1000,
                    backoffMultiplier: selectedWebhook.retryPolicy?.backoffMultiplier || 2
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                disabled={!isEditing}
                min="0"
                max="10"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Delay (ms)</label>
              <input
                type="number"
                value={selectedWebhook.retryPolicy?.retryDelay || 1000}
                onChange={(e) => setSelectedWebhook({
                  ...selectedWebhook,
                  retryPolicy: {
                    ...selectedWebhook.retryPolicy,
                    maxRetries: selectedWebhook.retryPolicy?.maxRetries || 3,
                    retryDelay: parseInt(e.target.value) || 1000,
                    backoffMultiplier: selectedWebhook.retryPolicy?.backoffMultiplier || 2
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                disabled={!isEditing}
                min="100"
                step="100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Backoff</label>
              <input
                type="number"
                value={selectedWebhook.retryPolicy?.backoffMultiplier || 2}
                onChange={(e) => setSelectedWebhook({
                  ...selectedWebhook,
                  retryPolicy: {
                    ...selectedWebhook.retryPolicy,
                    maxRetries: selectedWebhook.retryPolicy?.maxRetries || 3,
                    retryDelay: selectedWebhook.retryPolicy?.retryDelay || 1000,
                    backoffMultiplier: parseFloat(e.target.value) || 2
                  }
                })}
                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                disabled={!isEditing}
                min="1"
                max="5"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={selectedWebhook.description || ''}
            onChange={(e) => setSelectedWebhook({ ...selectedWebhook, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            rows={3}
            disabled={!isEditing}
            placeholder="Optional description"
          />
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={saveWebhook}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => onWebhookToggle(selectedWebhook.id, !selectedWebhook.active)}
                className={`px-4 py-2 rounded text-white ${
                  selectedWebhook.active 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {selectedWebhook.active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => onWebhookDelete(selectedWebhook.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`api-integration-tools ${className}`}>
      {/* Tab navigation */}
      <div className="flex border-b border-gray-300 dark:border-gray-600 mb-6">
        {[
          { id: 'endpoints', label: 'API Endpoints' },
          { id: 'webhooks', label: 'Webhooks' },
          { id: 'testing', label: 'Testing' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - List */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
            
            <button
              onClick={() => {
                if (activeTab === 'endpoints') {
                  const newEndpoint = createNewEndpoint();
                  setSelectedEndpoint(newEndpoint);
                  setIsEditing(true);
                } else if (activeTab === 'webhooks') {
                  const newWebhook = createNewWebhook();
                  setSelectedWebhook(newWebhook);
                  setIsEditing(true);
                }
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeTab === 'endpoints' && filteredEndpoints.map(endpoint => (
              <div
                key={endpoint.id}
                onClick={() => {
                  setSelectedEndpoint(endpoint);
                  setSelectedWebhook(null);
                  setIsEditing(false);
                }}
                className={`p-3 border border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedEndpoint?.id === endpoint.id ? 'bg-blue-50 dark:bg-blue-900 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{endpoint.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                    endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {endpoint.method}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                  {endpoint.url}
                </div>
              </div>
            ))}

            {activeTab === 'webhooks' && filteredWebhooks.map(webhook => (
              <div
                key={webhook.id}
                onClick={() => {
                  setSelectedWebhook(webhook);
                  setSelectedEndpoint(null);
                  setIsEditing(false);
                }}
                className={`p-3 border border-gray-300 dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedWebhook?.id === webhook.id ? 'bg-blue-50 dark:bg-blue-900 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{webhook.name}</span>
                  <span className={`w-3 h-3 rounded-full ${
                    webhook.active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                  {webhook.url}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {webhook.events.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Details */}
        <div className="lg:col-span-2">
          {activeTab === 'endpoints' && selectedEndpoint && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">API Endpoint Configuration</h3>
              {renderEndpointForm()}
            </div>
          )}

          {activeTab === 'webhooks' && selectedWebhook && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Webhook Configuration</h3>
              {renderWebhookForm()}
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">API Testing</h3>
              
              {testResponse && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Response</h4>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-sm rounded ${
                        testResponse.status >= 200 && testResponse.status < 300
                          ? 'bg-green-100 text-green-800'
                          : testResponse.status >= 400
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {testResponse.status} {testResponse.statusText}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {testResponse.duration}ms
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Headers</h5>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(testResponse.headers, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Body</h5>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto max-h-96 overflow-y-auto">
                      {typeof testResponse.data === 'string' 
                        ? testResponse.data 
                        : JSON.stringify(testResponse.data, null, 2)
                      }
                    </pre>
                  </div>
                </div>
              )}

              {!testResponse && (
                <div className="text-center py-8 text-gray-500">
                  Select an endpoint and click "Test" to see the response here.
                </div>
              )}
            </div>
          )}

          {!selectedEndpoint && !selectedWebhook && activeTab !== 'testing' && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center text-gray-500">
              Select an item from the list to view details, or click "Add" to create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};