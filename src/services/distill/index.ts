// Main distillation service export
// Uses two-tier evidence system per expert recommendation

export { distillDocumentsTwoTier as runDistillationPipeline } from './twoTierDistiller';
export type { 
  EvidenceCard, 
  ContextCard,
  TieredEvidence,
  DistillationManifest,
  DistillationConfig 
} from '../../types/distillation';

// For backward compatibility
export interface DistillationPipelineResult {
  success: boolean;
  evidenceCards?: any[];
  manifest?: any;
  error?: string;
}
