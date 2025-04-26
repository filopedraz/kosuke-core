import path from 'path';
import { Project, Node, SyntaxKind, SourceFile, FunctionDeclaration, ArrowFunction, MethodDeclaration } from 'ts-morph';

/**
 * Relationship between components, functions, and methods
 */
export interface Relationship {
  name: string;
  type: 'component' | 'function' | 'hook' | 'method';
  filePath: string;
  usedBy: string[];
  uses: string[];
  hooks?: string[];
  contexts?: string[];
}

/**
 * Analyze TypeScript code using ts-morph to extract relationships
 */
export async function analyzeTsWithMorph(projectPath: string): Promise<{
  relationships: Record<string, Relationship>;
  contextProviders: Record<string, string[]>;
}> {
  try {
    console.log(`🔬 Analyzing TypeScript code with ts-morph in ${projectPath}`);
    
    // Initialize project
    const project = new Project({
      tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });
    
    // Add source files if tsconfig isn't available
    try {
      project.getSourceFiles();
    } catch {
      console.warn('Failed to load tsconfig, adding source files manually');
      project.addSourceFilesAtPaths([
        path.join(projectPath, 'src/**/*.ts'),
        path.join(projectPath, 'src/**/*.tsx'),
        path.join(projectPath, 'app/**/*.ts'),
        path.join(projectPath, 'app/**/*.tsx'),
        path.join(projectPath, 'components/**/*.ts'),
        path.join(projectPath, 'components/**/*.tsx'),
        path.join(projectPath, 'lib/**/*.ts'),
        path.join(projectPath, 'lib/**/*.tsx'),
        path.join(projectPath, 'pages/**/*.ts'),
        path.join(projectPath, 'pages/**/*.tsx'),
      ]);
    }
    
    const sourceFiles = project.getSourceFiles();
    console.log(`📊 Found ${sourceFiles.length} TypeScript source files`);
    
    const relationships: Record<string, Relationship> = {};
    const contextProviders: Record<string, string[]> = {};
    
    // Process each source file
    for (const sourceFile of sourceFiles) {
      processSourceFile(sourceFile, relationships, contextProviders);
    }
    
    // Post-process relationships to connect usedBy relationships
    for (const [name, relationship] of Object.entries(relationships)) {
      for (const usedItem of relationship.uses) {
        if (relationships[usedItem]) {
          if (!relationships[usedItem].usedBy.includes(name)) {
            relationships[usedItem].usedBy.push(name);
          }
        }
      }
    }
    
    console.log(`✅ Analyzed ${Object.keys(relationships).length} components, functions, and methods`);
    console.log(`✅ Found ${Object.keys(contextProviders).length} Context providers`);
    
    return { relationships, contextProviders };
  } catch (error) {
    console.error('❌ Error analyzing TypeScript code:', error);
    return { relationships: {}, contextProviders: {} };
  }
}

/**
 * Process a source file to extract relationships
 */
function processSourceFile(
  sourceFile: SourceFile,
  relationships: Record<string, Relationship>,
  contextProviders: Record<string, string[]>
) {
  const filePath = sourceFile.getFilePath().split('/').slice(-3).join('/');
  
  // Find React components (function components)
  sourceFile.getFunctions().forEach(func => {
    const name = func.getName();
    if (!name) return;
    
    // Check if it's likely a React component (starts with uppercase or is a hook)
    const isComponent = /^[A-Z]/.test(name);
    const isHook = name.startsWith('use');
    
    if (isComponent || isHook) {
      const type = isComponent ? 'component' : 'hook';
      
      // Initialize relationship
      relationships[name] = {
        name,
        type,
        filePath,
        usedBy: [],
        uses: [],
        hooks: isComponent ? findHooksUsed(func) : undefined,
        contexts: isComponent ? findContextsUsed(func) : undefined,
      };
      
      // Find function calls to track dependencies
      func.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
        const calleeName = call.getExpression().getText();
        if (!calleeName.includes('.') && !calleeName.includes('(')) {
          if (!relationships[name].uses.includes(calleeName)) {
            relationships[name].uses.push(calleeName);
          }
        }
      });
    }
  });
  
  // Process arrow function components
  processArrowFunctions(sourceFile, relationships, filePath);
  
  // Find Context providers
  findContextProviders(sourceFile, contextProviders);
}

