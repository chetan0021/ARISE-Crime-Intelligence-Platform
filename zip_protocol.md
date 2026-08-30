# Catalyst Zip Deployment Protocol

**Rule**: Whenever creating a zip file for deployment to Zoho Catalyst, DO NOT use standard Windows PowerShell `Compress-Archive` or right-click "Send to > Compressed (zipped) folder". These methods create zip files that are known to fail to extract (`unzip -o` Error: Command failed) on the Catalyst Linux runtime due to platform-specific archiving metadata or backslash path separators.

**Solution**: ALWAYS use the `bestzip` npm module which creates 100% Linux-compatible archives.

## How to Zip using bestzip

**For the Backend (get_crime_analytics)**:
```bash
cd functions/get_crime_analytics
npx bestzip ../../backend.zip *
```

**For the Frontend (client)**:
```bash
cd client/dist
npx bestzip ../../frontend.zip *
```
