import path from 'path';
import { Project, Node, SyntaxKind, SourceFile } from 'ts-morph';

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
        // Add more specific paths to ensure all components and pages are found
        path.join(projectPath, '**/*.page.ts'),
        path.join(projectPath, '**/*.page.tsx'),
        path.join(projectPath, '**/page.ts'),
        path.join(projectPath, '**/page.tsx'),
        path.join(projectPath, '**/layout.ts'),
        path.join(projectPath, '**/layout.tsx'),
        path.join(projectPath, '**/*.component.ts'),
        path.join(projectPath, '**/*.component.tsx'),
        // Add direct path for root pages and components
        path.join(projectPath, '*.tsx'),
        path.join(projectPath, '*.ts'),
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

    console.log(
      `✅ Analyzed ${Object.keys(relationships).length} components, functions, and methods`
    );
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
  // Keep short path for context, and remove any numeric project ID prefixes
  const filePath = sourceFile
    .getFilePath()
    .split('/')
    .slice(-3)
    .join('/')
    .replace(/^\d+\//, ''); // Remove numeric prefix like "27/"

  const fileName = path.basename(filePath);

  // Check if this is a page file based on filename or path
  const isPageFile =
    filePath.includes('/app/') ||
    filePath.includes('/pages/') ||
    fileName === 'page.tsx' ||
    fileName === 'page.ts' ||
    fileName === 'layout.tsx' ||
    fileName === 'layout.ts' ||
    fileName.includes('.page.') ||
    /^(index|404|500)\.tsx?$/.test(fileName);

  // --- Process Function Declarations ---
  sourceFile.getFunctions().forEach(func => {
    const name = func.getName();
    if (!name) return;

    // Components can start with uppercase or have special suffixes in some frameworks
    const isComponent =
      /^[A-Z]/.test(name) ||
      name.endsWith('Component') ||
      name.endsWith('Page') ||
      name.endsWith('Layout');
    const isHook = name.startsWith('use');
    const isPage = isPageFile && (name === 'default' || name === 'Page' || name.endsWith('Page'));

    // Determine the most appropriate type
    const type: Relationship['type'] = isHook
      ? 'hook'
      : isPage
        ? 'component'
        : isComponent
          ? 'component'
          : 'function';

    if (!relationships[name]) {
      // Add check to avoid overwriting
      addRelationship(name, type, filePath, func, relationships);
    }
  });

  // --- Process Variable Declarations (Arrow Functions, forwardRef, memo, etc.) ---
  sourceFile.getVariableDeclarations().forEach(declaration => {
    const name = declaration.getName();
    if (!name) return;

    // Enhanced component detection
    const isComponent =
      /^[A-Z]/.test(name) ||
      name.endsWith('Component') ||
      name.includes('Page') ||
      name.includes('Layout');
    const isHook = name.startsWith('use');
    const isPage = isPageFile && (name === 'default' || name === 'Page' || name.endsWith('Page'));

    const initializer = declaration.getInitializer();

    // Determine if this is a React component
    let isReactComponent = false;

    if (initializer) {
      // Check if it returns JSX
      isReactComponent =
        initializer.getFullText().includes('return') &&
        (initializer.getFullText().includes('<') || initializer.getFullText().includes('jsx'));

      // Check if it's wrapped in React.memo, React.forwardRef etc.
      if (!isReactComponent && initializer.getKind() === SyntaxKind.CallExpression) {
        const callText = initializer.getText();
        isReactComponent =
          callText.includes('React.') ||
          callText.includes('memo(') ||
          callText.includes('forwardRef(');
      }
    }

    // Check if it's a component/hook or potentially a utility function assignment
    if (!relationships[name] && (isComponent || isHook || isPage || isReactComponent)) {
      const type = isHook
        ? 'hook'
        : isComponent || isPage || isReactComponent
          ? 'component'
          : 'function';
      // Use the initializer (if arrow function) or the declaration itself for analysis
      const nodeToAnalyze =
        initializer && Node.isFunctionLikeDeclaration(initializer) ? initializer : declaration;
      addRelationship(name, type, filePath, nodeToAnalyze, relationships);
    }
    // Future: Could add logic here for utility functions assigned to variables if needed
  });

  // Find Context providers
  findContextProviders(sourceFile, contextProviders);
}

/**
 * Adds or updates a relationship entry.
 */
function addRelationship(
  name: string,
  type: Relationship['type'],
  filePath: string,
  node: Node, // Node to analyze for uses, hooks, contexts
  relationships: Record<string, Relationship>
) {
  // Initialize if not exists
  if (!relationships[name]) {
    relationships[name] = {
      name,
      type,
      filePath,
      usedBy: [],
      uses: [],
      hooks: type === 'component' ? findHooksUsed(node) : undefined,
      contexts: type === 'component' ? findContextsUsed(node) : undefined,
    };
  }

  // Find function calls/identifiers to track dependencies (uses)
  // Check if the node has a body or initializer to search within
  const searchNode =
    Node.isBodyable(node) || Node.isBodied(node)
      ? node
      : Node.isVariableDeclaration(node)
        ? node.getInitializer()
        : undefined;

  if (searchNode) {
    searchNode.getDescendantsOfKind(SyntaxKind.Identifier).forEach(id => {
      // Simple check: Add if it's likely a function/hook/component name
      const idText = id.getText();
      // Avoid adding self-references or very common JS keywords/types
      if (
        idText !== name &&
        idText.match(/^(use|[A-Z])\w*$/) &&
        !['React', 'useState', 'useEffect', 'useContext'].includes(idText)
      ) {
        const usesSet = new Set(relationships[name].uses);
        if (!usesSet.has(idText)) {
          relationships[name].uses.push(idText);
        }
      }
    });
    // Also check explicit calls
    searchNode.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const calleeName = call.getExpression().getText();
      // Basic check for simple function calls
      if (!calleeName.includes('.') && !calleeName.includes('(') && calleeName !== name) {
        const usesSet = new Set(relationships[name].uses);
        if (!usesSet.has(calleeName)) {
          relationships[name].uses.push(calleeName);
        }
      }
    });
  }
}

/**
 * Find React hooks used within a component or hook
 */
function findHooksUsed(node: Node): string[] {
  const hooks: string[] = [];
  // Search within the relevant node (function body, variable initializer)
  const searchNode =
    Node.isBodyable(node) || Node.isBodied(node)
      ? node
      : Node.isVariableDeclaration(node)
        ? node.getInitializer()
        : undefined;

  if (searchNode) {
    searchNode.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
      const calleeName = call.getExpression().getText();
      // Improved check for hooks (potentially check import source too)
      if (
        calleeName.startsWith('use') &&
        !calleeName.includes('.') &&
        !hooks.includes(calleeName)
      ) {
        hooks.push(calleeName);
      }
    });
  }
  return hooks;
}

/**
 * Find Context usage within a component or hook
 */
function findContextsUsed(node: Node): string[] {
  const contexts: string[] = [];
  const searchNode =
    Node.isBodyable(node) || Node.isBodied(node)
      ? node
      : Node.isVariableDeclaration(node)
        ? node.getInitializer()
        : undefined;

  if (searchNode) {
    // Look for useContext calls
    searchNode.getDescendantsOfKind(SyntaxKind.CallExpression).forEach(call => {
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
  }
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
            while (
              currentNode &&
              !Node.isFunctionDeclaration(currentNode) &&
              !Node.isArrowFunction(currentNode)
            ) {
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
