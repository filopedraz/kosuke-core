import { generateText, CoreMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LLM } from '@/lib/constants';
import { ModelName, getModelForUser } from '@/lib/models';

/**
 * Chat message type
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<MessageContent>;
}

/**
 * Content of a message which can be text or an image
 */
export interface MessageContent {
  type: 'text' | 'image' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Options for the chat completion
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeoutMs?: number;
}

// Update message types to match Vercel AI SDK
type CoreMessageContent = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
};

type FormattedMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | CoreMessageContent[];
};

/**
 * Convert messages array to a single prompt string for Vercel AI SDK
 * This is only used for the fallback non-multi-modal case
 */
function convertMessagesToPrompt(messages: ChatMessage[]): string {
  return messages
    .map(msg => {
      const rolePrefix =
        msg.role === 'system' ? 'System: ' : msg.role === 'user' ? 'User: ' : 'Assistant: ';

      // Handle message content that might be string or MessageContent array
      const content =
        typeof msg.content === 'string'
          ? msg.content
          : msg.content
              .map(part => {
                if (part.type === 'text') {
                  return part.text || '';
                } else if (part.type === 'image') {
                  return '[Image attached]';
                }
                return '';
              })
              .join('\n');

      return `${rolePrefix}${content}`;
    })
    .join('\n\n');
}

/**
 * Generate a chat completion using Vercel AI SDK
 */
