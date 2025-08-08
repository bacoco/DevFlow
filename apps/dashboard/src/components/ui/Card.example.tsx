/**
 * Card Component Examples
 * Demonstrates various Card component variants and usage patterns
 */

import React from 'react';
import { Card } from './Card';
import { Heart, Star, Settings, TrendingUp } from 'lucide-react';

export const CardExamples: React.FC = () => {
  return (
    <div className="p-8 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Card Component Examples
        </h1>

        {/* Basic Variants */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Basic Variants
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card variant="default" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Default Card
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Standard card with border and background
              </p>
            </Card>

            <Card variant="elevated" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Elevated Card
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Card with shadow elevation effect
              </p>
            </Card>

            <Card variant="outlined" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Outlined Card
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Card with prominent border styling
              </p>
            </Card>

            <Card variant="glass" padding="lg">
              <h3 className="text-lg font-semibold text-white mb-2">
                Glass Card
              </h3>
              <p className="text-gray-200">
                Glass morphism effect with backdrop blur
              </p>
            </Card>
          </div>
        </section>

        {/* Interactive Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Interactive Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card 
              variant="default" 
              padding="lg" 
              hover 
              interactive
              onClick={() => alert('Default card clicked!')}
            >
              <div className="flex items-center space-x-3">
                <Heart className="w-8 h-8 text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Clickable Card
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Click me to see interaction
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              variant="elevated" 
              padding="lg" 
              hover 
              interactive
              onClick={() => alert('Elevated card clicked!')}
            >
              <div className="flex items-center space-x-3">
                <Star className="w-8 h-8 text-yellow-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Hover Effects
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Smooth hover animations
                  </p>
                </div>
              </div>
            </Card>

            <Card 
              variant="glass" 
              padding="lg" 
              hover 
              interactive
              onClick={() => alert('Glass card clicked!')}
            >
              <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Glass Morphism
                  </h3>
                  <p className="text-gray-200">
                    Beautiful glass effect
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Padding Variations */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Padding Variations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card variant="outlined" padding="none">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-gray-600 dark:text-gray-300">No Padding</p>
              </div>
            </Card>

            <Card variant="outlined" padding="sm">
              <p className="text-sm text-gray-600 dark:text-gray-300">Small Padding</p>
            </Card>

            <Card variant="outlined" padding="md">
              <p className="text-sm text-gray-600 dark:text-gray-300">Medium Padding</p>
            </Card>

            <Card variant="outlined" padding="lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">Large Padding</p>
            </Card>

            <Card variant="outlined" padding="xl">
              <p className="text-sm text-gray-600 dark:text-gray-300">Extra Large</p>
            </Card>
          </div>
        </section>

        {/* Complex Content Examples */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Complex Content Examples
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="elevated" padding="lg" hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Revenue Growth
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Last 30 days
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">+24%</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Current</span>
                  <span className="font-medium text-gray-900 dark:text-white">$12,450</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Previous</span>
                  <span className="font-medium text-gray-900 dark:text-white">$10,030</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
            </Card>

            <Card variant="glass" padding="lg" hover className="bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Premium Feature
                </h3>
                <p className="text-gray-200 mb-4">
                  Unlock advanced analytics and insights with our premium plan
                </p>
                <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors">
                  Learn More
                </button>
              </div>
            </Card>
          </div>
        </section>

        {/* Accessibility Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Accessibility Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              variant="outlined" 
              padding="lg" 
              interactive
              onClick={() => alert('Accessible card activated!')}
              role="button"
              aria-label="Accessible interactive card example"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Keyboard Navigation
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                This card can be focused and activated using keyboard navigation.
                Try pressing Tab to focus and Enter/Space to activate.
              </p>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Press Tab → Enter/Space to activate
              </div>
            </Card>

            <Card variant="default" padding="lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Screen Reader Support
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Cards include proper ARIA attributes and semantic HTML for 
                screen reader compatibility.
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Semantic HTML + ARIA labels
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CardExamples;