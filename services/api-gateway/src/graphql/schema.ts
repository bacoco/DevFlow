import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Enums
  enum UserRole {
    DEVELOPER
    TEAM_LEAD
    MANAGER
    ADMIN
  }

  enum MetricType {
    TIME_IN_FLOW
    CODE_CHURN
    REVIEW_LAG
    FOCUS_TIME
    COMPLEXITY_TREND
    COLLABORATION_SCORE
  }

  enum PrivacyLevel {
    PUBLIC
    TEAM
    PRIVATE
  }

  enum TimePeriod {
    HOUR
    DAY
    WEEK
    MONTH
  }

  enum AnonymizationLevel {
    NONE
    PARTIAL
    FULL
  }

  enum GitEventType {
    COMMIT
    PUSH
    PULL_REQUEST
    MERGE
    BRANCH_CREATE
    BRANCH_DELETE
  }

  enum IDEEventType {
    KEYSTROKE
    FILE_CHANGE
    DEBUG
    FOCUS
    BUILD
    TEST_RUN
  }

  # Scalar types
  scalar DateTime
  scalar JSON

  # Privacy and Settings Types
  type DataCollectionSettings {
    ideTelemtry: Boolean!
    gitActivity: Boolean!
    communicationData: Boolean!
    granularControls: JSON!
  }

  type SharingSettings {
    shareWithTeam: Boolean!
    shareWithManager: Boolean!
    shareAggregatedMetrics: Boolean!
    allowComparisons: Boolean!
  }

  type RetentionSettings {
    personalDataRetentionDays: Int!
    aggregatedDataRetentionDays: Int!
    autoDeleteAfterInactivity: Boolean!
  }

  type PrivacySettings {
    userId: ID!
    dataCollection: DataCollectionSettings!
    sharing: SharingSettings!
    retention: RetentionSettings!
    anonymization: AnonymizationLevel!
  }

  type NotificationSettings {
    email: Boolean!
    inApp: Boolean!
    slack: Boolean!
    frequency: String!
    quietHours: QuietHours!
  }

  type QuietHours {
    enabled: Boolean!
    startTime: String!
    endTime: String!
  }

  type DashboardSettings {
    defaultTimeRange: TimePeriod!
    autoRefresh: Boolean!
    refreshInterval: Int!
    widgetLayout: [WidgetLayout!]!
  }

  type WidgetLayout {
    id: String!
    x: Int!
    y: Int!
    width: Int!
    height: Int!
  }

  type UserPreferences {
    theme: String!
    notifications: NotificationSettings!
    dashboard: DashboardSettings!
    timezone: String!
    language: String!
  }

  type AlertSettings {
    productivityThreshold: Float!
    qualityThreshold: Float!
    escalationEnabled: Boolean!
    escalationDelayMinutes: Int!
  }

  type WorkingHours {
    startTime: String!
    endTime: String!
    timezone: String!
    workingDays: [Int!]!
  }

  type TeamSettings {
    privacyLevel: PrivacyLevel!
    dataRetention: Int!
    alertSettings: AlertSettings!
    workingHours: WorkingHours!
  }

  # Core Entity Types
  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    teamIds: [ID!]!
    teams: [Team!]!
    privacySettings: PrivacySettings!
    preferences: UserPreferences!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastActiveAt: DateTime
    isActive: Boolean!
    metrics(
      type: MetricType
      period: TimePeriod
      startDate: DateTime
      endDate: DateTime
    ): [ProductivityMetric!]!
    flowStates(
      startDate: DateTime
      endDate: DateTime
      limit: Int
    ): [FlowState!]!
  }

  type Team {
    id: ID!
    name: String!
    description: String
    memberIds: [ID!]!
    members: [User!]!
    projectIds: [ID!]!
    settings: TeamSettings!
    createdAt: DateTime!
    updatedAt: DateTime!
    isActive: Boolean!
    metrics(
      type: MetricType
      period: TimePeriod
      startDate: DateTime
      endDate: DateTime
    ): [ProductivityMetric!]!
    aggregatedFlowStates(
      startDate: DateTime
      endDate: DateTime
      period: TimePeriod
    ): [AggregatedFlowState!]!
  }

  # Git Event Types
  type GitEventMetadata {
    commitHash: String
    branch: String
    pullRequestId: String
    linesAdded: Int
    linesDeleted: Int
    filesChanged: [String!]
    reviewers: [String!]
    labels: [String!]
    isMerge: Boolean
    parentCommits: [String!]
  }

  type GitEvent {
    id: ID!
    type: GitEventType!
    repository: String!
    author: String!
    timestamp: DateTime!
    metadata: GitEventMetadata!
    privacyLevel: PrivacyLevel!
  }

  # IDE Telemetry Types
  type TestResults {
    passed: Int!
    failed: Int!
    skipped: Int!
  }

  type TelemetryData {
    fileName: String
    fileExtension: String
    projectPath: String
    keystrokeCount: Int
    focusDurationMs: Int
    interruptionCount: Int
    debugSessionId: String
    buildResult: String
    testResults: TestResults
    errorCount: Int
    warningCount: Int
  }

  type IDETelemetry {
    id: ID!
    userId: ID!
    sessionId: ID!
    eventType: IDEEventType!
    timestamp: DateTime!
    data: TelemetryData!
    privacyLevel: PrivacyLevel!
  }

  # Metrics Types
  type MetricContext {
    projectId: ID
    teamId: ID
    repository: String
    branch: String
    environment: String
    tags: JSON
  }

  type ProductivityMetric {
    id: ID!
    userId: ID!
    user: User!
    metricType: MetricType!
    value: Float!
    timestamp: DateTime!
    aggregationPeriod: TimePeriod!
    context: MetricContext!
    confidence: Float
    metadata: JSON
  }

  # Flow State Types
  type Activity {
    type: String!
    startTime: DateTime!
    endTime: DateTime!
    intensity: Float!
    interruptions: Int!
  }

  type FlowState {
    userId: ID!
    user: User!
    sessionId: ID!
    startTime: DateTime!
    endTime: DateTime
    interruptionCount: Int!
    focusScore: Float!
    activities: [Activity!]!
    totalFocusTimeMs: Int!
    deepWorkPercentage: Float!
  }

  type AggregatedFlowState {
    period: TimePeriod!
    startTime: DateTime!
    endTime: DateTime!
    averageFocusScore: Float!
    totalFocusTimeMs: Int!
    averageDeepWorkPercentage: Float!
    totalInterruptions: Int!
    userCount: Int!
  }

  # Dashboard Types
  type Widget {
    id: ID!
    type: String!
    title: String!
    config: JSON!
    data: JSON!
    permissions: [String!]!
  }

  type Dashboard {
    id: ID!
    userId: ID!
    name: String!
    widgets: [Widget!]!
    layout: [WidgetLayout!]!
    isDefault: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Alert Types
  type Alert {
    id: ID!
    userId: ID!
    type: String!
    severity: String!
    title: String!
    message: String!
    context: JSON!
    isRead: Boolean!
    createdAt: DateTime!
    expiresAt: DateTime
  }

  # Input Types
  input CreateUserInput {
    email: String!
    name: String!
    role: UserRole!
    teamIds: [ID!]!
  }

  input UpdateUserInput {
    name: String
    role: UserRole
    teamIds: [ID!]
  }

  input CreateTeamInput {
    name: String!
    description: String
    memberIds: [ID!]!
    projectIds: [ID!]!
  }

  input UpdateTeamInput {
    name: String
    description: String
    memberIds: [ID!]
    projectIds: [ID!]
  }

  input UpdatePrivacySettingsInput {
    dataCollection: DataCollectionSettingsInput
    sharing: SharingSettingsInput
    retention: RetentionSettingsInput
    anonymization: AnonymizationLevel
  }

  input DataCollectionSettingsInput {
    ideTelemtry: Boolean
    gitActivity: Boolean
    communicationData: Boolean
    granularControls: JSON
  }

  input SharingSettingsInput {
    shareWithTeam: Boolean
    shareWithManager: Boolean
    shareAggregatedMetrics: Boolean
    allowComparisons: Boolean
  }

  input RetentionSettingsInput {
    personalDataRetentionDays: Int
    aggregatedDataRetentionDays: Int
    autoDeleteAfterInactivity: Boolean
  }

  input UpdateUserPreferencesInput {
    theme: String
    notifications: NotificationSettingsInput
    dashboard: DashboardSettingsInput
    timezone: String
    language: String
  }

  input NotificationSettingsInput {
    email: Boolean
    inApp: Boolean
    slack: Boolean
    frequency: String
    quietHours: QuietHoursInput
  }

  input QuietHoursInput {
    enabled: Boolean
    startTime: String
    endTime: String
  }

  input DashboardSettingsInput {
    defaultTimeRange: TimePeriod
    autoRefresh: Boolean
    refreshInterval: Int
    widgetLayout: [WidgetLayoutInput!]
  }

  input WidgetLayoutInput {
    id: String!
    x: Int!
    y: Int!
    width: Int!
    height: Int!
  }

  input CreateDashboardInput {
    name: String!
    widgets: [CreateWidgetInput!]!
    layout: [WidgetLayoutInput!]!
    isDefault: Boolean
  }

  input CreateWidgetInput {
    type: String!
    title: String!
    config: JSON!
  }

  input UpdateDashboardInput {
    name: String
    widgets: [UpdateWidgetInput!]
    layout: [WidgetLayoutInput!]
    isDefault: Boolean
  }

  input UpdateWidgetInput {
    id: ID!
    type: String
    title: String
    config: JSON
  }

  # Query Type
  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users(
      role: UserRole
      teamId: ID
      isActive: Boolean
      limit: Int
      offset: Int
    ): [User!]!

    # Team queries
    team(id: ID!): Team
    teams(
      userId: ID
      isActive: Boolean
      limit: Int
      offset: Int
    ): [Team!]!

    # Metrics queries
    metrics(
      userId: ID
      teamId: ID
      type: MetricType
      period: TimePeriod
      startDate: DateTime
      endDate: DateTime
      limit: Int
      offset: Int
    ): [ProductivityMetric!]!

    # Flow state queries
    flowStates(
      userId: ID
      teamId: ID
      startDate: DateTime
      endDate: DateTime
      limit: Int
      offset: Int
    ): [FlowState!]!

    # Dashboard queries
    dashboard(id: ID!): Dashboard
    dashboards(userId: ID): [Dashboard!]!
    defaultDashboard: Dashboard

    # Alert queries
    alerts(
      userId: ID
      isRead: Boolean
      limit: Int
      offset: Int
    ): [Alert!]!
    unreadAlertCount: Int!

    # Git event queries
    gitEvents(
      repository: String
      author: String
      type: GitEventType
      startDate: DateTime
      endDate: DateTime
      limit: Int
      offset: Int
    ): [GitEvent!]!

    # IDE telemetry queries (privacy-filtered)
    ideTelemetry(
      userId: ID
      eventType: IDEEventType
      startDate: DateTime
      endDate: DateTime
      limit: Int
      offset: Int
    ): [IDETelemetry!]!
  }

  # Mutation Type
  type Mutation {
    # User mutations
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    updatePrivacySettings(input: UpdatePrivacySettingsInput!): PrivacySettings!
    updateUserPreferences(input: UpdateUserPreferencesInput!): UserPreferences!

    # Team mutations
    createTeam(input: CreateTeamInput!): Team!
    updateTeam(id: ID!, input: UpdateTeamInput!): Team!
    deleteTeam(id: ID!): Boolean!
    addTeamMember(teamId: ID!, userId: ID!): Team!
    removeTeamMember(teamId: ID!, userId: ID!): Team!

    # Dashboard mutations
    createDashboard(input: CreateDashboardInput!): Dashboard!
    updateDashboard(id: ID!, input: UpdateDashboardInput!): Dashboard!
    deleteDashboard(id: ID!): Boolean!
    setDefaultDashboard(id: ID!): Dashboard!

    # Alert mutations
    markAlertAsRead(id: ID!): Alert!
    markAllAlertsAsRead: Int!
    dismissAlert(id: ID!): Boolean!
  }

  # Subscription Type
  type Subscription {
    # Real-time metric updates
    metricUpdated(userId: ID, teamId: ID, type: MetricType): ProductivityMetric!
    
    # Real-time flow state updates
    flowStateUpdated(userId: ID, teamId: ID): FlowState!
    
    # Real-time alert notifications
    alertCreated(userId: ID!): Alert!
    
    # Real-time dashboard updates
    dashboardUpdated(dashboardId: ID!): Dashboard!
    
    # Real-time team updates
    teamUpdated(teamId: ID!): Team!
    
    # Real-time user status updates
    userStatusUpdated(userId: ID!): User!
  }
`;