# Version Stamp System

This system automatically adds build time and version information to your application.

## Features

- **Automatic Build Time**: Shows when the application was compiled
- **Version Tracking**: Displays the current version from package.json
- **Consistent Display**: Shows on both login page and all other pages

## How It Works

### 1. Build Time Environment Variables
The `vite.config.js` automatically sets:
- `__BUILD_TIME__`: ISO 8601 timestamp of when the build started
- `__BUILD_VERSION__`: Version from package.json

### 2. VersionStamp Component
Located at `src/components/VersionStamp.jsx`, this component:
- Displays the build version and date
- Formats the date as DD/MM/YYYY HH:MM:SS
- Handles errors gracefully

### 3. Integration Points
- **Login Page**: Shows version stamp below the login form
- **Layout**: Shows version stamp in footer on all pages

## Usage

### For Development
```bash
npm run dev
```
Shows current timestamp when the dev server starts.

### For Production Build
```bash
npm run build
```
Shows the exact time when the build command was executed.

### For Versioned Build
```bash
npm run build:stamp
```
Automatically updates package.json version with timestamp and then builds.

## Version Format

The version stamp displays:
- **Version**: From package.json (e.g., "2025.08.26.1930")
- **Build Date**: DD/MM/YYYY HH:MM:SS format

## Customization

You can customize the VersionStamp component by:
- Changing the date format in `formatBuildTime` function
- Modifying the styling classes
- Adding additional build information

## Example Output

```
Version: 2025.08.26.1930
Build Date: 26/08/2025 19:30:45
```

## Notes

- Build time is captured when Vite starts building
- Version is automatically updated when using `build:stamp`
- The component gracefully handles missing environment variables
- All dates are displayed in DD/MM/YYYY format for user-friendly reading
