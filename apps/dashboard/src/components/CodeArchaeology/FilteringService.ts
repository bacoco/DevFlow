import { CodeArtifact, RequirementNode } from './types';
import { FilterCriteria } from './FilterPanel';

export class FilteringService {
  /**
   * Filter artifacts based on the provided criteria
   */
  static filterArtifacts(artifacts: CodeArtifact[], criteria: FilterCriteria): CodeArtifact[] {
    return artifacts.filter(artifact => {
      // File type filter
      if (criteria.fileTypes.length > 0 && !criteria.fileTypes.includes(artifact.type)) {
        return false;
      }

      // Author filter
      if (criteria.authors.length > 0) {
        const hasMatchingAuthor = artifact.authors.some(author => 
          criteria.authors.includes(author)
        );
        if (!hasMatchingAuthor) {
          return false;
        }
      }

      // Date range filter
      if (criteria.dateRange.start && artifact.lastModified < criteria.dateRange.start) {
        return false;
      }
      if (criteria.dateRange.end && artifact.lastModified > criteria.dateRange.end) {
        return false;
      }

      // Complexity range filter
      if (artifact.complexity < criteria.complexityRange.min || 
          artifact.complexity > criteria.complexityRange.max) {
        return false;
      }

      // Change frequency range filter
      if (artifact.changeFrequency < criteria.changeFrequencyRange.min || 
          artifact.changeFrequency > criteria.changeFrequencyRange.max) {
        return false;
      }

      // Search query filter
      if (criteria.searchQuery.trim()) {
        const query = criteria.searchQuery.toLowerCase().trim();
        const searchableText = [
          artifact.name,
          artifact.filePath,
          artifact.type,
          ...artifact.authors,
          ...artifact.dependencies,
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Filter requirements based on the provided criteria
   */
  static filterRequirements(requirements: RequirementNode[], criteria: FilterCriteria): RequirementNode[] {
    return requirements.filter(requirement => {
      // Search query filter for requirements
      if (criteria.searchQuery.trim()) {
        const query = criteria.searchQuery.toLowerCase().trim();
        const searchableText = [
          requirement.title,
          requirement.description,
          requirement.requirementId,
          requirement.specFile,
        ].join(' ').toLowerCase();

        if (!searchableText.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get filter statistics for the current criteria
   */
  static getFilterStats(
    allArtifacts: CodeArtifact[], 
    filteredArtifacts: CodeArtifact[],
    allRequirements: RequirementNode[] = [],
    filteredRequirements: RequirementNode[] = []
  ) {
    return {
      artifacts: {
        total: allArtifacts.length,
        filtered: filteredArtifacts.length,
        hidden: allArtifacts.length - filteredArtifacts.length,
        percentage: allArtifacts.length > 0 ? (filteredArtifacts.length / allArtifacts.length) * 100 : 0,
      },
      requirements: {
        total: allRequirements.length,
        filtered: filteredRequirements.length,
        hidden: allRequirements.length - filteredRequirements.length,
        percentage: allRequirements.length > 0 ? (filteredRequirements.length / allRequirements.length) * 100 : 0,
      },
      typeBreakdown: this.getTypeBreakdown(filteredArtifacts),
      authorBreakdown: this.getAuthorBreakdown(filteredArtifacts),
      complexityStats: this.getComplexityStats(filteredArtifacts),
      changeFrequencyStats: this.getChangeFrequencyStats(filteredArtifacts),
    };
  }

  /**
   * Get breakdown by artifact type
   */
  private static getTypeBreakdown(artifacts: CodeArtifact[]) {
    const breakdown = {
      file: 0,
      function: 0,
      class: 0,
      interface: 0,
    };

    artifacts.forEach(artifact => {
      breakdown[artifact.type]++;
    });

    return breakdown;
  }

  /**
   * Get breakdown by author
   */
  private static getAuthorBreakdown(artifacts: CodeArtifact[]) {
    const authorCounts = new Map<string, number>();

    artifacts.forEach(artifact => {
      artifact.authors.forEach(author => {
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
      });
    });

    return Array.from(authorCounts.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get complexity statistics
   */
  private static getComplexityStats(artifacts: CodeArtifact[]) {
    if (artifacts.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0 };
    }

    const complexities = artifacts.map(a => a.complexity).sort((a, b) => a - b);
    const sum = complexities.reduce((acc, val) => acc + val, 0);
    const median = complexities.length % 2 === 0
      ? (complexities[complexities.length / 2 - 1] + complexities[complexities.length / 2]) / 2
      : complexities[Math.floor(complexities.length / 2)];

    return {
      min: complexities[0],
      max: complexities[complexities.length - 1],
      avg: sum / complexities.length,
      median,
    };
  }

  /**
   * Get change frequency statistics
   */
  private static getChangeFrequencyStats(artifacts: CodeArtifact[]) {
    if (artifacts.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0 };
    }

    const frequencies = artifacts.map(a => a.changeFrequency).sort((a, b) => a - b);
    const sum = frequencies.reduce((acc, val) => acc + val, 0);
    const median = frequencies.length % 2 === 0
      ? (frequencies[frequencies.length / 2 - 1] + frequencies[frequencies.length / 2]) / 2
      : frequencies[Math.floor(frequencies.length / 2)];

    return {
      min: frequencies[0],
      max: frequencies[frequencies.length - 1],
      avg: sum / frequencies.length,
      median,
    };
  }

  /**
   * Create default filter criteria
   */
  static createDefaultCriteria(): FilterCriteria {
    return {
      fileTypes: [],
      authors: [],
      dateRange: { start: null, end: null },
      complexityRange: { min: 0, max: 100 },
      changeFrequencyRange: { min: 0, max: 100 },
      searchQuery: '',
    };
  }

  /**
   * Check if criteria has any active filters
   */
  static hasActiveFilters(criteria: FilterCriteria): boolean {
    return (
      criteria.fileTypes.length > 0 ||
      criteria.authors.length > 0 ||
      criteria.dateRange.start !== null ||
      criteria.dateRange.end !== null ||
      criteria.complexityRange.min > 0 ||
      criteria.complexityRange.max < 100 ||
      criteria.changeFrequencyRange.min > 0 ||
      criteria.changeFrequencyRange.max < 100 ||
      criteria.searchQuery.trim() !== ''
    );
  }

  /**
   * Get a human-readable description of active filters
   */
  static getFilterDescription(criteria: FilterCriteria): string {
    const parts: string[] = [];

    if (criteria.fileTypes.length > 0) {
      parts.push(`Types: ${criteria.fileTypes.join(', ')}`);
    }

    if (criteria.authors.length > 0) {
      const authorList = criteria.authors.length > 3 
        ? `${criteria.authors.slice(0, 3).join(', ')} and ${criteria.authors.length - 3} more`
        : criteria.authors.join(', ');
      parts.push(`Authors: ${authorList}`);
    }

    if (criteria.dateRange.start || criteria.dateRange.end) {
      const start = criteria.dateRange.start?.toLocaleDateString() || 'beginning';
      const end = criteria.dateRange.end?.toLocaleDateString() || 'now';
      parts.push(`Date: ${start} to ${end}`);
    }

    if (criteria.complexityRange.min > 0 || criteria.complexityRange.max < 100) {
      parts.push(`Complexity: ${criteria.complexityRange.min}-${criteria.complexityRange.max}`);
    }

    if (criteria.changeFrequencyRange.min > 0 || criteria.changeFrequencyRange.max < 100) {
      parts.push(`Change Freq: ${criteria.changeFrequencyRange.min}-${criteria.changeFrequencyRange.max}`);
    }

    if (criteria.searchQuery.trim()) {
      parts.push(`Search: "${criteria.searchQuery}"`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters applied';
  }

  /**
   * Serialize criteria to URL parameters
   */
  static serializeCriteria(criteria: FilterCriteria): URLSearchParams {
    const params = new URLSearchParams();

    if (criteria.fileTypes.length > 0) {
      params.set('types', criteria.fileTypes.join(','));
    }

    if (criteria.authors.length > 0) {
      params.set('authors', criteria.authors.join(','));
    }

    if (criteria.dateRange.start) {
      params.set('dateStart', criteria.dateRange.start.toISOString());
    }

    if (criteria.dateRange.end) {
      params.set('dateEnd', criteria.dateRange.end.toISOString());
    }

    if (criteria.complexityRange.min > 0) {
      params.set('complexityMin', criteria.complexityRange.min.toString());
    }

    if (criteria.complexityRange.max < 100) {
      params.set('complexityMax', criteria.complexityRange.max.toString());
    }

    if (criteria.changeFrequencyRange.min > 0) {
      params.set('changeFreqMin', criteria.changeFrequencyRange.min.toString());
    }

    if (criteria.changeFrequencyRange.max < 100) {
      params.set('changeFreqMax', criteria.changeFrequencyRange.max.toString());
    }

    if (criteria.searchQuery.trim()) {
      params.set('search', criteria.searchQuery);
    }

    return params;
  }

  /**
   * Deserialize criteria from URL parameters
   */
  static deserializeCriteria(params: URLSearchParams): FilterCriteria {
    const criteria = this.createDefaultCriteria();

    const types = params.get('types');
    if (types) {
      criteria.fileTypes = types.split(',').filter(type => 
        ['file', 'function', 'class', 'interface'].includes(type)
      ) as ('file' | 'function' | 'class' | 'interface')[];
    }

    const authors = params.get('authors');
    if (authors) {
      criteria.authors = authors.split(',');
    }

    const dateStart = params.get('dateStart');
    if (dateStart) {
      criteria.dateRange.start = new Date(dateStart);
    }

    const dateEnd = params.get('dateEnd');
    if (dateEnd) {
      criteria.dateRange.end = new Date(dateEnd);
    }

    const complexityMin = params.get('complexityMin');
    if (complexityMin) {
      criteria.complexityRange.min = parseInt(complexityMin, 10);
    }

    const complexityMax = params.get('complexityMax');
    if (complexityMax) {
      criteria.complexityRange.max = parseInt(complexityMax, 10);
    }

    const changeFreqMin = params.get('changeFreqMin');
    if (changeFreqMin) {
      criteria.changeFrequencyRange.min = parseInt(changeFreqMin, 10);
    }

    const changeFreqMax = params.get('changeFreqMax');
    if (changeFreqMax) {
      criteria.changeFrequencyRange.max = parseInt(changeFreqMax, 10);
    }

    const search = params.get('search');
    if (search) {
      criteria.searchQuery = search;
    }

    return criteria;
  }
}