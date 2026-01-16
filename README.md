# rmtrack
A web app that allows you to track one Royal Mail tracking ID and get updates as a notification in your browser as it goes through the Royal Mail network.

## Features

- ✅ Track Royal Mail packages using tracking ID
- ✅ Automatic tracking ID validation (format: AB123456789GB)
- ✅ Browser notifications for status updates
- ✅ Periodic checking every 15 minutes
- ✅ Automatic stop after delivery
- ✅ Tracking history
- ✅ Runs entirely in browser (no server required)

## Usage

1. Open `index.html` in a modern web browser
2. Enter your Royal Mail tracking ID (format: 2 letters + 9 digits + 2 letters, e.g., AB123456789GB)
3. Optionally enable browser notifications to get alerts when status changes
4. Click "Start Tracking"
5. The app will check for updates every 15 minutes
6. Once your package is delivered, tracking stops automatically

## Tracking ID Format

Royal Mail tracking IDs follow this format:
- 2 letters (e.g., AB)
- 9 digits (e.g., 123456789)
- 2 letters (e.g., GB)

Example: `AB123456789GB`

## How It Works

1. **Validation**: The app validates your tracking ID format before starting
2. **Periodic Checks**: Every 15 minutes, the app checks the tracking status
3. **Notifications**: If enabled and the status changes, you'll receive a browser notification
4. **Auto-Stop**: Once the package is marked as delivered, checking stops automatically
5. **Local Storage**: Your tracking data is stored in your browser's local storage

## Browser Compatibility

This app works in modern browsers that support:
- Web Notifications API
- Service Workers
- LocalStorage
- ES6 JavaScript

Tested on:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Privacy

All data is stored locally in your browser. No information is sent to external servers except when checking the Royal Mail tracking status (in a production version this would call the Royal Mail API).

## Development

This is a single-page application with no build process required. Simply open `index.html` in a browser to run.

### Files

- `index.html` - Main HTML structure
- `styles.css` - Styling and layout
- `app.js` - Application logic
- `service-worker.js` - Service worker for notifications and caching

## License

MIT License - see LICENSE file for details
