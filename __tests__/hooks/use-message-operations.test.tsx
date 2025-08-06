import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useRevertToMessage } from '@/hooks/use-message-operations';
import type { RevertToMessageRequest, RevertToMessageResponse } from '@/lib/types/chat';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockRevertResponse: RevertToMessageResponse = {
  success: true,
  reverted_to_commit: 'abc123def456',
  message: 'Reverted to commit abc123d',
};

describe('useRevertToMessage', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    require('@/hooks/use-toast').useToast.mockReturnValue({ toast: mockToast });
  });

  it('reverts to message successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockRevertResponse,
      }),
    });

    const { result } = renderHook(() => useRevertToMessage(123, 456), {
      wrapper: createWrapper(),
    });

    const revertData: RevertToMessageRequest = {
      message_id: 789,
      create_backup_commit: true,
    };

    await act(async () => {
      await result.current.mutateAsync(revertData);
    });

    expect(fetch).toHaveBeenCalledWith('/api/projects/123/chat-sessions/456/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(revertData),
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Reverted Successfully',
      description: 'Reverted to commit abc123d',
    });
  });

  it('handles revert error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Message not found',
    });

    const { result } = renderHook(() => useRevertToMessage(123, 456), {
      wrapper: createWrapper(),
    });

    const revertData: RevertToMessageRequest = {
      message_id: 999,
    };

    await act(async () => {
      try {
        await result.current.mutateAsync(revertData);
      } catch (error) {
        expect(error).toEqual(new Error('Message not found'));
      }
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Revert Failed',
      description: 'Message not found',
      variant: 'destructive',
    });
  });

  it('invalidates correct queries after successful revert', async () => {
    const queryClient = new QueryClient();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockRevertResponse,
      }),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRevertToMessage(123, 456), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ message_id: 789 });
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['chat-messages', 123, 456] });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['project-files', 123] });
  });
});