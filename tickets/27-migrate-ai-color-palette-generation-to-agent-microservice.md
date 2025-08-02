# Ticket #27: Migrate AI Color Palette Generation to Agent Microservice

## Overview

During the build error fixes in PR #XXX, the `generateColorPalette` and `applyColorPalette` functions in `lib/llm/brand/colorPalette.ts` were replaced with placeholder implementations that return mock data. The original implementation contained sophisticated AI-powered color generation logic that needs to be migrated to the agent microservice.

## Problem Statement

The current implementation of color palette generation is a basic mock that returns hardcoded colors:

```typescript
// Current mock implementation
const mockColors = [
  { name: '--primary', value: 'hsl(210, 100%, 50%)', description: 'Primary brand color' },
  { name: '--secondary', value: 'hsl(300, 100%, 50%)', description: 'Secondary accent color' },
  // ... more hardcoded colors
];
```

This is a significant regression from the previous implementation which included:

1. **Project Content Analysis**: Reading and analyzing project files (page.tsx, layout.tsx, etc.)
2. **Existing Color Extraction**: Fetching current CSS variables from the project
3. **Keyword-Based Generation**: Using user-provided keywords to guide color palette creation
4. **AI/LLM Integration**: Leveraging AI models to generate contextually appropriate colors
5. **Smart CSS Application**: Intelligently applying generated colors to project stylesheets

## Original Implementation Details

### What Was Working Before

Based on `app/api/projects/[id]/branding/generate-palette/route.ts`, the original system:

1. **Analyzed Project Structure**:

   ```typescript
   const possiblePaths = [
     path.join(projectDir, 'app', 'page.tsx'),
     path.join(projectDir, 'app', 'page.jsx'),
     path.join(projectDir, 'app', 'index.tsx'),
     path.join(projectDir, 'app', 'index.jsx'),
     path.join(projectDir, 'pages', 'index.tsx'),
     path.join(projectDir, 'pages', 'index.jsx'),
   ];
   ```

2. **Extracted Project Context**:
   - Read homepage content for semantic analysis
   - Fallback to layout files if homepage not found
   - Analyzed existing CSS variables and color usage

3. **Integrated with User Input**:
   - Accepted keywords from user (e.g., "professional", "modern", "healthcare")
   - Considered existing brand colors to maintain consistency

4. **Called AI Service**:

   ```typescript
   const paletteResult = await generateColorPalette(
     projectId,
     existingColors,
     homePageContent,
     keywords
   );
   ```

5. **Applied Results Intelligently**:
   - Updated CSS files with new color variables
   - Maintained light/dark theme compatibility
   - Preserved existing non-color CSS rules

### Integration Points

The color generation was integrated with:

- **Brand Guidelines UI** (`app/(logged-in)/projects/[id]/components/brand/brand-guidelines.tsx`)
- **Color Palette Modal** (`app/(logged-in)/projects/[id]/components/brand/color-palette-modal.tsx`)
- **CSS Variable Management** (`app/api/projects/[id]/branding/colors/route.ts`)

## Migration Plan

### Phase 1: Agent Service Integration

1. **Create Agent Endpoint**: `POST /projects/{project_id}/branding/generate-palette`

   ```python
   # agent/app/api/routes/branding.py
   @router.post("/projects/{project_id}/branding/generate-palette")
   async def generate_color_palette(
       project_id: int,
       request: ColorPaletteRequest
   ) -> ColorPaletteResponse:
       # Implementation with LLM integration
   ```

2. **Define Request/Response Models**:

   ```python
   class ColorPaletteRequest(BaseModel):
       keywords: str = ""
       existing_colors: List[ColorVariable] = []
       project_content: str = ""
       apply_immediately: bool = False

   class ColorPaletteResponse(BaseModel):
       success: bool
       colors: List[ColorVariable]
       message: str = ""
       applied: bool = False
   ```

3. **Implement Project Analysis**:
   - Use existing `FileSystemService` to read project files
   - Analyze component structure and content
   - Extract semantic meaning from code and comments

4. **LLM Integration**:
   - Use OpenAI/Anthropic API for color generation
   - Create specialized prompts for color palette generation
   - Consider accessibility and contrast requirements