export async function generateAICompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<{ text: string; modelType: string }> {
  // Get the appropriate model for the user
  const userModel = await getModelForUser();

  console.log(
    `🤖 Using ${userModel.provider} model: ${userModel.model} for user tier: ${userModel.tier}`
  );

  // Determine the model type for tracking in the database
  const modelType =
    userModel.provider === 'anthropic' && userModel.model === LLM.PREMIUM_MODEL
      ? 'premium'
      : 'default';

  console.log(`Message will be tracked as model type: ${modelType}`);

  const { temperature = 0.7, maxTokens = 2000 } = options;

  try {
    // Check if any messages contain image parts and we have a multi-modal model
    const hasImages = messages.some(
      msg => Array.isArray(msg.content) && msg.content.some(part => part.type === 'image')
    );

    // If we have images and a modern multi-modal model
    const supportsMultimodal =
      (userModel.provider === 'anthropic' && userModel.model === LLM.PREMIUM_MODEL) ||
      (userModel.provider === 'openai' && userModel.model === 'gpt-4o-mini') ||
      (userModel.provider === 'google' && userModel.model.includes('gemini'));

    if (hasImages && supportsMultimodal) {
      console.log('📸 Detected multi-modal message with images');
    } else if (hasImages) {
      console.log(
        '⚠️ Images detected but using model that may not support multi-modal: ' + userModel.model
      );
    }

    // Common telemetry options for all model providers
    const telemetryOptions = {
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          tier: userModel.tier,
          modelType,
        },
      },
    };

    if (userModel.provider === 'anthropic') {
      // Use Anthropic's Claude
      try {
        console.log(`Starting Anthropic request with model: ${userModel.model}`);

        // Format messages for Anthropic
        const formattedMessages = messages.map(msg => {
          if (typeof msg.content === 'string') {
            return {
              role: msg.role,
              content: [{ type: 'text', text: msg.content }],
            } as FormattedMessage;
          } else {
            return {
              role: msg.role,
              content: msg.content.map(part => ({
                type: part.type === 'image' ? 'image_url' : 'text',
                text: part.text,
                image_url: part.image_url,
              })),
            } as FormattedMessage;
          }
        }) as unknown as CoreMessage[];

        console.log(
          `Using multi-modal format for Claude, message count: ${formattedMessages.length}`
        );

        // Log the model parameters for debugging
        console.log(`Request parameters: temperature=${temperature}, maxTokens=${maxTokens}`);

        // Start timing the request
        const startTime = Date.now();

        // Modern Claude 3 models support multimodal direct input
        const response = await generateText({
          model: anthropic(userModel.model as ModelName),
          messages: formattedMessages,
          temperature,
          maxTokens,
          ...telemetryOptions,
        });

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`Anthropic request completed in ${duration.toFixed(2)}s`);
        console.log(`Response text length: ${response.text.length} characters`);
        console.log(`Response first 100 chars: ${response.text.substring(0, 100)}...`);

        // If we got an empty response, log a clear error
        if (!response.text || response.text.trim() === '') {
          console.error('❌ WARNING: Empty response received from Anthropic API');
        }

        return { text: response.text, modelType };
      } catch (anthropicError) {
        console.error('Error with Anthropic API:', anthropicError);
        console.error('Error details:', JSON.stringify(anthropicError, null, 2));
        throw new Error(
          `Anthropic API error: ${anthropicError instanceof Error ? anthropicError.message : String(anthropicError)}`
        );
      }
    } else if (userModel.provider === 'google') {
      // Use Google's Gemini
      try {
        console.log(`Starting Google Gemini request with model: ${userModel.model}`);

        // Make sure we have the API key
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is not set in environment variables');
        }

        // Create a custom Google provider with the API key
        const googleProvider = createGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY,
        });

        // Format messages for Google
        const formattedMessages = messages.map(msg => {
          if (typeof msg.content === 'string') {
            return {
              role: msg.role,
              content: msg.content,
            } as FormattedMessage;
          } else {
            return {
              role: msg.role,
              content: msg.content.map(part => {
                if (part.type === 'text') {
                  return { type: 'text', text: part.text };
                } else if (part.type === 'image') {
                  return {
                    type: 'image_url',
                    image_url: part.image_url,
                  } as CoreMessageContent;
                }
                return part;
              }),
            } as FormattedMessage;
          }
        });

        console.log(
          `Using multi-modal format for Gemini, message count: ${formattedMessages.length}`
        );

        // Log the model parameters for debugging
        console.log(`Request parameters: temperature=${temperature}, maxTokens=${maxTokens}`);

        // Start timing the request
        const startTime = Date.now();

        // Use Gemini model via Vercel AI SDK
        const response = await generateText({
          model: googleProvider(userModel.model as ModelName),
          messages: formattedMessages as CoreMessage[],
          temperature,
          maxTokens,
          ...telemetryOptions,
        });

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`Google Gemini request completed in ${duration.toFixed(2)}s`);
        console.log(`Response text length: ${response.text.length} characters`);
        console.log(`Response first 100 chars: ${response.text.substring(0, 100)}...`);

        // If we got an empty response, log a clear error
        if (!response.text || response.text.trim() === '') {
          console.error('❌ WARNING: Empty response received from Google Gemini API');
        }

        return { text: response.text, modelType };
      } catch (googleError) {
        console.error('Error with Google Gemini API:', googleError);
        console.error('Error details:', JSON.stringify(googleError, null, 2));
        throw new Error(
          `Google Gemini API error: ${googleError instanceof Error ? googleError.message : String(googleError)}`
        );
      }
    } else {
      // Use OpenAI
      try {
        console.log(`Starting OpenAI request with model: ${userModel.model}`);

        // For 4o models, we can use the multimodal messages format
        if (userModel.model === 'gpt-4o-mini' || userModel.model.includes('gpt-4')) {
          // Format messages for OpenAI
          const formattedMessages = messages.map(msg => {
            if (typeof msg.content === 'string') {
              return {
                role: msg.role,
                content: msg.content,
              } as FormattedMessage;
            } else {
              return {
                role: msg.role,
                content: msg.content.map(part => {
                  if (part.type === 'text') {
                    return { type: 'text', text: part.text };
                  } else if (part.type === 'image') {
                    return {
                      type: 'image_url',
                      image_url: part.image_url,
                    } as CoreMessageContent;
                  }
                  return part;
                }),
              } as FormattedMessage;
            }
          });

          console.log(
            `Using multi-modal format for OpenAI, message count: ${formattedMessages.length}`
          );

          try {
            const { text } = await generateText({
              model: openai(userModel.model as ModelName),
              messages: formattedMessages as CoreMessage[],
              temperature,
              maxTokens,
              ...telemetryOptions,
            });

            console.log('OpenAI request completed successfully');
            return { text, modelType };
          } catch (openaiErr) {
            console.error('Error with multi-modal format for OpenAI:', openaiErr);
            console.log('Falling back to plain text format');

            // Fallback to plain text if multi-modal fails
            const plainTextMessages = messages.map(msg => {
              if (typeof msg.content === 'string') {
                return { role: msg.role, content: msg.content };
              } else {
                // Convert multi-modal to plain text
                const textContent = msg.content
                  .map(part => {
                    if (part.type === 'text') return part.text;
                    if (part.type === 'image') return '[Image attached]';
                    return '';
                  })
                  .join('\n');
                return { role: msg.role, content: textContent };
              }
            });

            const { text } = await generateText({
              model: openai(userModel.model as ModelName),
              messages: plainTextMessages as CoreMessage[],
              temperature,
              maxTokens,
              ...telemetryOptions,
            });

            console.log('OpenAI fallback request completed successfully');
            return { text, modelType };
          }
        } else {
          // Fallback to prompt format for older models
          const prompt = convertMessagesToPrompt(messages);
          const { text } = await generateText({
            model: openai(userModel.model as ModelName),
            prompt,
            temperature,
            maxTokens,
            ...telemetryOptions,
          });
          console.log('OpenAI request completed successfully');
          return { text, modelType };
        }
      } catch (openaiError) {
        console.error('Error with OpenAI API:', openaiError);
        console.error('Error details:', JSON.stringify(openaiError, null, 2));
        throw new Error(
          `OpenAI API error: ${openaiError instanceof Error ? openaiError.message : String(openaiError)}`
        );
      }
    }
  } catch (error) {
    console.error('Error generating AI completion:', error);
    console.error('User model info:', JSON.stringify(userModel, null, 2));
    console.error('Options:', JSON.stringify(options, null, 2));

    // Include more context in the error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to generate AI completion for ${userModel.provider} (${userModel.model}): ${errorMessage}`
    );
  }
}

/**
 * Generate a code completion
 */
export async function generateCodeCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  // Use a lower temperature for code generation
  const result = await generateAICompletion(messages, {
    ...options,
    temperature: options.temperature || 0.2,
  });

  return result.text;
}
