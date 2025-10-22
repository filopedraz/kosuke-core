/**
 * Project Estimation Service
 *
 * Analyzes requirements documents and generates project complexity estimates
 * using Claude AI with structured JSON output.
 */

import Anthropic from '@anthropic-ai/sdk';

import type { ProjectComplexity, ProjectEstimate } from '@/lib/types/project';

import { readDocs } from './claude-requirements';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fixed timelines based on complexity
const COMPLEXITY_TIMELINES: Record<ProjectComplexity, string> = {
  simple: '1 week',
  medium: '2 weeks',
  complex: '3 weeks',
};

// Fixed pricing based on complexity
const COMPLEXITY_PRICING: Record<ProjectComplexity, number> = {
  simple: 5000,
  medium: 10000,
  complex: 15000,
};

interface EstimateAnalysis {
  complexity: ProjectComplexity;
  reasoning: string;
}

/**
 * Generate project estimate from requirements document
 */
export async function generateProjectEstimate(projectId: number): Promise<ProjectEstimate> {
  // Read the docs.md file
  const docsContent = readDocs(projectId);

  if (!docsContent) {
    throw new Error('Requirements document (docs.md) not found');
  }

  const systemPrompt = `You are a technical project estimator. Analyze the requirements document and determine the project complexity.

Complexity Levels:
- SIMPLE: Basic CRUD operations, simple UI, minimal integrations, straightforward data model
- MEDIUM: Multiple features, moderate complexity UI, 2-3 integrations, relationships in data model
- COMPLEX: Advanced features, complex UI/UX, multiple integrations, complex data relationships, real-time features

Respond with ONLY a JSON object in this exact format:
{
  "complexity": "simple" | "medium" | "complex",
  "reasoning": "Brief explanation (2-3 sentences) of why this complexity level was chosen"
}`;

  const userPrompt = `Analyze this requirements document and estimate the project complexity:

${docsContent}

Return ONLY the JSON response with complexity and reasoning.`;

  try {
    // Call Claude API
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent estimates
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let analysisData: EstimateAnalysis;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysisData = JSON.parse(jsonMatch[0]) as EstimateAnalysis;
    } catch {
      console.error('Failed to parse Claude response:', textContent.text);
      throw new Error('Failed to parse estimate response from Claude');
    }

    // Validate complexity level
    if (!['simple', 'medium', 'complex'].includes(analysisData.complexity)) {
      throw new Error(`Invalid complexity level: ${analysisData.complexity}`);
    }

    // Build final estimate
    const estimate: ProjectEstimate = {
      complexity: analysisData.complexity,
      amount: COMPLEXITY_PRICING[analysisData.complexity],
      timeline: COMPLEXITY_TIMELINES[analysisData.complexity],
      reasoning: analysisData.reasoning,
    };

    return estimate;
  } catch (error) {
    console.error('Error generating project estimate:', error);
    throw error;
  }
}

/**
 * Retry wrapper for estimate generation
 */
export async function generateProjectEstimateWithRetry(
  projectId: number,
  maxRetries: number = 2
): Promise<ProjectEstimate> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateProjectEstimate(projectId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Estimate generation attempt ${attempt + 1} failed:`, lastError.message);

      // Don't retry if it's a validation error (missing docs)
      if (lastError.message.includes('not found')) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Failed to generate estimate');
}
