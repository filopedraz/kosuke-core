import { PipelineType, Pipeline } from './types';
import { NaivePipeline } from './naive';
import { RooCodePipeline } from './rooCode';

/**
 * Get the appropriate pipeline implementation based on the type
 * @param pipelineType The type of pipeline to retrieve
 * @returns The pipeline implementation
 */
export function getPipeline(pipelineType: PipelineType): Pipeline {
  switch (pipelineType) {
    case PipelineType.NAIVE:
      return new NaivePipeline();
    case PipelineType.ROO_CODE:
      return new RooCodePipeline();
    default:
      // Default to naive pipeline
      console.warn(`Unknown pipeline type: ${pipelineType}, defaulting to naive`);
      return new NaivePipeline();
  }
}

export * from './types';
