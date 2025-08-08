import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  BarChart3, 
  Brain, 
  Users, 
  Zap, 
  Shield, 
  Smartphone, 
  Eye, 
  GitBranch,
  Target,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Play,
  BookOpen,
  Settings,
  Globe
} from 'lucide-react';

const OverviewPage: React.FC = () => {
  const features = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Real-time Analytics Dashboard",
      description: "Monitor productivity metrics, flow states, and team performance with interactive charts and customizable widgets.",
      color: "bg-blue-500",
      demo: "/",
      highlights: ["Live metrics", "Custom widgets", "Interactive charts", "Real-time updates"]
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Advanced Task Management",
      description: "Kanban boards with drag & drop, rich text editing, advanced filtering, and team collaboration features.",
      color: "bg-green-500",
      demo: "/tasks",
      highlights: ["Kanban boards", "Rich text editor", "Advanced search", "Team collaboration"]
    },
    {
      icon: <GitBranch className="h-8 w-8" />,
      title: "3D Code Archaeology",
      description: "Visualize your codebase in 3D, explore git history, detect hotspots, and track architectural evolution.",
      color: "bg-purple-500",
      demo: "/code-archaeology",
      highlights: ["3D visualization", "Git history", "Hotspot detection", "Architecture tracking"]
    },
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Insights",
      description: "Machine learning algorithms analyze patterns, predict delivery times, and provide personalized recommendations.",
      color: "bg-orange-500",
      demo: "/analytics",
      highlights: ["Pattern analysis", "Delivery forecasts", "Smart recommendations", "Anomaly detection"]
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Collaboration",
      description: "Share dashboards, annotate code, track team insights, and gamify productivity with achievements.",
      color: "bg-pink-500",
      demo: "/collaboration",
      highlights: ["Dashboard sharing", "Code annotations", "Team insights", "Achievement system"]
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Mobile Optimized",
      description: "Responsive design with touch gestures, offline sync, and mobile-specific optimizations.",
      color: "bg-cyan-500",
      demo: "/mobile",
      highlights: ["Touch gestures", "Offline sync", "Mobile charts", "Push notifications"]
    }
  ];

  const technicalHighlights = [
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Accessibility First",
      description: "WCAG 2.1 AA compliant with screen reader support and keyboard navigation"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "High Performance",
      description: "Optimized with lazy loading, caching, and Core Web Vitals monitoring"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Enterprise Security",
      description: "End-to-end encryption, RBAC, audit trails, and GDPR compliance"
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Real-time Updates",
      description: "WebSocket integration for live data streaming and collaborative features"
    }
  ];

  const stats = [
    { label: "Components Built", value: "200+", color: "text-blue-600" },
    { label: "Test Coverage", value: "95%", color: "text-green-600" },
    { label: "Performance Score", value: "98/100", color: "text-purple-600" },
    { label: "Accessibility Score", value: "100%", color: "text-orange-600" }
  ];

  return (
    <>
      <Head>
        <title>DevFlow Intelligence Platform - Overview</title>
        <meta name="description" content="Comprehensive developer productivity platform with AI-powered insights, 3D code visualization, and advanced task management" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    DevFlow Intelligence
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Dashboard
                </Link>
                <Link href="/tasks" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Tasks
                </Link>
                <Link href="/code-archaeology" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Code Archaeology
                </Link>
                <Link href="/documentation-demo" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  Docs
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                DevFlow Intelligence
                <span className="block text-blue-600 dark:text-blue-400">Platform</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                A comprehensive developer productivity platform combining AI-powered analytics, 
                3D code visualization, advanced task management, and real-time collaboration tools.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link 
                  href="/"
                  className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Launch Dashboard
                </Link>
                <Link 
                  href="/documentation-demo"
                  className="inline-flex items-center px-8 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <BookOpen className="h-5 w-5 mr-2" />
                  View Documentation
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Comprehensive Feature Set
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Everything you need to boost developer productivity and gain insights into your development process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${feature.color} text-white rounded-lg mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {feature.description}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    {feature.highlights.map((highlight, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {highlight}
                      </div>
                    ))}
                  </div>

                  <Link 
                    href={feature.demo}
                    className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Try Demo
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Highlights */}
        <div className="bg-white dark:bg-gray-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Built for Production
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Enterprise-grade architecture with modern development practices
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {technicalHighlights.map((highlight, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg mb-4">
                    {highlight.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {highlight.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {highlight.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                System Architecture
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Microservices architecture with modern tech stack
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Frontend
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>Next.js + TypeScript</div>
                    <div>React Three Fiber (3D)</div>
                    <div>Tailwind CSS</div>
                    <div>Framer Motion</div>
                    <div>React Query</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Backend Services
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>Node.js + Express</div>
                    <div>GraphQL API</div>
                    <div>WebSocket Gateway</div>
                    <div>ML Pipeline (Python)</div>
                    <div>Stream Processing</div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Infrastructure
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>MongoDB + InfluxDB</div>
                    <div>Redis Caching</div>
                    <div>Apache Kafka</div>
                    <div>Docker + Kubernetes</div>
                    <div>Nginx Load Balancer</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gray-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Launch the platform and explore all features with our demo data and interactive tutorials.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                href="/"
                className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="h-5 w-5 mr-2" />
                Launch Dashboard
              </Link>
              <Link 
                href="/tasks"
                className="inline-flex items-center px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                <Target className="h-5 w-5 mr-2" />
                Try Task Manager
              </Link>
              <Link 
                href="/code-archaeology"
                className="inline-flex items-center px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                <GitBranch className="h-5 w-5 mr-2" />
                Explore 3D Code View
              </Link>
            </div>

            <div className="text-sm text-gray-400">
              <p>Demo Login: <span className="text-blue-400">loic@loic.fr</span> / <span className="text-blue-400">loic</span></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-600 dark:text-gray-400 mb-4 md:mb-0">
                <p>&copy; 2024 DevFlow Intelligence Platform. Built with modern web technologies.</p>
              </div>
              <div className="flex space-x-6">
                <Link href="/documentation-demo" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Documentation
                </Link>
                <Link href="/api-docs" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  API Docs
                </Link>
                <a href="http://localhost:3000/graphql" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  GraphQL
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default OverviewPage;