/**
 * Process arrow functions that might be React components or hooks
 */
function processArrowFunctions(
  sourceFile: SourceFile,
  relationships: Record<string, Relationship>,
  filePath: string
) {
  // Find variable declarations with arrow functions
  sourceFile.getVariableDeclarations().forEach(declaration => {
    const name = declaration.getName();
    const initializer = declaration.getInitializer();
    
    if (initializer && Node.isArrowFunction(initializer)) {
      // Check if it's likely a React component or hook
      const isComponent = /^[A-Z]/.test(name);
      const isHook = name.startsWith('use');
      
      if (isComponent || isHook) {
        const type = isComponent ? 'component' : 'hook';
        
        // Initialize relationship
        relationships[name] = {
          name,
          type,
          filePath,
          usedBy: [],
          uses: [],
          hooks: isComponent ? findHooksUsed(initializer) : undefined,
          contexts: isComponent ? findContextsUsed(initializer) : undefined,
        };
        
        // Find function calls to track dependencies
        initializer.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
          const calleeName = call.getExpression().getText();
          // Only include simple function calls, not method calls or nested calls
          if (!calleeName.includes('.') && !calleeName.includes('(')) {
            if (!relationships[name].uses.includes(calleeName)) {
              relationships[name].uses.push(calleeName);
            }
          }
        });
      }
    }
  });
}

/**
 * Find React hooks used within a component
 */
function findHooksUsed(node: FunctionDeclaration | ArrowFunction | MethodDeclaration): string[] {
  const hooks: string[] = [];
  
  node.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const calleeName = call.getExpression().getText();
    if (calleeName.startsWith('use') && !calleeName.includes('.')) {
      if (!hooks.includes(calleeName)) {
        hooks.push(calleeName);
      }
    }
  });
  
  return hooks;
}

/**
 * Find Context usage within a component
 */
function findContextsUsed(node: FunctionDeclaration | ArrowFunction | MethodDeclaration): string[] {
  const contexts: string[] = [];
  
  // Look for useContext calls
  node.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const callee = call.getExpression().getText();
    if (callee === 'useContext') {
      const args = call.getArguments();
      if (args.length > 0) {
        const contextName = args[0].getText();
        if (!contexts.includes(contextName)) {
          contexts.push(contextName);
        }
      }
    }
  });
  
  return contexts;
}

/**
 * Find Context providers in a source file
 */
function findContextProviders(sourceFile: SourceFile, contextProviders: Record<string, string[]>) {
  // Look for createContext calls
  sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
    const callee = call.getExpression().getText();
    if (callee === 'createContext') {
      // Find the variable name that's assigned the context
      const parent = call.getParent();
      if (parent && Node.isVariableDeclaration(parent)) {
        const contextName = parent.getName();
        contextProviders[contextName] = [];
        
        // Find components that use this context's Provider
        sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement).forEach(jsx => {
          const openingElement = jsx.getOpeningElement();
          const tagName = openingElement.getTagNameNode().getText();
          
          if (tagName === `${contextName}.Provider`) {
            // Try to find the component this Provider is in
            // Cast to Node to avoid type issues
            let currentNode: Node | undefined = jsx;
            
            // Make sure we have a node before proceeding
            while (currentNode && 
                  !Node.isFunctionDeclaration(currentNode) && 
                  !Node.isArrowFunction(currentNode)) {
              currentNode = currentNode.getParent();
            }
            
            if (currentNode) {
              let componentName = '';
              if (Node.isFunctionDeclaration(currentNode)) {
                componentName = currentNode.getName() || '';
              } else if (Node.isArrowFunction(currentNode)) {
                const parent = currentNode.getParent();
                if (parent && Node.isVariableDeclaration(parent)) {
                  componentName = parent.getName();
                }
              }
              
              if (componentName && !contextProviders[contextName].includes(componentName)) {
                contextProviders[contextName].push(componentName);
              }
            }
          }
        });
      }
    }
  });
} 