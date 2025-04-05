import { generateText, CoreMessage } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getModelForUser } from '@/lib/models';
import { LLM } from '@/lib/constants';

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
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeoutMs?: number;
}

// Core message content type for Vercel AI SDK
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
 * Generate a chat completion using Gemini Pro 2.5 through Vercel AI SDK
 */
export async function generateAICompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<{ text: string; modelType: string }> {
  // Get the user's tier for tracking only (same model for all tiers)
  const userModel = await getModelForUser();
  console.log(`🤖 Using Gemini 2.5 Pro for user tier: ${userModel.tier}`);

  const { temperature = 0.7, maxTokens = 60000 } = options;

  try {
    // Check if any messages contain image parts (all supported by Gemini)
    const hasImages = messages.some(
      msg => Array.isArray(msg.content) && msg.content.some(part => part.type === 'image')
    );

    if (hasImages) {
      console.log('📸 Detected multi-modal message with images');
    }

    // Common telemetry options for tracking
    const telemetryOptions = {
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          tier: userModel.tier,
        },
      },
    };

    // Use Google's Gemini for all requests
    try {
      console.log(`Starting Google Gemini request with model: ${userModel.model}`);

      // Make sure we have the API key
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set in environment variables');
      }

      // Create Google provider with the API key
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

      console.log(`Formatted message count: ${formattedMessages.length}`);
      console.log(`Request parameters: temperature=${temperature}, maxTokens=${maxTokens}`);

      // Start timing the request
      const startTime = Date.now();

      // Use Gemini model via Vercel AI SDK
      const response = await generateText({
        model: googleProvider(userModel.model),
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

      return { text: response.text, modelType: userModel.tier };
    } catch (googleError) {
      console.error('Error with Google Gemini API:', googleError);
      console.error('Error details:', JSON.stringify(googleError, null, 2));
      throw new Error(
        `Google Gemini API error: ${googleError instanceof Error ? googleError.message : String(googleError)}`
      );
    }
  } catch (error) {
    console.error('Error generating AI completion:', error);
    console.error('User model info:', JSON.stringify(userModel, null, 2));
    console.error('Options:', JSON.stringify(options, null, 2));

    // Include more context in the error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate AI completion: ${errorMessage}`);
  }
}

/**
 * Generate a summary using Gemini Flash (faster, more efficient for summaries)
 */
export async function generateSummaryWithFlash(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    console.log(`🚀 Starting Gemini Flash request for summary generation`);

    // Make sure we have the API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    // Set optimal parameters for summary generation with Flash
    const { temperature = 0.3, maxTokens = 1000 } = options;

    // Create Google provider with the API key
    const googleProvider = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Format messages for Flash
    const formattedMessages = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content,
        } as FormattedMessage;
      } else {
        // Flash only supports text, so we convert all content to text
        const textContent = msg.content
          .filter(part => part.type === 'text' && part.text)
          .map(part => part.text)
          .join('\n');

        return {
          role: msg.role,
          content: textContent,
        } as FormattedMessage;
      }
    });

    console.log(`Formatted message count for Flash: ${formattedMessages.length}`);

    // Start timing the request
    const startTime = Date.now();

    // Use Gemini Flash model via Vercel AI SDK
    const response = await generateText({
      model: googleProvider(LLM.FLASH_MODEL),
      messages: formattedMessages as CoreMessage[],
      temperature,
      maxTokens,
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`Gemini Flash request completed in ${duration.toFixed(2)}s`);
    console.log(`Summary length: ${response.text.length} characters`);
    console.log(`Summary preview: ${response.text.substring(0, 100)}...`);

    return response.text;
  } catch (error) {
    console.error('Error generating summary with Gemini Flash:', error);

    // Provide a fallback message if Flash generation fails
    return "I've completed all the requested changes successfully.";
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
