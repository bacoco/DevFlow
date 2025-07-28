import { 
  Developer, 
  ExpertiseArea, 
  GitAnalysis, 
  CodePattern, 
  ExpertiseLevel 
} from '../types/code-review';

export class ExpertiseAnalyzer {
  private readonly EXPERTISE_THRESHOLDS = {
    novice: { commits: 5, lines: 500, reviews: 2 },
    intermediate: { commits: 25, lines: 2500, reviews: 10 },
    advanced: { commits: 100, lines: 10000, reviews: 50 },
    expert: { commits: 500, lines: 50000, reviews: 200 },
  };

  private readonly LANGUAGE_WEIGHTS = {
    typescript: 1.2,
    javascript: 1.1,
    python: 1.1,
    java: 1.0,
    go: 1.0,
    rust: 1.3,
    cpp: 1.2,
    csharp: 1.0,
  };

  /**
   * Analyzes Git history to determine developer expertise
   */
  async analyzeExpertise(gitAnalysis: GitAnalysis[]): Promise<ExpertiseArea[]> {
    const expertiseMap = new Map<string, ExpertiseArea>();

    for (const analysis of gitAnalysis) {
      // Analyze language expertise
      for (const [language, lineCount] of Object.entries(analysis.analysis.languages)) {
        const existing = expertiseMap.get(language);
        const weight = this.LANGUAGE_WEIGHTS[language.toLowerCase() as keyof typeof this.LANGUAGE_WEIGHTS] || 1.0;
        
        const expertise: ExpertiseArea = {
          technology: language,
          level: this.calculateExpertiseLevel(analysis, language),
          confidence: this.calculateConfidence(analysis, language, weight),
          lastUpdated: new Date(),
          evidenceCount: existing ? existing.evidenceCount + 1 : 1,
        };

        if (!existing || expertise.confidence > existing.confidence) {
          expertiseMap.set(language, expertise);
        }
      }

      // Analyze framework/library expertise from file patterns
      const frameworks = this.detectFrameworks(analysis.analysis.filesModified);
      for (const framework of frameworks) {
        const existing = expertiseMap.get(framework);
        const expertise: ExpertiseArea = {
          technology: framework,
          level: this.calculateFrameworkExpertise(analysis, framework),
          confidence: this.calculateFrameworkConfidence(analysis, framework),
          lastUpdated: new Date(),
          evidenceCount: existing ? existing.evidenceCount + 1 : 1,
        };

        if (!existing || expertise.confidence > existing.confidence) {
          expertiseMap.set(framework, expertise);
        }
      }
    }

    return Array.from(expertiseMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20); // Top 20 expertise areas
  }

