# Zip Protocol for Catalyst Deployment

**Rule**: Whenever creating a zip file for deployment to Catalyst, DO NOT use standard Windows PowerShell `Compress-Archive`. It can cause unzip failures on the Catalyst Linux runtime due to platform-specific archiving metadata or backslash issues.

**Solution**: ALWAYS use the `bestzip` npm module.

### How to Zip

**For Backend**:
```bash
cd functions/get_crime_analytics
npx bestzip ../../backend.zip *
```

**For Frontend**:
```bash
cd client/dist
npx bestzip ../../frontend.zip *
```
