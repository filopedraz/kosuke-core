import { describe, it, expect } from '@jest/globals';
import { extractMethodSignatures } from '../../../lib/llm/utils/context';

// Sample React file with docstrings to test extraction
const sampleReactFile = `
import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Hook to detect if the current viewport is mobile
 * @returns {boolean} True if the viewport is mobile
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
`;

// Sample component with forwardRef
const sampleAccordionComponent = `
'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn('border-b', className)} {...props} />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

export { Accordion, AccordionItem, AccordionTrigger };
`;

describe('extractMethodSignatures', () => {
  it('should extract function signatures and docstrings from TypeScript/React files', () => {
    // Run the function on our sample file
    const extension = '.tsx'; // Use .tsx for React TypeScript files
    const signatures = extractMethodSignatures(sampleReactFile, extension);

    // Print the actual signatures for debugging
    console.log('Extracted signatures:', signatures);

    // Verify the output
    expect(signatures).toBeDefined();
    expect(Array.isArray(signatures)).toBe(true);
    expect(signatures.length).toBeGreaterThan(0);

    // Verify the extracted signature includes the function declaration
    const expectedFunction = signatures.find((sig: string) => sig.includes('useIsMobile'));
    expect(expectedFunction).toBeDefined();

    if (expectedFunction) {
      // Verify it extracted the docstring
      expect(expectedFunction).toContain('Hook to detect if the current viewport is mobile');
      expect(expectedFunction).toContain('@returns {boolean} True if the viewport is mobile');

      // Verify it has the function signature with correct format
      expect(expectedFunction).toMatch(/useIsMobile\(\)/);
    }
  });

  it('should handle files with no docstrings', () => {
    // Sample file without docstrings
    const sampleWithoutDocstrings = `
    import * as React from 'react';
    
    const MOBILE_BREAKPOINT = 768;
    
    export function useIsMobile() {
      const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
      
      React.useEffect(() => {
        const mql = window.matchMedia(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`);
        const onChange = () => {
          setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        mql.addEventListener('change', onChange);
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        return () => mql.removeEventListener('change', onChange);
      }, []);
      
      return !!isMobile;
    }
    `;

    const signatures = extractMethodSignatures(sampleWithoutDocstrings, '.tsx');
    console.log('Signatures without docstrings:', signatures);

    expect(signatures.length).toBeGreaterThan(0);
    const methodSignature = signatures.find((sig: string) => sig.includes('useIsMobile'));
    expect(methodSignature).toBeDefined();

    if (methodSignature) {
      // Should contain just the function name and parameters
      expect(methodSignature).toBe('useIsMobile()');
    }
  });

  it('should handle React hook patterns correctly', () => {
    // Sample with a React hook implementation
    const hookSample = `
    import * as React from 'react';
    
    /**
     * Custom hook for managing form state
     * @param {object} initialState - Initial form values
     * @returns {object} Form state and handlers
     */
    export const useForm = (initialState = {}) => {
      const [values, setValues] = React.useState(initialState);
      
      const handleChange = (e) => {
        setValues({
          ...values,
          [e.target.name]: e.target.value
        });
      };
      
      const reset = () => {
        setValues(initialState);
      };
      
      return { values, handleChange, reset };
    };
    `;

    const signatures = extractMethodSignatures(hookSample, '.tsx');
    console.log('Hook signatures:', signatures);

    expect(signatures.length).toBeGreaterThan(0);
    const hookSignature = signatures.find((sig: string) => sig.includes('useForm'));
    expect(hookSignature).toBeDefined();

    if (hookSignature) {
      // Verify docstring content
      expect(hookSignature).toContain('Custom hook for managing form state');
      expect(hookSignature).toContain('@param {object} initialState');
      expect(hookSignature).toContain('@returns {object} Form state and handlers');

      // Verify function signature format - should include parameters
      expect(hookSignature).toMatch(/useForm\(initialState = \{\}\)/);
    }

    // Should also extract handleChange and reset functions
    const handleChangeSignature = signatures.find((sig: string) => sig.includes('handleChange'));
    expect(handleChangeSignature).toBeDefined();
    if (handleChangeSignature) {
      expect(handleChangeSignature).toBe('handleChange(e)');
    }

    const resetSignature = signatures.find((sig: string) => sig.includes('reset'));
    expect(resetSignature).toBeDefined();
    if (resetSignature) {
      expect(resetSignature).toBe('reset()');
    }
  });

  it('should extract React components with forwardRef pattern', () => {
    const signatures = extractMethodSignatures(sampleAccordionComponent, '.tsx');
    console.log('Component signatures:', signatures);

    // Verify we found signatures
    expect(signatures.length).toBeGreaterThan(0);

    // Should identify the Accordion component
    const accordionSignature = signatures.find((sig: string) => sig.startsWith('Accordion('));
    expect(accordionSignature).toBeDefined();
    if (accordionSignature) {
      expect(accordionSignature).toBe('Accordion(props)');
    }

    // Should identify forwardRef components with a simple format
    const accordionItemSignature = signatures.find((sig: string) =>
      sig.startsWith('AccordionItem(')
    );
    expect(accordionItemSignature).toBeDefined();
    if (accordionItemSignature) {
      // We're using a simplified format for all components
      expect(accordionItemSignature).toBe('AccordionItem(props)');
    }

    const accordionTriggerSignature = signatures.find((sig: string) =>
      sig.startsWith('AccordionTrigger(')
    );
    expect(accordionTriggerSignature).toBeDefined();
    if (accordionTriggerSignature) {
      expect(accordionTriggerSignature).toBe('AccordionTrigger(props)');
    }
  });
});
