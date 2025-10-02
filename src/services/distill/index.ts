// Main distillation service export
// Re-export the orchestrator API to match repository usage

export { runDistillationPipeline } from './orchestrator';
export type {
  EvidenceCard,
  ContextCard,
  TieredEvidence,
  DistillationManifest,
  DistillationConfig
} from '../../types/distillation';
export type { DistillationPipelineResult } from './orchestrator';
