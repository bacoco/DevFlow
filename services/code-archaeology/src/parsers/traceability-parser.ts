import * as fs from 'fs';
import * as path from 'path';
import { CodeArtifact } from '../types';

export interface RequirementReference {
  requirementId: string;
  taskId: string;
  taskDescription: string;
  confidence: number;
}

export interface TraceabilityLink {
  requirementId: string;
  specFile: string;
  codeArtifacts: string[];
  linkType: 'implements' | 'tests' | 'documents';
  confidence: number;
  taskReferences: RequirementReference[];
}

export interface TraceabilityMatrix {
  requirementId: string;
  hookName?: string;
  testCase?: string;
  codeArtifacts: string[];
  coverage: number; // 0-1, percentage of requirement implemented
}

export interface SpecParsingResult {
  specFile: string;
  requirements: string[];
  taskReferences: RequirementReference[];
}

export interface TraceabilityParsingConfig {
  specsDirectory: string;
  confidenceThreshold: number; // minimum confidence for automatic linking
  requirementPattern: RegExp;
  taskReferencePattern: RegExp;
}

export class TraceabilityParser {
  private config: TraceabilityParsingConfig;

  constructor(config: Partial<TraceabilityParsingConfig> = {}) {
    this.config = {
      specsDirectory: '.kiro/specs',
      confidenceThreshold: 0.7,
      requirementPattern: /(?:RF|RN)-\d+[a-z]?/g,
      taskReferencePattern: /_Requirements:\s*([^_\n]+)/,
      ...config
    };
  }

  /**
   * Parse all spec files in the specs directory to extract requirement references
   */
  async parseSpecFiles(rootPath: string): Promise<SpecParsingResult[]> {
    const specsPath = path.join(rootPath, this.config.specsDirectory);
    
    if (!fs.existsSync(specsPath)) {
      throw new Error(`Specs directory not found: ${specsPath}`);
    }

    const results: SpecParsingResult[] = [];
    const specDirs = fs.readdirSync(specsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const specDir of specDirs) {
      const specDirPath = path.join(specsPath, specDir);
      const specFiles = ['requirements.md', 'design.md', 'tasks.md'];
      
      for (const specFile of specFiles) {
        const specFilePath = path.join(specDirPath, specFile);
        
        if (fs.existsSync(specFilePath)) {
          const result = await this.parseSpecFile(specFilePath);
          if (result) {
            results.push(result);
          }
        }
      }
    }

    return results;
  }

  /**
   * Parse a single spec file to extract requirements and task references
   */
  async parseSpecFile(filePath: string): Promise<SpecParsingResult | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const requirements = this.extractRequirements(content);
      const taskReferences = this.extractTaskReferences(content);

