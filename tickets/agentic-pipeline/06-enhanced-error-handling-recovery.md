# Ticket 06: Enhanced Error Handling & Recovery (Optional)

## Overview

Implement comprehensive error handling and recovery mechanisms following Dyad's approach, including network recovery, automatic retry logic, detailed error states, and graceful degradation to improve system resilience.

## Current State

- Basic error handling with simple error messages
- No automatic retry mechanisms
- Limited error categorization
- No network recovery capabilities
- Manual error recovery only

## Target State (Dyad Approach)

- Comprehensive error categorization and handling
- Automatic retry logic for recoverable errors
- Network recovery mechanisms
- Graceful degradation during outages
- Detailed error reporting and user guidance

## Implementation Details

### 1. Enhanced Error Classification System

```typescript
// lib/errors/error-types.ts - Comprehensive error classification
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  RATE_LIMIT = 'rate_limit',
  AI_SERVICE = 'ai_service',
  DATABASE = 'database',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  CANCELLATION = 'cancellation',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface DetailedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string; // User-friendly message
  technicalMessage?: string; // Technical details for debugging
  retryable: boolean;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number; // milliseconds
  recoveryActions?: RecoveryAction[];
  metadata?: Record<string, any>;
  timestamp: Date;
  context?: {
    projectId?: number;
    messageId?: number;
    userId?: string;
    endpoint?: string;
  };
}

export interface RecoveryAction {
  type: 'retry' | 'refresh' | 'reconnect' | 'fallback' | 'manual';
  label: string;
  description: string;
  action: () => Promise<void>;
  priority: number;
}

// Error factory for creating detailed errors
export class ErrorFactory {
  static createNetworkError(originalError: Error, context?: any): DetailedError {
    return {
      id: `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message: 'Network connection error',
      userMessage: "Connection issue detected. We'll try to reconnect automatically.",
      technicalMessage: originalError.message,
      retryable: true,
      autoRetry: true,
      maxRetries: 3,
      retryDelay: 2000,
      timestamp: new Date(),
      context,
      recoveryActions: [
        {
          type: 'retry',
          label: 'Retry Connection',
          description: 'Attempt to reconnect to the service',
          action: async () => {
            /* retry logic */
          },
          priority: 1,
        },
        {
          type: 'refresh',
          label: 'Refresh Page',
          description: 'Reload the page to reset the connection',
          action: async () => window.location.reload(),
          priority: 2,
        },
      ],
    };
  }

  static createAIServiceError(originalError: Error, context?: any): DetailedError {
    return {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: ErrorCategory.AI_SERVICE,
      severity: ErrorSeverity.HIGH,
      message: 'AI service unavailable',
      userMessage: 'The AI service is temporarily unavailable. Please try again in a moment.',
      technicalMessage: originalError.message,
      retryable: true,
      autoRetry: false, // Don't auto-retry AI errors
      maxRetries: 1,
      retryDelay: 5000,
      timestamp: new Date(),
      context,
      recoveryActions: [
        {
          type: 'retry',
          label: 'Try Again',
          description: 'Retry your request',
          action: async () => {
            /* retry logic */
          },
          priority: 1,
        },
      ],
    };
  }

  static createTimeoutError(timeoutMs: number, context?: any): DetailedError {
    return {
      id: `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      message: 'Request timeout',
      userMessage: `Request timed out after ${timeoutMs / 1000} seconds. This might be due to high server load.`,
      retryable: true,
      autoRetry: true,
      maxRetries: 2,
      retryDelay: 3000,
      timestamp: new Date(),
      context,
      recoveryActions: [
        {
          type: 'retry',
          label: 'Retry Request',
          description: 'Try the request again',
          action: async () => {
            /* retry logic */
          },
          priority: 1,
        },
      ],
    };
  }

  static createRateLimitError(retryAfter?: number, context?: any): DetailedError {
    const waitTime = retryAfter || 60;
    return {
      id: `ratelimit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      message: 'Rate limit exceeded',
      userMessage: `Too many requests. Please wait ${waitTime} seconds before trying again.`,
      retryable: true,
      autoRetry: true,
      maxRetries: 1,
      retryDelay: waitTime * 1000,
      timestamp: new Date(),
      context,
      recoveryActions: [
        {
          type: 'retry',
          label: `Wait ${waitTime}s & Retry`,
          description: 'Automatically retry after the wait period',
          action: async () => {
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
            /* retry logic */
          },
          priority: 1,
        },
      ],
    };
  }
}
```

### 2. Automatic Retry Logic System

```typescript
// lib/retry/retry-manager.ts - Intelligent retry system
export class RetryManager {
  private retryAttempts = new Map<string, number>();
  private retryTimers = new Map<string, NodeJS.Timeout>();

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorConfig: DetailedError,
    onRetry?: (attempt: number, error: DetailedError) => void
  ): Promise<T> {
    const attemptKey = `${errorConfig.context?.messageId || 'unknown'}_${Date.now()}`;
    let lastError: DetailedError = errorConfig;

    for (let attempt = 1; attempt <= errorConfig.maxRetries; attempt++) {
      try {
        const result = await operation();

        // Success - clean up retry tracking
        this.cleanupRetry(attemptKey);
        return result;
      } catch (error) {
        lastError = this.enhanceError(error as Error, errorConfig, attempt);

        // Don't retry if not retryable or if max attempts reached
        if (!errorConfig.retryable || attempt >= errorConfig.maxRetries) {
          this.cleanupRetry(attemptKey);
          throw lastError;
        }

        // Calculate exponential backoff delay
        const delay = this.calculateRetryDelay(errorConfig.retryDelay, attempt);

        console.warn(
          `Attempt ${attempt}/${errorConfig.maxRetries} failed, retrying in ${delay}ms:`,
          error
        );

        // Notify about retry attempt
        onRetry?.(attempt, lastError);

        // Wait before retrying
        await this.delay(delay);

        // Update retry tracking
        this.retryAttempts.set(attemptKey, attempt);
      }
    }

    // All retries exhausted
    this.cleanupRetry(attemptKey);
    throw lastError;
  }

  private enhanceError(error: Error, baseConfig: DetailedError, attempt: number): DetailedError {
    return {
      ...baseConfig,
      id: `${baseConfig.id}_attempt_${attempt}`,
      technicalMessage: `${baseConfig.technicalMessage} (Attempt ${attempt}/${baseConfig.maxRetries}: ${error.message})`,
      metadata: {
        ...baseConfig.metadata,
        attempt,
        maxRetries: baseConfig.maxRetries,
        originalError: error.message,
      },
    };
  }

  private calculateRetryDelay(baseDelay: number, attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanupRetry(attemptKey: string): void {
    this.retryAttempts.delete(attemptKey);
    const timer = this.retryTimers.get(attemptKey);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(attemptKey);
    }
  }

  // Get current retry status
  getRetryStatus(key: string): number | undefined {
    return this.retryAttempts.get(key);
  }

  // Cancel pending retries
  cancelRetries(keyPrefix?: string): void {
    if (keyPrefix) {
      // Cancel specific retries
      for (const [key, timer] of this.retryTimers.entries()) {
        if (key.startsWith(keyPrefix)) {
          clearTimeout(timer);
          this.retryTimers.delete(key);
          this.retryAttempts.delete(key);
        }
      }
    } else {
      // Cancel all retries
      for (const timer of this.retryTimers.values()) {
        clearTimeout(timer);
      }
      this.retryTimers.clear();
      this.retryAttempts.clear();
    }
  }
}

