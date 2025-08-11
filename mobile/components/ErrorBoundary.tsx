import React from 'react';
import { Text, View } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🚨 ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center bg-destructive p-5">
          <Text className="text-destructive-foreground text-lg mb-2.5 font-semibold">
            Something went wrong!
          </Text>
          <Text className="text-destructive-foreground text-sm text-center">
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text className="text-destructive-foreground text-xs mt-5 text-center opacity-80">
            Check the console for more details
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}
