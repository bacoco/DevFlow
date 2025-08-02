  
// Generate traceability connections from links
  const connections = useMemo((): TraceabilityConnection[] => {
    return visibleLinks.map(link => ({
      id: `${link.requirementId}-${link.codeArtifacts.join('-')}`,
      fromId: link.requirementId,
      toId: link.codeArtifacts[0], // For now, connect to first artifact
      linkType: link.linkType,
      confidence: link.confidence,
      isHighlighted: hoveredRequirement === link.requirementId || 
                    link.codeArtifacts.includes(hoveredArtifact || ''),
      isSelected: selectedRequirement === link.requirementId || 
                 link.codeArtifacts.includes(selectedArtifact || ''),
    }));
  }, [visibleLinks, hoveredRequirement, hoveredArtifact, selectedRequirement, selectedArtifact]);

  // Calculate coverage analysis
  const coverageAnalysis = useMemo((): CoverageAnalysis => {
    const totalRequirements = requirements.length;
    const linkedRequirements = requirements.filter(req => req.linkedArtifacts.length > 0).length;
    const coveragePercentage = totalRequirements > 0 ? (linkedRequirements / totalRequirements) * 100 : 0;
    
    const gapAnalysis = requirements
      .filter(req => req.linkedArtifacts.length === 0)
      .map(req => req.requirementId);
    
    const linkedArtifactIds = new Set<string>();
    visibleLinks.forEach(link => {
      link.codeArtifacts.forEach(artifactId => linkedArtifactIds.add(artifactId));
    });
    
    const orphanedArtifacts = visibleArtifacts
      .filter(artifact => !linkedArtifactIds.has(artifact.id))
      .map(artifact => artifact.id);

    return {
      totalRequirements,
      linkedRequirements,
      coveragePercentage,
      gapAnalysis,
      orphanedArtifacts,
    };
  }, [requirements, visibleLinks, visibleArtifacts]);

  // Notify parent of coverage analysis changes
  useEffect(() => {
    onCoverageAnalysis?.(coverageAnalysis);
  }, [coverageAnalysis, onCoverageAnalysis]);

  // Event handlers
  const handleRequirementSelect = useCallback((requirement: RequirementNode) => {
    setSelectedRequirement(prev => prev === requirement.requirementId ? undefined : requirement.requirementId);
    setSelectedArtifact(undefined);
    onRequirementSelect?.(requirement);
  }, [onRequirementSelect]);

  const handleArtifactSelect = useCallback((artifact: CodeArtifact) => {
    setSelectedArtifact(prev => prev === artifact.id ? undefined : artifact.id);
    setSelectedRequirement(undefined);
    onArtifactSelect?.(artifact);
  }, [onArtifactSelect]);

  const handleRequirementHover = useCallback((requirement: RequirementNode | null) => {
    setHoveredRequirement(requirement?.requirementId);
    onRequirementHover?.(requirement);
  }, [onRequirementHover]);

  const handleArtifactHover = useCallback((artifact: CodeArtifact | null) => {
    setHoveredArtifact(artifact?.id);
    onArtifactHover?.(artifact);
  }, [onArtifactHover]);  ret
urn (
    <group>
      {/* Render requirements */}
      {visibleRequirements.map(requirement => (
        <RequirementNode3D
          key={requirement.id}
          requirement={requirement}
          config={config}
          isSelected={selectedRequirement === requirement.requirementId}
          isHighlighted={hoveredRequirement === requirement.requirementId}
          onClick={handleRequirementSelect}
          onHover={handleRequirementHover}
        />
      ))}

      {/* Render code artifacts */}
      {visibleArtifacts.map(artifact => {
        const isOrphan = config.highlightOrphans && 
          coverageAnalysis.orphanedArtifacts.includes(artifact.id);
        
        return (
          <CodeArtifact3D
            key={artifact.id}
            artifact={artifact}
            config={config}
            isSelected={selectedArtifact === artifact.id}
            isHighlighted={hoveredArtifact === artifact.id || isOrphan}
            onClick={handleArtifactSelect}
            onHover={handleArtifactHover}
            opacity={isOrphan ? 0.5 : undefined}
          />
        );
      })}

      {/* Render traceability connections */}
      {config.showTraceabilityLinks && (
        <TraceabilityLines
          connections={connections}
          requirements={visibleRequirements}
          artifacts={visibleArtifacts}
          selectedRequirement={selectedRequirement}
          selectedArtifact={selectedArtifact}
          confidenceThreshold={config.confidenceThreshold}
        />
      )}
    </group>
  );
};

export default TraceabilityVisualization;