### Phase 2: NextJS Integration

1. **Update NextJS Route**:

   ```typescript
   // app/api/projects/[id]/branding/generate-palette/route.ts
   export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
     // Proxy request to agent microservice
     const response = await fetch(
       `${AGENT_SERVICE_URL}/projects/${projectId}/branding/generate-palette`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(requestData),
       }
     );

     return NextResponse.json(await response.json());
   }
   ```

2. **Maintain Existing API Contract**:
   - Keep same URL structure: `/api/projects/[id]/branding/generate-palette`
   - Preserve query parameters: `?apply=true/false`
   - Maintain response format for frontend compatibility

3. **Update Type Definitions**:

   ```typescript
   // lib/types/branding.ts
   export interface ColorPaletteResult {
     success: boolean;
     message?: string;
     colors?: ColorVariable[];
     applied?: boolean;
   }

   export interface ColorVariable {
     name: string;
     value: string;
     description?: string;
     category?: 'primary' | 'secondary' | 'neutral' | 'semantic';
   }
   ```

### Phase 3: Enhanced Features

1. **Smart Color Analysis**:
   - Analyze existing brand assets (logos, images)
   - Extract dominant colors from uploaded images
   - Consider industry-specific color psychology

2. **Advanced CSS Integration**:
   - Support for CSS custom properties
   - Dark/light theme generation
   - Accessibility compliance (WCAG contrast ratios)

3. **Palette Variations**:
   - Generate multiple palette options
   - Provide color harmony rules (complementary, triadic, etc.)
   - Support for brand color extensions (tints, shades, tones)

## Implementation Tasks

### Backend (Agent Service)

- [ ] Create `ColorPaletteService` class
- [ ] Implement LLM prompt engineering for color generation
- [ ] Add project content analysis utilities
- [ ] Create branding API routes
- [ ] Add comprehensive error handling
- [ ] Write unit tests for color generation logic

### Frontend (NextJS)

- [ ] Update `lib/llm/brand/colorPalette.ts` to proxy to agent
- [ ] Maintain backward compatibility with existing UI components
- [ ] Add loading states and error handling
- [ ] Update type definitions
- [ ] Test integration with brand guidelines UI

### Testing

- [ ] Unit tests for agent color generation
- [ ] Integration tests for NextJS proxy
- [ ] E2E tests for complete color palette workflow
- [ ] Performance tests for large projects
- [ ] Accessibility compliance testing

## Success Criteria

1. **Functional Parity**: New implementation matches or exceeds original functionality
2. **Performance**: Color generation completes within 10 seconds for typical projects
3. **Quality**: Generated palettes are contextually appropriate and accessible
4. **Integration**: Seamless experience from brand guidelines UI
5. **Reliability**: 99%+ success rate for color generation requests

## Technical Considerations

### LLM Integration

- **Model Selection**: GPT-4 or Claude for best color reasoning capabilities
- **Prompt Engineering**: Specific prompts for color theory and accessibility
- **Rate Limiting**: Handle API quotas and implement fallbacks
- **Cost Management**: Optimize token usage for cost efficiency

### File System Access

- **Security**: Ensure safe file reading within project boundaries
- **Performance**: Cache file analysis results to avoid repeated reads
- **Scalability**: Handle large projects efficiently

### CSS Manipulation

- **Parser**: Robust CSS parsing and modification
- **Preservation**: Maintain existing styles and formatting
- **Validation**: Ensure generated CSS is valid and compatible

## Dependencies

- Agent microservice architecture (existing)
- File system service in agent (existing)
- LLM API integration (needs implementation)
- CSS parsing utilities (needs implementation)

## Timeline

- **Week 1**: Agent service foundation and LLM integration
- **Week 2**: NextJS proxy implementation and testing
- **Week 3**: UI integration and comprehensive testing
- **Week 4**: Performance optimization and documentation

## References

- Original implementation: `app/api/projects/[id]/branding/generate-palette/route.ts`
- Brand guidelines UI: `app/(logged-in)/projects/[id]/components/brand/brand-guidelines.tsx`
- Color management: `app/api/projects/[id]/branding/colors/route.ts`
- Agent architecture: `agent/app/api/routes/`
