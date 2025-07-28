import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DevFlow Intelligence REST API',
      version: '1.0.0',
      description: 'REST API for external integrations and data export',
      contact: {
        name: 'DevFlow Intelligence Team',
        email: 'api@devflow.com'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error type'
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              example: 'api-gateway-rest'
            },
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy']
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            dependencies: {
              type: 'object',
              properties: {
                mongodb: { type: 'boolean' },
                influxdb: { type: 'boolean' },
                redis: { type: 'boolean' }
              }
            }
          }
        },
        GrafanaSearchResponse: {
          type: 'array',
          items: {
            type: 'string',
            example: 'productivity.time_in_flow'
          }
        },
        GrafanaQueryRequest: {
          type: 'object',
          properties: {
            targets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  target: { type: 'string' },
                  refId: { type: 'string' }
                }
              }
            },
            range: {
              type: 'object',
              properties: {
                from: { type: 'string', format: 'date-time' },
                to: { type: 'string', format: 'date-time' }
              }
            },
            intervalMs: { type: 'number' },
            maxDataPoints: { type: 'number' }
          }
        },
        GrafanaQueryResponse: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              target: { type: 'string' },
              refId: { type: 'string' },
              datapoints: {
                type: 'array',
                items: {
                  type: 'array',
                  items: { type: 'number' }
                }
              }
            }
          }
        },
        WebhookResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Webhook processed successfully'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        TeamReport: {
          type: 'object',
          properties: {
            team: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                memberCount: { type: 'number' }
              }
            },
            period: {
              type: 'object',
              properties: {
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' }
              }
            },
            metrics: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                byType: { type: 'object' },
                averages: { type: 'object' }
              }
            },
            flowStates: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                averageFocusScore: { type: 'number' },
                totalFocusTime: { type: 'number' },
                averageInterruptions: { type: 'number' }
              }
            },
            generatedAt: { type: 'string', format: 'date-time' },
            generatedBy: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/rest/*.ts'] // Path to the API files
};

export const specs = swaggerJsdoc(options);

// Add manual route documentation since JSDoc comments in TypeScript can be tricky

export const routeDocumentation = {
  '/api': {
    get: {
      summary: 'API Information',
      description: 'Get information about available REST API endpoints',
      tags: ['General'],
      security: [],
      responses: {
        200: {
          description: 'API information',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  version: { type: 'string' },
                  description: { type: 'string' },
                  endpoints: { type: 'object' },
                  authentication: { type: 'object' },
                  rateLimit: { type: 'object' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/health': {
    get: {
      summary: 'Health Check',
      description: 'Check the health status of the API and its dependencies',
      tags: ['Health'],
      security: [],
      responses: {
        200: {
          description: 'Service is healthy',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthStatus' }
            }
          }
        },
        503: {
          description: 'Service is unhealthy',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthStatus' }
            }
          }
        }
      }
    }
  },
  '/api/grafana/test': {
    get: {
      summary: 'Grafana Data Source Test',
      description: 'Test endpoint for Grafana data source configuration',
      tags: ['Grafana'],
      responses: {
        200: {
          description: 'Data source test successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'success' },
                  message: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/api/grafana/search': {
    post: {
      summary: 'Grafana Metric Search',
      description: 'Search for available metrics in Grafana format',
      tags: ['Grafana'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                target: { type: 'string', description: 'Search term' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'List of available metrics',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GrafanaSearchResponse' }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  '/api/grafana/query': {
    post: {
      summary: 'Grafana Data Query',
      description: 'Query time series data for Grafana visualization',
      tags: ['Grafana'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/GrafanaQueryRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Time series data',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GrafanaQueryResponse' }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  '/api/webhooks/github': {
    post: {
      summary: 'GitHub Webhook',
      description: 'Receive GitHub webhook events for Git activity tracking',
      tags: ['Webhooks'],
      security: [],
      parameters: [
        {
          name: 'x-github-event',
          in: 'header',
          required: true,
          schema: { type: 'string' },
          description: 'GitHub event type'
        },
        {
          name: 'x-hub-signature-256',
          in: 'header',
          required: true,
          schema: { type: 'string' },
          description: 'GitHub webhook signature'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'GitHub webhook payload'
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Webhook processed successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookResponse' }
            }
          }
        },
        401: {
          description: 'Invalid webhook signature',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  '/api/export/metrics/csv': {
    get: {
      summary: 'Export Metrics as CSV',
      description: 'Export productivity metrics in CSV format',
      tags: ['Export'],
      parameters: [
        {
          name: 'userId',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by user ID'
        },
        {
          name: 'teamId',
          in: 'query',
          schema: { type: 'string' },
          description: 'Filter by team ID'
        },
        {
          name: 'type',
          in: 'query',
          schema: { 
            type: 'string',
            enum: ['TIME_IN_FLOW', 'CODE_CHURN', 'REVIEW_LAG', 'FOCUS_TIME', 'COMPLEXITY_TREND', 'COLLABORATION_SCORE']
          },
          description: 'Filter by metric type'
        },
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Start date for filtering'
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'End date for filtering'
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 1000 },
          description: 'Maximum number of records'
        }
      ],
      responses: {
        200: {
          description: 'CSV file download',
          content: {
            'text/csv': {
              schema: { type: 'string' }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  '/api/export/team-report/{teamId}': {
    get: {
      summary: 'Export Team Report',
      description: 'Export comprehensive team productivity report',
      tags: ['Export'],
      parameters: [
        {
          name: 'teamId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Team ID'
        },
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'Start date for report period'
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date-time' },
          description: 'End date for report period'
        },
        {
          name: 'format',
          in: 'query',
          schema: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          description: 'Export format'
        }
      ],
      responses: {
        200: {
          description: 'Team report',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TeamReport' }
            },
            'text/csv': {
              schema: { type: 'string' }
            }
          }
        },
        404: {
          description: 'Team not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  }
};

// Merge manual documentation with generated specs
export const completeSpecs = {
  ...specs,
  paths: {
    ...specs.paths,
    ...routeDocumentation
  }
};