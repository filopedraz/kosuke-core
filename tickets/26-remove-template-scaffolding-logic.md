# Ticket #26: Remove Template Scaffolding Logic (Depends on #25)

## 🎯 **Objective**

Remove local filesystem template scaffolding logic from kosuke-core and migrate to Docker image-based template initialization.

## 📋 **Dependencies**

- ✅ Ticket #25: Enhanced kosuke-template Docker image must be completed first
- ✅ New kosuke-template image must be published and available

## 🗑️ **Files to Remove/Modify**

### **1. Remove Scaffolding Module**

```bash
# Delete the entire scaffolding system
rm lib/fs/scaffold.ts
```

### **2. Update Project Actions**

```typescript
// lib/actions/project.ts
// Remove scaffolding import and calls:
- import { scaffoldProject } from '@/lib/fs/scaffold';
- await scaffoldProject(project.id, project.name, {
-   additionalDependencies: {},
- });
```

### **3. Update Constants**

```typescript
// lib/constants.ts
// Remove template directory constant:
- export const TEMPLATE_DIR = process.env.TEMPLATE_DIR || '/Users/filippopedrazzini/Documents/Work.nosync/kosuke-template';
```

### **4. Update File Operations**

```typescript
// lib/fs/operations.ts
// Remove any template-related operations if they exist
```

## ✅ **Updated Project Creation Flow**

### **Before (Current)**

```
1. Next.js API creates project in DB
2. scaffoldProject() copies files from local template
3. Files copied to ./projects/[id]/
4. Agent starts container with npm install
5. Container runs npm install + dev server
```

### **After (New)**

```
1. Next.js API creates project in DB
2. Agent starts enhanced template container
3. Container detects empty /app, copies template files
4. Container starts dev server (deps pre-installed)
```

## 🚀 **Performance Improvements**

| Metric                | Before                       | After                         |
| --------------------- | ---------------------------- | ----------------------------- |
| **Project Creation**  | ~2-3 seconds (file copying)  | ~100ms (DB only)              |
| **Container Startup** | ~30-60 seconds (npm install) | ~5-10 seconds (pre-installed) |
| **Template Updates**  | Manual file changes          | Docker image tags             |
| **Production Ready**  | ❌ Local paths               | ✅ Portable                   |

## 🔧 **Code Changes Required**

### **1. Simplified Project Creation**

```typescript
// lib/actions/project.ts
export async function createProject(prompt: string, name?: string) {
  // Create project in database
  const project = await dbCreateProject({
    name: name || generateProjectName(prompt),
    description: prompt,
    userId: session.user.id,
    createdBy: session.user.id,
  });

  // Start preview directly (no scaffolding needed)
  fetch(`${agentUrl}/api/preview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: project.id,
      env_vars: {},
    }),
  });

  return project;
}
```

### **2. Update Agent Configuration**

```python
# agent/app/utils/config.py
# Remove projects_dir if no longer needed for scaffolding
```

### **3. Update Docker Service**

Already updated in this PR:

```python
command=None,  # Use default entrypoint + CMD from image
```

## 🧪 **Testing Plan**

### **Before Deployment**

- [ ] Verify enhanced kosuke-template image is published
- [ ] Test new image with existing projects (should preserve files)
- [ ] Test new image with empty directories (should initialize template)

### **After Deployment**

- [ ] Create new project and verify template initialization
- [ ] Verify existing projects continue working
- [ ] Confirm performance improvements
- [ ] Test in production environment

## 🔄 **Migration Strategy**

### **Phase 1: Preparation**

1. Enhanced template image ready and tested
2. Update kosuke-core Docker service (already done)
3. Test with new image before removing scaffolding

### **Phase 2: Cleanup**

1. Remove scaffolding logic
2. Update project creation flow
3. Remove unused constants and imports

### **Phase 3: Verification**

1. Test end-to-end project creation
2. Verify no regressions
3. Monitor performance improvements

## 📝 **Breaking Changes**

- None - this is an internal refactoring
- Existing projects continue working unchanged
- Project creation API remains the same

## 🔗 **Related Issues**

- Ticket #25: Enhanced kosuke-template Docker image
- Docker-in-Docker volume mounting fixes
- Production deployment readiness

## 🎯 **Success Criteria**

- [ ] No local filesystem dependencies
- [ ] Faster project creation (no file copying)
- [ ] Faster container startup (no npm install)
- [ ] Production deployment ready
- [ ] Backward compatibility maintained