export const retryManager = new RetryManager();
```

### 3. Network Recovery System

```typescript
// lib/network/network-monitor.ts - Network monitoring and recovery
export class NetworkMonitor {
  private listeners = new Set<(online: boolean) => void>();
  private isOnline = navigator.onLine;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Listen for network status changes
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Periodic connectivity check
    this.startConnectivityCheck();
  }

  // Subscribe to network status changes
  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);

    // Immediately notify of current status
    listener(this.isOnline);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current network status
  get online(): boolean {
    return this.isOnline;
  }

  private handleOnline(): void {
    console.log('Network connection restored');
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.notifyListeners(true);

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private handleOffline(): void {
    console.log('Network connection lost');
    this.isOnline = false;
    this.notifyListeners(false);
    this.startReconnectAttempts();
  }

  private notifyListeners(online: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.error('Error notifying network listener:', error);
      }
    });
  }

  private startReconnectAttempts(): void {
    const attemptReconnect = () => {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('Max reconnect attempts reached');
        return;
      }

      this.reconnectAttempts++;
      console.log(`Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      // Test connectivity
      this.testConnectivity().then(online => {
        if (online && !this.isOnline) {
          this.handleOnline();
        } else if (!online) {
          // Schedule next attempt with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
          this.reconnectTimer = setTimeout(attemptReconnect, delay);
        }
      });
    };

    // Start first attempt after a short delay
    this.reconnectTimer = setTimeout(attemptReconnect, 2000);
  }

  private async testConnectivity(): Promise<boolean> {
    try {
      // Use a lightweight endpoint to test connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private startConnectivityCheck(): void {
    // Check connectivity every 30 seconds when online
    setInterval(() => {
      if (this.isOnline) {
        this.testConnectivity().then(online => {
          if (!online && this.isOnline) {
            this.handleOffline();
          }
        });
      }
    }, 30000);
  }

  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.listeners.clear();
  }
}

export const networkMonitor = new NetworkMonitor();
```

### 4. Enhanced Error UI Components

```typescript
// components/error/enhanced-error-display.tsx - Comprehensive error UI
export interface EnhancedErrorDisplayProps {
  error: DetailedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export default function EnhancedErrorDisplay({
  error,
  onRetry,
  onDismiss,
  compact = false
}: EnhancedErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Get appropriate icon for error category
  const getErrorIcon = () => {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        return <Wifi className="h-5 w-5" />;
      case ErrorCategory.AI_SERVICE:
        return <Bot className="h-5 w-5" />;
      case ErrorCategory.TIMEOUT:
        return <Clock className="h-5 w-5" />;
      case ErrorCategory.RATE_LIMIT:
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // Get color scheme for error severity
  const getSeverityColors = () => {
    switch (error.severity) {
      case ErrorSeverity.LOW:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case ErrorSeverity.MEDIUM:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ErrorSeverity.HIGH:
        return 'text-red-600 bg-red-50 border-red-200';
      case ErrorSeverity.CRITICAL:
        return 'text-red-800 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Handle retry with countdown
  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);

    try {
      if (error.retryDelay > 1000) {
        // Show countdown for longer delays
        let countdown = Math.ceil(error.retryDelay / 1000);
        setRetryCountdown(countdown);

        const countdownInterval = setInterval(() => {
          countdown--;
          setRetryCountdown(countdown);

          if (countdown <= 0) {
            clearInterval(countdownInterval);
            setRetryCountdown(null);
          }
        }, 1000);

        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, error.retryDelay));
      }

      await onRetry();
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
      setRetryCountdown(null);
    }
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-md border text-sm",
        getSeverityColors()
      )}>
        {getErrorIcon()}
        <span className="flex-1 truncate">{error.userMessage}</span>
        {error.retryable && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-6 px-2 text-xs"
          >
            {isRetrying ? (
              retryCountdown ? `${retryCountdown}s` : <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Retry'
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-l-4", getSeverityColors())}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-full", getSeverityColors())}>
            {getErrorIcon()}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-foreground">
                  {error.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Error
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {error.userMessage}
                </p>
              </div>

              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Technical details (collapsible) */}
            {error.technicalMessage && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {error.technicalMessage}
                </pre>
              </details>
            )}

            {/* Recovery actions */}
            {error.recoveryActions && error.recoveryActions.length > 0 && (
              <div className="flex gap-2 pt-2">
                {error.recoveryActions
                  .sort((a, b) => a.priority - b.priority)
                  .map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={index === 0 ? "default" : "outline"}
                      onClick={async () => {
                        setIsRetrying(true);
                        try {
                          await action.action();
                        } finally {
                          setIsRetrying(false);
                        }
                      }}
                      disabled={isRetrying}
                      className="text-xs"
                    >
                      {isRetrying && index === 0 ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          {retryCountdown ? `${retryCountdown}s` : 'Processing...'}
                        </>
                      ) : (
                        action.label
                      )}
                    </Button>
                  ))}
              </div>
            )}

            {/* Metadata display for debugging */}
            {error.metadata && Object.keys(error.metadata).length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Debug Info
                </summary>
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5. Integration with Chat Interface

```typescript
// chat-interface.tsx - Enhanced error handling integration
const ChatInterface = ({ projectId, initialMessages = [] }: ChatInterfaceProps) => {
  const [errors, setErrors] = useState<DetailedError[]>([]);
  const [networkStatus, setNetworkStatus] = useState(networkMonitor.online);

  // Subscribe to network status
  useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setNetworkStatus);
    return unsubscribe;
  }, []);

  // Enhanced mutation with comprehensive error handling
  const {
    mutate,
    isPending: isSending
  } = useMutation({
    mutationFn: async (args: { content: string; options?: MessageOptions }) => {
      // Check network status before attempting
      if (!networkStatus) {
        throw ErrorFactory.createNetworkError(
          new Error('No network connection'),
          { projectId, action: 'send_message' }
        );
      }

      // Execute with retry logic
      return await retryManager.executeWithRetry(
        async () => {
          const response = await fetch(`/api/projects/${projectId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: args.content,
              includeContext: args.options?.includeContext || false,
              contextFiles: args.options?.contextFiles || [],
            }),
            signal: AbortSignal.timeout(30000), // 30 second timeout
          });

          if (!response.ok) {
            // Create appropriate error based on status
            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              throw ErrorFactory.createRateLimitError(
                retryAfter ? parseInt(retryAfter) : undefined,
                { projectId, status: response.status }
              );
            } else if (response.status >= 500) {
              throw ErrorFactory.createAIServiceError(
                new Error(`Server error: ${response.status}`),
                { projectId, status: response.status }
              );
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          }

          return response;
        },
        ErrorFactory.createNetworkError(new Error('Request failed'), { projectId }),
        (attempt, error) => {
          // Show retry notification
          setErrors(prev => [...prev, {
            ...error,
            id: `retry_${attempt}_${error.id}`,
            userMessage: `Retry attempt ${attempt}/${error.maxRetries}...`
          }]);
        }
      );
    },

    onError: (error: any) => {
      const detailedError = error instanceof Error
        ? ErrorFactory.createAIServiceError(error, { projectId })
        : error as DetailedError;

      setErrors(prev => [...prev, detailedError]);
    },
  });

  // Error dismissal
  const dismissError = (errorId: string) => {
    setErrors(prev => prev.filter(err => err.id !== errorId));
  };

  // Retry functionality
  const retryLastMessage = async () => {
    if (lastUserMessage) {
      await mutate({
        content: lastUserMessage,
        options: lastMessageOptions || undefined
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Network status indicator */}
      {!networkStatus && (
        <div className="p-2 bg-orange-100 border-b border-orange-200 text-orange-800 text-sm text-center">
          <Wifi className="h-4 w-4 inline mr-2" />
          No network connection. Trying to reconnect...
        </div>
      )}

      {/* Error display area */}
      {errors.length > 0 && (
        <div className="p-2 space-y-2 border-b">
          {errors.slice(-2).map(error => (
            <EnhancedErrorDisplay
              key={error.id}
              error={error}
              onRetry={error.retryable ? retryLastMessage : undefined}
              onDismiss={() => dismissError(error.id)}
              compact
            />
          ))}
        </div>
      )}

      {/* Rest of chat interface */}
      <ScrollArea className="flex-1">
        {/* Messages */}
      </ScrollArea>

      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isSending}
        disabled={!networkStatus}
        placeholder={
          !networkStatus
            ? "Waiting for network connection..."
            : "Type your message..."
        }
      />
    </div>
  );
};
```

## Benefits

1. **Improved Reliability**: Automatic recovery from transient failures
2. **Better User Experience**: Clear error communication and guidance
3. **Reduced Support Burden**: Self-healing for common issues
4. **Network Resilience**: Graceful handling of connectivity issues
5. **Debugging Capabilities**: Detailed error information for troubleshooting

## Breaking Changes

1. **Error Types**: New comprehensive error classification system
2. **Retry Logic**: Automatic retry mechanisms may change timing
3. **UI Changes**: New error display components and states
4. **Network Handling**: Enhanced network status monitoring

## Testing Requirements

1. **Error Scenarios**: Test all error categories and recovery paths
2. **Network Conditions**: Test offline/online transitions
3. **Retry Logic**: Test automatic and manual retry mechanisms
4. **Error UI**: Test error display and user interactions
5. **Performance**: Ensure error handling doesn't impact performance

## Acceptance Criteria

- [ ] Comprehensive error categorization and handling
- [ ] Automatic retry for recoverable errors
- [ ] Network status monitoring and recovery
- [ ] User-friendly error messages and guidance
- [ ] Graceful degradation during outages
- [ ] Proper error logging and debugging information
- [ ] Performance impact remains minimal
- [ ] Error states are accessible and clear

## Estimated Effort

**High**: ~3-4 days

This optional ticket provides enterprise-grade error handling and recovery capabilities, making the chat system more resilient and user-friendly in production environments.
