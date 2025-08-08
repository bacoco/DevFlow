import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Clock, User, Star } from 'lucide-react';

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  thumbnail: string;
  videoUrl: string;
  transcript?: string;
  chapters?: VideoChapter[];
  instructor: string;
  rating: number;
  views: number;
}

interface VideoChapter {
  id: string;
  title: string;
  startTime: number;
  duration: number;
}

interface VideoTutorialsProps {
  context?: string;
}

export const VideoTutorials: React.FC<VideoTutorialsProps> = ({ context }) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock video tutorials data
  const tutorials: VideoTutorial[] = [
    {
      id: 'nav-basics',
      title: 'Navigation Fundamentals',
      description: 'Master the adaptive navigation system and keyboard shortcuts for efficient dashboard usage.',
      duration: '4:32',
      difficulty: 'beginner',
      category: 'Navigation',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: '/videos/navigation-basics.mp4',
      instructor: 'Sarah Chen',
      rating: 4.8,
      views: 1250,
      chapters: [
        { id: 'nav-1', title: 'Introduction to Navigation', startTime: 0, duration: 45 },
        { id: 'nav-2', title: 'Keyboard Shortcuts', startTime: 45, duration: 90 },
        { id: 'nav-3', title: 'Breadcrumb Navigation', startTime: 135, duration: 60 },
        { id: 'nav-4', title: 'Global Search', startTime: 195, duration: 77 }
      ],
      transcript: `Welcome to navigation fundamentals. In this tutorial, we'll explore how to efficiently navigate the dashboard using both mouse and keyboard interactions...`
    },
    {
      id: 'accessibility-features',
      title: 'Accessibility Features Deep Dive',
      description: 'Comprehensive guide to using screen readers, keyboard navigation, and accessibility preferences.',
      duration: '8:15',
      difficulty: 'intermediate',
      category: 'Accessibility',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: '/videos/accessibility-features.mp4',
      instructor: 'Marcus Rodriguez',
      rating: 4.9,
      views: 890,
      chapters: [
        { id: 'a11y-1', title: 'Screen Reader Setup', startTime: 0, duration: 120 },
        { id: 'a11y-2', title: 'Keyboard Navigation', startTime: 120, duration: 180 },
        { id: 'a11y-3', title: 'Visual Preferences', startTime: 300, duration: 135 },
        { id: 'a11y-4', title: 'Chart Accessibility', startTime: 435, duration: 60 }
      ]
    },
    {
      id: 'mobile-optimization',
      title: 'Mobile Dashboard Mastery',
      description: 'Learn touch gestures, mobile navigation patterns, and offline functionality.',
      duration: '6:45',
      difficulty: 'beginner',
      category: 'Mobile',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: '/videos/mobile-optimization.mp4',
      instructor: 'Lisa Park',
      rating: 4.7,
      views: 2100,
      chapters: [
        { id: 'mobile-1', title: 'Touch Gestures', startTime: 0, duration: 150 },
        { id: 'mobile-2', title: 'Mobile Navigation', startTime: 150, duration: 120 },
        { id: 'mobile-3', title: 'Offline Features', startTime: 270, duration: 135 }
      ]
    },
    {
      id: 'chart-interactions',
      title: 'Interactive Chart Techniques',
      description: 'Master zoom, pan, brush, and drill-down features for data exploration.',
      duration: '7:20',
      difficulty: 'intermediate',
      category: 'Data Visualization',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: '/videos/chart-interactions.mp4',
      instructor: 'David Kim',
      rating: 4.6,
      views: 1680,
      chapters: [
        { id: 'chart-1', title: 'Basic Interactions', startTime: 0, duration: 90 },
        { id: 'chart-2', title: 'Zoom and Pan', startTime: 90, duration: 120 },
        { id: 'chart-3', title: 'Brushing and Linking', startTime: 210, duration: 150 },
        { id: 'chart-4', title: 'Drill-down Analysis', startTime: 360, duration: 80 }
      ]
    },
    {
      id: 'personalization-setup',
      title: 'Personalizing Your Dashboard',
      description: 'Configure themes, layouts, and preferences to match your workflow.',
      duration: '5:55',
      difficulty: 'beginner',
      category: 'Personalization',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: '/videos/personalization-setup.mp4',
      instructor: 'Emma Thompson',
      rating: 4.5,
      views: 1420,
      chapters: [
        { id: 'pers-1', title: 'Theme Selection', startTime: 0, duration: 75 },
        { id: 'pers-2', title: 'Layout Customization', startTime: 75, duration: 120 },
        { id: 'pers-3', title: 'Widget Configuration', startTime: 195, duration: 160 }
      ]
    },
    {
      id: 'collaboration-features',
      title: 'Team Collaboration Tools',
      description: 'Share insights, create annotations, and collaborate effectively with your team.',
      duration: '9:10',
      difficulty: 'advanced',
      category: 'Collaboration',
      thumbnail: '/api/placeholder/320/180',
      videoUrl: '/videos/collaboration-features.mp4',
      instructor: 'Alex Johnson',
      rating: 4.8,
      views: 750,
      chapters: [
        { id: 'collab-1', title: 'Sharing Dashboards', startTime: 0, duration: 135 },
        { id: 'collab-2', title: 'Annotation System', startTime: 135, duration: 180 },
        { id: 'collab-3', title: 'Team Insights', startTime: 315, duration: 165 },
        { id: 'collab-4', title: 'Privacy Settings', startTime: 480, duration: 70 }
      ]
    }
  ];

  const categories = ['all', ...Array.from(new Set(tutorials.map(t => t.category)))];

  const filteredTutorials = tutorials.filter(tutorial => 
    activeCategory === 'all' || tutorial.category === activeCategory
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoSelect = (tutorial: VideoTutorial) => {
    setSelectedVideo(tutorial);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Video Tutorials
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Learn through visual demonstrations and step-by-step video guides.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category === 'all' ? 'All Categories' : category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Available Tutorials ({filteredTutorials.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredTutorials.map(tutorial => (
              <div
                key={tutorial.id}
                onClick={() => handleVideoSelect(tutorial)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedVideo?.id === tutorial.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex space-x-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={tutorial.thumbnail}
                      alt={tutorial.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white bg-black bg-opacity-50 rounded-full p-1" />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                      {tutorial.duration}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {tutorial.title}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {tutorial.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tutorial.difficulty === 'beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        tutorial.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {tutorial.difficulty}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-current text-yellow-400" />
                        <span>{tutorial.rating}</span>
                      </div>
                      <span>{tutorial.views} views</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Player */}
        <div className="lg:col-span-2">
          {selectedVideo ? (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="bg-black rounded-lg overflow-hidden">
                <div className="relative aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    poster={selectedVideo.thumbnail}
                  >
                    <source src={selectedVideo.videoUrl} type="video/mp4" />
                    <track kind="captions" src="/captions/en.vtt" srcLang="en" label="English" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-100"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={togglePlayPause}
                          className="text-white hover:text-blue-400 transition-colors"
                        >
                          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                        </button>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={toggleMute}
                            className="text-white hover:text-blue-400 transition-colors"
                          >
                            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                            className="w-16 h-1 bg-white/30 rounded-full appearance-none slider"
                          />
                        </div>
                        
                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <select
                          value={playbackSpeed}
                          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                          className="bg-white/20 text-white text-sm rounded px-2 py-1 border-none"
                        >
                          <option value={0.5}>0.5x</option>
                          <option value={0.75}>0.75x</option>
                          <option value={1}>1x</option>
                          <option value={1.25}>1.25x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2}>2x</option>
                        </select>
                        
                        <button className="text-white hover:text-blue-400 transition-colors">
                          <Maximize className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Info */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {selectedVideo.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {selectedVideo.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{selectedVideo.instructor}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{selectedVideo.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-current text-yellow-400" />
                        <span>{selectedVideo.rating} ({selectedVideo.views} views)</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                             rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {showTranscript ? 'Hide' : 'Show'} Transcript
                  </button>
                </div>

                {/* Chapters */}
                {selectedVideo.chapters && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Chapters</h4>
                    <div className="space-y-2">
                      {selectedVideo.chapters.map((chapter, index) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleSeek(chapter.startTime)}
                          className="flex items-center justify-between w-full p-3 text-left rounded-lg 
                                   bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {index + 1}. {chapter.title}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTime(chapter.startTime)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {showTranscript && selectedVideo.transcript && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Transcript</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedVideo.transcript}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-12 text-center">
              <Play className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Select a Tutorial
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a video tutorial from the list to start learning.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};