  /**
   * Analyzes code patterns to identify specialized knowledge
   */
  async analyzeCodePatterns(
    developerId: string, 
    codeHistory: string[]
  ): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];

    // Pattern detection rules
    const patternRules = [
      {
        pattern: 'async/await',
        regex: /async\s+\w+|await\s+/g,
        language: 'javascript',
        complexity: 3,
      },
      {
        pattern: 'React Hooks',
        regex: /use[A-Z]\w+|useState|useEffect|useCallback/g,
        language: 'javascript',
        complexity: 4,
      },
      {
        pattern: 'GraphQL',
        regex: /query\s+\w+|mutation\s+\w+|subscription\s+\w+/g,
        language: 'graphql',
        complexity: 5,
      },
      {
        pattern: 'Docker',
        regex: /FROM\s+|RUN\s+|COPY\s+|WORKDIR\s+/g,
        language: 'dockerfile',
        complexity: 3,
      },
      {
        pattern: 'Kubernetes',
        regex: /apiVersion:|kind:|metadata:|spec:/g,
        language: 'yaml',
        complexity: 6,
      },
      {
        pattern: 'SQL Queries',
        regex: /SELECT\s+|INSERT\s+|UPDATE\s+|DELETE\s+|JOIN\s+/gi,
        language: 'sql',
        complexity: 4,
      },
      {
        pattern: 'Machine Learning',
        regex: /import\s+(tensorflow|torch|sklearn|pandas|numpy)/g,
        language: 'python',
        complexity: 7,
      },
    ];

    for (const code of codeHistory) {
      for (const rule of patternRules) {
        const matches = code.match(rule.regex);
        if (matches && matches.length > 0) {
          const existingPattern = patterns.find(p => p.pattern === rule.pattern);
          if (existingPattern) {
            existingPattern.frequency += matches.length;
          } else {
            patterns.push({
              pattern: rule.pattern,
              language: rule.language,
              complexity: rule.complexity,
              frequency: matches.length,
              expertise: this.calculatePatternExpertise(matches.length, rule.complexity),
            });
          }
        }
      }
    }

    return patterns.sort((a, b) => b.frequency * b.complexity - a.frequency * a.complexity);
  }

  /**
   * Updates developer expertise based on new activity
   */
  async updateExpertise(
    developer: Developer, 
    newAnalysis: GitAnalysis
  ): Promise<ExpertiseArea[]> {
    const currentExpertise = developer.expertise;
    const newExpertise = await this.analyzeExpertise([newAnalysis]);

    // Merge with existing expertise
    const expertiseMap = new Map<string, ExpertiseArea>();
    
    // Add existing expertise
    for (const expertise of currentExpertise) {
      expertiseMap.set(expertise.technology, expertise);
    }

    // Update with new analysis
    for (const newExp of newExpertise) {
      const existing = expertiseMap.get(newExp.technology);
      if (existing) {
        // Weighted average of confidence
        const totalEvidence = existing.evidenceCount + newExp.evidenceCount;
        const newConfidence = (
          (existing.confidence * existing.evidenceCount) + 
          (newExp.confidence * newExp.evidenceCount)
        ) / totalEvidence;

        expertiseMap.set(newExp.technology, {
          ...existing,
          level: this.getHigherExpertiseLevel(existing.level, newExp.level),
          confidence: newConfidence,
          lastUpdated: new Date(),
          evidenceCount: totalEvidence,
        });
      } else {
        expertiseMap.set(newExp.technology, newExp);
      }
    }

    return Array.from(expertiseMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  private calculateExpertiseLevel(analysis: GitAnalysis, language: string): ExpertiseLevel {
    const languageLines = analysis.analysis.languages[language] || 0;
    const commitCount = analysis.analysis.commitCount;
    const reviewCount = analysis.analysis.reviewsGiven;

    if (commitCount >= this.EXPERTISE_THRESHOLDS.expert.commits && 
        languageLines >= this.EXPERTISE_THRESHOLDS.expert.lines &&
        reviewCount >= this.EXPERTISE_THRESHOLDS.expert.reviews) {
      return 'expert';
    } else if (commitCount >= this.EXPERTISE_THRESHOLDS.advanced.commits && 
               languageLines >= this.EXPERTISE_THRESHOLDS.advanced.lines &&
               reviewCount >= this.EXPERTISE_THRESHOLDS.advanced.reviews) {
      return 'advanced';
    } else if (commitCount >= this.EXPERTISE_THRESHOLDS.intermediate.commits && 
               languageLines >= this.EXPERTISE_THRESHOLDS.intermediate.lines &&
               reviewCount >= this.EXPERTISE_THRESHOLDS.intermediate.reviews) {
      return 'intermediate';
    } else {
      return 'novice';
    }
  }

  private calculateConfidence(analysis: GitAnalysis, language: string, weight: number): number {
    const languageLines = analysis.analysis.languages[language] || 0;
    const totalLines = Object.values(analysis.analysis.languages).reduce((sum, lines) => sum + lines, 0);
    const languageRatio = totalLines > 0 ? languageLines / totalLines : 0;
    
    const commitFactor = Math.min(analysis.analysis.commitCount / 100, 1);
    const reviewFactor = Math.min(analysis.analysis.reviewsGiven / 50, 1);
    const complexityFactor = Math.min(analysis.analysis.complexity / 10, 1);
    
    return Math.min(
      (languageRatio * 0.4 + commitFactor * 0.3 + reviewFactor * 0.2 + complexityFactor * 0.1) * weight,
      1.0
    );
  }

  private detectFrameworks(files: string[]): string[] {
    const frameworks = new Set<string>();
    
    const frameworkPatterns = [
      { pattern: /package\.json/, framework: 'Node.js' },
      { pattern: /requirements\.txt|setup\.py/, framework: 'Python' },
      { pattern: /Dockerfile/, framework: 'Docker' },
      { pattern: /\.k8s\.yaml|\.k8s\.yml/, framework: 'Kubernetes' },
      { pattern: /next\.config\.js/, framework: 'Next.js' },
      { pattern: /angular\.json/, framework: 'Angular' },
      { pattern: /vue\.config\.js/, framework: 'Vue.js' },
      { pattern: /webpack\.config\.js/, framework: 'Webpack' },
      { pattern: /jest\.config\.js/, framework: 'Jest' },
      { pattern: /\.tf$/, framework: 'Terraform' },
      { pattern: /docker-compose\.yml/, framework: 'Docker Compose' },
    ];

    for (const file of files) {
      for (const { pattern, framework } of frameworkPatterns) {
        if (pattern.test(file)) {
          frameworks.add(framework);
        }
      }
    }

    return Array.from(frameworks);
  }

  private calculateFrameworkExpertise(analysis: GitAnalysis, framework: string): ExpertiseLevel {
    const frameworkFiles = analysis.analysis.filesModified.filter(file => 
      this.isFrameworkFile(file, framework)
    ).length;
    
    const commitCount = analysis.analysis.commitCount;
    
    if (frameworkFiles >= 20 && commitCount >= 50) return 'expert';
    if (frameworkFiles >= 10 && commitCount >= 25) return 'advanced';
    if (frameworkFiles >= 5 && commitCount >= 10) return 'intermediate';
    return 'novice';
  }

  private calculateFrameworkConfidence(analysis: GitAnalysis, framework: string): number {
    const frameworkFiles = analysis.analysis.filesModified.filter(file => 
      this.isFrameworkFile(file, framework)
    ).length;
    
    const totalFiles = analysis.analysis.filesModified.length;
    const frameworkRatio = totalFiles > 0 ? frameworkFiles / totalFiles : 0;
    
    return Math.min(frameworkRatio * 2, 1.0); // Cap at 1.0
  }

  private isFrameworkFile(filename: string, framework: string): boolean {
    const frameworkFilePatterns: Record<string, RegExp> = {
      'Node.js': /package\.json|\.js$|\.ts$/,
      'Python': /\.py$|requirements\.txt|setup\.py/,
      'Docker': /Dockerfile|\.dockerfile$/,
      'Kubernetes': /\.yaml$|\.yml$/,
      'Next.js': /next\.config\.js|pages\/|components\//,
      'Angular': /\.component\.ts$|\.service\.ts$|\.module\.ts$/,
      'Vue.js': /\.vue$|vue\.config\.js/,
      'Webpack': /webpack\.config\.js|\.webpack\./,
      'Jest': /\.test\.js$|\.spec\.js$|jest\.config\.js/,
      'Terraform': /\.tf$|\.tfvars$/,
      'Docker Compose': /docker-compose\.yml|docker-compose\.yaml/,
    };

    const pattern = frameworkFilePatterns[framework];
    return pattern ? pattern.test(filename) : false;
  }

  private calculatePatternExpertise(frequency: number, complexity: number): ExpertiseLevel {
    const score = frequency * complexity;
    
    if (score >= 100) return 'expert';
    if (score >= 50) return 'advanced';
    if (score >= 20) return 'intermediate';
    return 'novice';
  }

  private getHigherExpertiseLevel(level1: ExpertiseLevel, level2: ExpertiseLevel): ExpertiseLevel {
    const levels = ['novice', 'intermediate', 'advanced', 'expert'];
    const index1 = levels.indexOf(level1);
    const index2 = levels.indexOf(level2);
    return levels[Math.max(index1, index2)] as ExpertiseLevel;
  }
}