      return {
        specFile: filePath,
        requirements,
        taskReferences
      };
    } catch (error) {
      console.error(`Error parsing spec file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Parse traceability.md file to extract existing requirement-to-code mappings
   */
  async parseTraceabilityMatrix(traceabilityPath: string): Promise<TraceabilityMatrix[]> {
    if (!fs.existsSync(traceabilityPath)) {
      console.warn(`Traceability file not found: ${traceabilityPath}`);
      return [];
    }

    try {
      const content = fs.readFileSync(traceabilityPath, 'utf-8');
      return this.parseTraceabilityContent(content);
    } catch (error) {
      console.error(`Error parsing traceability file ${traceabilityPath}:`, error);
      return [];
    }
  }

  /**
   * Link parsed requirements with code artifacts using various heuristics
   */
  linkRequirementsToCode(
    specResults: SpecParsingResult[],
    codeArtifacts: CodeArtifact[]
  ): TraceabilityLink[] {
    const links: TraceabilityLink[] = [];

    // Group task references by requirement ID
    const requirementMap = new Map<string, RequirementReference[]>();
    
    for (const specResult of specResults) {
      for (const taskRef of specResult.taskReferences) {
        const existing = requirementMap.get(taskRef.requirementId) || [];
        existing.push(taskRef);
        requirementMap.set(taskRef.requirementId, existing);
      }
    }

    // Create links for each requirement
    for (const [requirementId, taskRefs] of requirementMap.entries()) {
      const linkedArtifacts = this.findLinkedArtifacts(taskRefs, codeArtifacts);
      const confidence = this.calculateLinkConfidence(taskRefs, linkedArtifacts);

      if (confidence >= this.config.confidenceThreshold) {
        links.push({
          requirementId,
          specFile: this.getSpecFileForRequirement(requirementId, specResults),
          codeArtifacts: linkedArtifacts.map(a => a.id),
          linkType: this.determineLinkType(taskRefs),
          confidence,
          taskReferences: taskRefs
        });
      }
    }

    return links;
  }

  /**
   * Generate confidence score for automatic traceability link detection
   */
  calculateLinkConfidence(
    taskRefs: RequirementReference[],
    artifacts: CodeArtifact[]
  ): number {
    if (taskRefs.length === 0 || artifacts.length === 0) {
      return 0;
    }

    let totalConfidence = 0;
    let weightSum = 0;

    for (const taskRef of taskRefs) {
      // Base confidence from task reference clarity
      let taskConfidence = taskRef.confidence;

      // Boost confidence if we found related artifacts
      const relatedArtifacts = artifacts.filter(artifact => 
        this.isArtifactRelatedToTask(artifact, taskRef)
      );

      if (relatedArtifacts.length > 0) {
        taskConfidence *= 1.2; // 20% boost for having related artifacts
      }

      // Weight by task description length (longer descriptions are more specific)
      const weight = Math.min(taskRef.taskDescription.length / 100, 2);
      
      totalConfidence += taskConfidence * weight;
      weightSum += weight;
    }

    return Math.min(totalConfidence / weightSum, 1);
  }

  /**
   * Update traceability matrix with discovered links
   */
  async updateTraceabilityMatrix(
    traceabilityPath: string,
    links: TraceabilityLink[]
  ): Promise<void> {
    try {
      // Read existing matrix
      const existingMatrix = await this.parseTraceabilityMatrix(traceabilityPath);
      
      // Create updated matrix
      const updatedMatrix = this.mergeTraceabilityData(existingMatrix, links);
      
      // Generate new content
      const newContent = this.generateTraceabilityContent(updatedMatrix);
      
      // Write back to file
      fs.writeFileSync(traceabilityPath, newContent, 'utf-8');
      
      console.log(`Updated traceability matrix with ${links.length} links`);
    } catch (error) {
      console.error('Error updating traceability matrix:', error);
      throw error;
    }
  }

  private extractRequirements(content: string): string[] {
    const matches = content.match(this.config.requirementPattern) || [];
    return [...new Set(matches)]; // Remove duplicates
  }

  private extractTaskReferences(content: string): RequirementReference[] {
    const references: RequirementReference[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(this.config.taskReferencePattern);
      
      if (match && match[1]) {
        const requirementIds = match[1].split(',').map(id => id.trim());
        const taskDescription = this.extractTaskDescription(lines, i);
        const taskId = this.extractTaskId(lines, i);
        
        for (const reqId of requirementIds) {
          if (reqId.match(this.config.requirementPattern)) {
            references.push({
              requirementId: reqId,
              taskId,
              taskDescription,
              confidence: this.calculateTaskReferenceConfidence(taskDescription, reqId)
            });
          }
        }
      }
    }
    
    return references;
  }

  private extractTaskDescription(lines: string[], referenceLineIndex: number): string {
    // Look backwards to find the task title
    for (let i = referenceLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Check for task list item (- [ ] or - [x])
      const taskMatch = line.match(/^-\s*\[.\]\s*(.+)/);
      if (taskMatch) {
        return taskMatch[1];
      }
      
      // Check for numbered task (1. or 1.1)
      const numberedMatch = line.match(/^\d+(?:\.\d+)?\s+(.+)/);
      if (numberedMatch) {
        return numberedMatch[1];
      }
    }
    
    return 'Unknown task';
  }

  private extractTaskId(lines: string[], referenceLineIndex: number): string {
    // Look backwards to find the task ID
    for (let i = referenceLineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Check for task list item with ID
      const taskMatch = line.match(/^-\s*\[.\]\s*(\d+(?:\.\d+)?)/);
      if (taskMatch) {
        return taskMatch[1];
      }
    }
    
    return `task_${referenceLineIndex}`;
  }

  private calculateTaskReferenceConfidence(taskDescription: string, requirementId: string): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on task description quality
    if (taskDescription.length > 50) confidence += 0.1;
    const lowerDesc = taskDescription.toLowerCase();
    if (lowerDesc.includes('implement') || lowerDesc.includes('build') || lowerDesc.includes('create')) {
      confidence += 0.3; // Increased boost for implementation keywords
    }
    if (lowerDesc.includes('test')) confidence += 0.2; // Increased boost for test keywords
    
    // Boost confidence if requirement ID appears in description
    if (lowerDesc.includes(requirementId.toLowerCase())) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1);
  }

  private parseTraceabilityContent(content: string): TraceabilityMatrix[] {
    const matrix: TraceabilityMatrix[] = [];
    const lines = content.split('\n');
    
    // Skip header lines and find table content
    let inTable = false;
    
    for (const line of lines) {
      if (line.includes('Requirement ID') && line.includes('|')) {
        inTable = true;
        continue;
      }
      
      if (inTable && line.includes('|')) {
        // Skip separator line
        if (line.match(/^\|[\s\-|]+\|$/)) continue;
        
        const columns = line.split('|').map(col => col.trim());
        
        // Remove empty first/last columns if they exist (from leading/trailing |)
        if (columns.length > 0 && columns[0] === '') columns.shift();
        if (columns.length > 0 && columns[columns.length - 1] === '') columns.pop();
        
        if (columns.length >= 3 && columns[0]) {
          const requirementId = columns[0];
          const hookName = columns[1] || undefined;
          const testCase = columns[2] || undefined;
          
          if (requirementId && requirementId.match(this.config.requirementPattern)) {
            matrix.push({
              requirementId,
              hookName: hookName === '' ? undefined : hookName,
              testCase: testCase === '' ? undefined : testCase,
              codeArtifacts: [],
              coverage: 0
            });
          }
        }
      }
    }
    
    return matrix;
  }

  private findLinkedArtifacts(
    taskRefs: RequirementReference[],
    codeArtifacts: CodeArtifact[]
  ): CodeArtifact[] {
    const linkedArtifacts: CodeArtifact[] = [];
    
    for (const artifact of codeArtifacts) {
      for (const taskRef of taskRefs) {
        if (this.isArtifactRelatedToTask(artifact, taskRef)) {
          linkedArtifacts.push(artifact);
          break; // Don't add the same artifact multiple times
        }
      }
    }
    
    return linkedArtifacts;
  }

  private isArtifactRelatedToTask(artifact: CodeArtifact, taskRef: RequirementReference): boolean {
    const taskLower = taskRef.taskDescription.toLowerCase();
    const artifactName = artifact.name.toLowerCase();
    const filePath = artifact.filePath.toLowerCase();
    
    // Check for direct name matches
    if (taskLower.includes(artifactName) || artifactName.includes(taskLower.split(' ')[0])) {
      return true;
    }
    
    // Check for file path matches
    const taskWords = taskLower.split(/\s+/);
    for (const word of taskWords) {
      if (word.length > 3 && filePath.includes(word)) {
        return true;
      }
    }
    
    // Check for functional relationship keywords
    const functionalKeywords = ['service', 'controller', 'parser', 'analyzer', 'processor', 'manager'];
    for (const keyword of functionalKeywords) {
      if (taskLower.includes(keyword) && (artifactName.includes(keyword) || filePath.includes(keyword))) {
        return true;
      }
    }
    
    return false;
  }

  private getSpecFileForRequirement(requirementId: string, specResults: SpecParsingResult[]): string {
    for (const result of specResults) {
      if (result.requirements.includes(requirementId)) {
        return result.specFile;
      }
    }
    return 'unknown';
  }

  private determineLinkType(taskRefs: RequirementReference[]): 'implements' | 'tests' | 'documents' {
    const descriptions = taskRefs.map(ref => ref.taskDescription.toLowerCase()).join(' ');
    
    if (descriptions.includes('test') || descriptions.includes('testing')) {
      return 'tests';
    }
    
    if (descriptions.includes('document') || descriptions.includes('documentation')) {
      return 'documents';
    }
    
    return 'implements';
  }

  private mergeTraceabilityData(
    existingMatrix: TraceabilityMatrix[],
    newLinks: TraceabilityLink[]
  ): TraceabilityMatrix[] {
    const merged = new Map<string, TraceabilityMatrix>();
    
    // Add existing entries
    for (const entry of existingMatrix) {
      merged.set(entry.requirementId, entry);
    }
    
    // Update with new links
    for (const link of newLinks) {
      const existing = merged.get(link.requirementId) || {
        requirementId: link.requirementId,
        codeArtifacts: [],
        coverage: 0
      };
      
      // Merge code artifacts
      const allArtifacts = [...existing.codeArtifacts, ...link.codeArtifacts];
      existing.codeArtifacts = [...new Set(allArtifacts)]; // Remove duplicates
      
      // Update coverage based on number of linked artifacts (each artifact = 20% coverage)
      existing.coverage = Math.min(existing.codeArtifacts.length * 0.2, 1);
      
      merged.set(link.requirementId, existing);
    }
    
    return Array.from(merged.values()).sort((a, b) => a.requirementId.localeCompare(b.requirementId));
  }

  private generateTraceabilityContent(matrix: TraceabilityMatrix[]): string {
    let content = '# Requirements Traceability Matrix\n\n';
    content += '| Requirement ID | Hook Name | Test Case | Code Artifacts | Coverage |\n';
    content += '|---------------|-----------|-----------|----------------|----------|\n';
    
    for (const entry of matrix) {
      const hookName = entry.hookName || '';
      const testCase = entry.testCase || '';
      const artifacts = entry.codeArtifacts.length > 0 
        ? entry.codeArtifacts.slice(0, 3).join(', ') + (entry.codeArtifacts.length > 3 ? '...' : '')
        : '';
      const coverage = entry.coverage > 0 ? `${Math.round(entry.coverage * 100)}%` : '';
      
      content += `| ${entry.requirementId} | ${hookName} | ${testCase} | ${artifacts} | ${coverage} |\n`;
    }
    
    return content;
  }
}