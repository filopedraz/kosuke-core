'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ClerkThemeProviderProps {
  children: ReactNode;
}

export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'var(--primary)',
          colorBackground: 'var(--background)',
          colorInputBackground: 'var(--input)',
          colorInputText: 'var(--foreground)',
          colorText: 'var(--foreground)',
          colorTextSecondary: 'var(--muted-foreground)',
          colorNeutral: 'var(--muted)',
          colorDanger: 'var(--destructive)',
          colorSuccess: 'var(--primary)',
          colorWarning: 'var(--secondary)',
          fontFamily: 'var(--font-geist-sans)',
          borderRadius: 'var(--radius-sm)',
        },
        elements: {
          // Main containers - preserve borders but remove gradients
          rootBox: {
            backgroundColor: 'var(--card)',
            backgroundImage: 'none',
            boxShadow: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          },
          main: {
            backgroundColor: 'none',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
          card: {
            backgroundColor: 'var(--card)',
            background: 'var(--card)',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
          // Form elements
          formButtonPrimary: {
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-foreground)',
            boxShadow: 'none',
            backgroundImage: 'none',
            border: 'none',
            '&:hover': {
              backgroundColor: 'oklch(from var(--primary) l c h / 0.9)',
              boxShadow: 'none',
            },
          },
          headerTitle: {
            color: 'var(--foreground)',
          },
          headerSubtitle: {
            color: 'var(--muted-foreground)',
          },
          socialButtonsBlockButton: {
            backgroundColor: 'var(--secondary)',
            color: 'var(--secondary-foreground)',
            border: '1px solid var(--border)',
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:hover': {
              backgroundColor: 'oklch(from var(--secondary) l c h / 0.8)',
              boxShadow: 'none',
            },
          },
          formFieldInput: {
            backgroundColor: 'var(--input)',
            borderColor: 'var(--border)',
            color: 'var(--foreground)',
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:focus': {
              borderColor: 'var(--ring)',
              boxShadow: '0 0 0 2px oklch(from var(--ring) l c h / 0.2)',
            },
          },
          formFieldLabel: {
            color: 'var(--foreground)',
          },
          dividerLine: {
            backgroundColor: 'var(--border)',
          },
          dividerText: {
            color: 'var(--muted-foreground)',
          },
          footer: {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          },
          footerActionLink: {
            color: 'var(--primary)',
            '&:hover': {
              color: 'oklch(from var(--primary) l c h / 0.8)',
            },
          },
          // OTP specific elements
          otpCodeFieldInput: {
            backgroundColor: 'var(--input)',
            borderColor: 'oklch(from var(--muted-foreground) l c h / 0.3)',
            borderWidth: '1.5px',
            color: 'var(--foreground)',
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:focus': {
              borderColor: 'var(--ring)',
              boxShadow: '0 0 0 2px oklch(from var(--ring) l c h / 0.2)',
            },
          },
          otpCodeField: {
            '& input': {
              backgroundColor: 'var(--input)',
              borderColor: 'oklch(from var(--muted-foreground) l c h / 0.3)',
              borderWidth: '1.5px',
              color: 'var(--foreground)',
              boxShadow: 'none',
              '&:focus': {
                borderColor: 'var(--ring)',
                boxShadow: '0 0 0 2px oklch(from var(--ring) l c h / 0.2)',
              },
            },
          },
          // Modal and popup elements
          modalContent: {
            backgroundColor: 'var(--background)',
            background: 'var(--background)',
            backgroundImage: 'none',
            border: '1px solid var(--border)',
            boxShadow: 'none',
          },
          modalCloseButton: {
            color: 'var(--muted-foreground)',
            '&:hover': {
              color: 'var(--foreground)',
            },
          },
          identityPreviewEditButton: {
            color: 'var(--primary)',
          },
          userButtonPopoverCard: {
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: 'none',
            backgroundImage: 'none',
          },
          userButtonPopoverActionButton: {
            color: 'var(--foreground)',
            '&:hover': {
              backgroundColor: 'var(--accent)',
            },
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
