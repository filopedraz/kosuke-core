import path from 'path';
import * as fs from 'fs';
import { withCustomConfig, ParserOptions, ComponentDoc } from 'react-docgen-typescript';

/**
 * Component prop documentation
 */
export interface PropDoc {
  name: string;
  type: string;
  defaultValue: string | null;
  required: boolean;
  description: string;
}

/**
 * Component documentation with props
 */
export interface ComponentDocumentation {
  name: string;
  filePath: string;
  description: string;
  props: PropDoc[];
  displayName?: string;
  importPath?: string;
}

/**
 * Extract component documentation using react-docgen-typescript
 */
export async function extractComponentDocs(
  projectPath: string,
  filePaths: string[]
): Promise<Record<string, ComponentDocumentation>> {
  try {
    console.log(`🔬 Extracting component documentation for ${filePaths.length} files`);
    
    // Configure parser options
    const parserOptions: ParserOptions = {
      propFilter: {
        skipPropsWithoutDoc: false,
        skipPropsWithName: ['ref', 'key', 'className', 'style', 'children'],
      },
      savePropValueAsString: true,
    };
    
    // Initialize parser with project's tsconfig
    let parser;
    const tsconfigPath = path.join(projectPath, 'tsconfig.json');
    
    if (fs.existsSync(tsconfigPath)) {
      parser = withCustomConfig(tsconfigPath, parserOptions);
    } else {
      // Fallback to a default parser if tsconfig doesn't exist
      parser = withCustomConfig('', parserOptions);
    }
    
    // Process component files
    const componentDocs: Record<string, ComponentDocumentation> = {};
    
    for (const filePath of filePaths) {
      const fullPath = path.join(projectPath, filePath);
      
      try {
        const docs = parser.parse(fullPath);
        
        docs.forEach(doc => {
          const componentName = doc.displayName;
          
          componentDocs[componentName] = {
            name: componentName,
            filePath,
            description: getComponentDescription(doc),
            props: extractPropDocs(doc),
            displayName: doc.displayName,
            importPath: `./${path.relative(projectPath, fullPath)}`,
          };
        });
      } catch (error) {
        console.warn(`⚠️ Could not parse component documentation for ${filePath}:`, error);
      }
    }
    
    console.log(`✅ Extracted documentation for ${Object.keys(componentDocs).length} components`);
    return componentDocs;
  } catch (error) {
    console.error('❌ Error extracting component documentation:', error);
    return {};
  }
}

/**
 * Extract documentation for component props
 */
function extractPropDocs(componentDoc: ComponentDoc): PropDoc[] {
  const props: PropDoc[] = [];
  
  for (const [propName, propData] of Object.entries(componentDoc.props)) {
    props.push({
      name: propName,
      type: propData.type.name,
      defaultValue: propData.defaultValue ? String(propData.defaultValue.value) : null,
      required: propData.required,
      description: propData.description,
    });
  }
  
  return props;
}

/**
 * Get component description from documentation
 */
function getComponentDescription(componentDoc: ComponentDoc): string {
  return componentDoc.description || '';
} 