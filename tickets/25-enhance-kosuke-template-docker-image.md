# Ticket #25: Enhance kosuke-template Docker Image for Production Deployment

## 🎯 **Objective**

Update the kosuke-template Docker image to support production deployment and eliminate local filesystem dependencies in kosuke-core.

## 📋 **Current Issues**

- kosuke-core relies on local hardcoded path: `/Users/filippopedrazzini/Documents/Work.nosync/kosuke-template`
- Template copying happens in Next.js API (not production-ready)
- Each preview container runs `npm install` (slow startup)
- Cannot deploy to servers without template filesystem access

## 🏗️ **Required Changes**

### **1. Update Dockerfile Structure**

```dockerfile
FROM node:20-alpine
WORKDIR /template

# Copy template files to /template (not /app to avoid volume mount conflicts)
COPY . .
RUN npm install --production

# Create entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

WORKDIR /app
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
```

### **2. Create docker-entrypoint.sh**

```bash
#!/bin/sh
set -e

# Check if /app is empty (new project initialization)
if [ ! -f "/app/package.json" ]; then
  echo "🚀 Initializing new project from template..."

  # Copy template files to /app (mounted volume)
  cp -r /template/* /app/

  # Copy hidden files (like .env, .gitignore)
  cp -r /template/.* /app/ 2>/dev/null || true

  echo "✅ Project initialized with template files"
else
  echo "📁 Project files already exist, skipping template initialization"
fi

# Execute the command passed to docker run
exec "$@"
```

### **3. Environment Variable Support**

Add support for environment-based configuration:

- `TEMPLATE_VERSION` - for template versioning
- `SKIP_TEMPLATE_INIT` - to skip template copying if needed
- `DEV_MODE` - for development vs production behavior

### **4. Template Directory Structure**

Ensure the template includes:

- All necessary Next.js files
- Pre-configured package.json with dependencies
- Environment file templates
- Basic project structure

## 🎯 **Expected Benefits**

### **Performance**

- ✅ Faster container startup (no npm install needed)
- ✅ Pre-installed dependencies in image
- ✅ Reduced network calls during container creation

### **Deployment**

- ✅ Production-ready (no local filesystem dependencies)
- ✅ Portable across different environments
- ✅ Version-controlled template via Docker tags

### **Developer Experience**

- ✅ Consistent project initialization
- ✅ Editable files via volume mounts
- ✅ Simplified kosuke-core architecture

## 🔄 **Integration with kosuke-core**

After this change, kosuke-core will:

1. Remove `lib/fs/scaffold.ts` scaffolding logic
2. Remove `TEMPLATE_DIR` constant dependency
3. Remove `npm install` from Docker service command
4. Use default entrypoint in preview containers

### **Updated Docker Service Command**

```python
# Before
command=["sh", "-c", "npm install && npm run dev -- -H 0.0.0.0"]

# After
command=None  # Use default entrypoint + CMD
```

## 🧪 **Testing Checklist**

- [ ] New project initialization works correctly
- [ ] Existing project files are preserved
- [ ] Template files are properly copied
- [ ] Dependencies are pre-installed and working
- [ ] Development server starts successfully
- [ ] Volume mounting works with file editing
- [ ] Environment variables are properly handled
- [ ] Works in both development and production environments

## 📦 **Deliverables**

1. Updated Dockerfile with new structure
2. docker-entrypoint.sh script
3. Updated documentation for template usage
4. Version tag for the enhanced image
5. Testing instructions for kosuke-core integration

## 🔗 **Related**

- kosuke-core issue: Docker-in-Docker volume mounting fixes
- Production deployment requirements
- Template versioning and distribution strategy

## 📝 **Notes**

- This change maintains backward compatibility
- Template initialization only happens for empty directories
- Existing project workflows remain unchanged
- Performance improvement should be significant (no npm install per container)
