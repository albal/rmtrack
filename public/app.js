// Royal Mail Tracking App - Cloudflare Workers Version
class RoyalMailTracker {
    constructor() {
        this.trackingData = null;
        this.checkInterval = null;
        this.CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
        this.API_BASE = '/api';
        this.init();
    }

    init() {
        // Load existing tracking data from localStorage (for session persistence)
        this.loadLocalSession();
        
        // Set up event listeners
        document.getElementById('addTrackingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTracking();
        });

        document.getElementById('stopTrackingBtn').addEventListener('click', () => {
            this.stopTracking();
        });

        // Register service worker for notifications
        this.registerServiceWorker();

        // If we have tracking data, resume tracking
        if (this.trackingData && !this.trackingData.delivered) {
            this.showTrackingStatus();
            this.loadFromAPI();
            this.startPeriodicCheck();
        }
    }

    /**
     * Validate Royal Mail tracking ID format
     * Format: 2 letters + 9 digits + 2 letters (e.g., AB123456789GB)
     */
    validateTrackingId(trackingId) {
        const cleanId = trackingId.trim().toUpperCase();
        const royalMailPattern = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
        return royalMailPattern.test(cleanId);
    }

    async handleAddTracking() {
        const trackingIdInput = document.getElementById('trackingId');
        const enableNotifications = document.getElementById('enableNotifications').checked;
        const errorDiv = document.getElementById('validationError');
        
        const trackingId = trackingIdInput.value.trim().toUpperCase();

        // Validate tracking ID
        if (!this.validateTrackingId(trackingId)) {
            errorDiv.textContent = 'Invalid tracking ID format. Please use format: AB123456789GB (2 letters + 9 digits + 2 letters)';
            errorDiv.style.display = 'block';
            return;
        }

        errorDiv.style.display = 'none';

        // Request notification permission if enabled
        if (enableNotifications) {
            const permission = await this.requestNotificationPermission();
            if (permission !== 'granted') {
                errorDiv.textContent = 'Notification permission denied. You can still track without notifications.';
                errorDiv.style.display = 'block';
            }
        }

        try {
            // Call API to add tracking
            const response = await fetch(`${this.API_BASE}/tracking`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    trackingId: trackingId,
                    notificationsEnabled: enableNotifications && Notification.permission === 'granted'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                errorDiv.textContent = data.error || 'Failed to add tracking';
                errorDiv.style.display = 'block';
                return;
            }

            // Initialize local tracking data
            this.trackingData = {
                trackingId: data.trackingId,
                notificationsEnabled: data.notificationsEnabled,
                startedAt: new Date().toISOString(),
                lastChecked: new Date().toISOString(),
                lastStatus: data.status,
                history: [{ status: data.status, timestamp: new Date().toISOString() }],
                delivered: data.delivered
            };

            this.saveLocalSession();
            this.showTrackingStatus();
            
            // Load full data from API
            await this.loadFromAPI();
            
            // Start periodic checking
            this.startPeriodicCheck();

            // Clear form
            trackingIdInput.value = '';
            document.getElementById('enableNotifications').checked = false;
        } catch (error) {
            console.error('Error adding tracking:', error);
            errorDiv.textContent = 'Failed to connect to server. Please try again.';
            errorDiv.style.display = 'block';
        }
    }

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return 'denied';
        }

        if (Notification.permission === 'granted') {
            return 'granted';
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission;
        }

        return Notification.permission;
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    showTrackingStatus() {
        document.getElementById('trackingForm').style.display = 'none';
        document.getElementById('trackingStatus').style.display = 'block';
        
        this.updateStatusDisplay();
    }

    hideTrackingStatus() {
        document.getElementById('trackingForm').style.display = 'block';
        document.getElementById('trackingStatus').style.display = 'none';
    }

    updateStatusDisplay() {
        if (!this.trackingData) return;

        document.getElementById('currentTrackingId').textContent = this.trackingData.trackingId;
        document.getElementById('notificationStatus').textContent = 
            this.trackingData.notificationsEnabled ? '✓ Enabled' : '✗ Disabled';

        if (this.trackingData.lastChecked) {
            const lastUpdate = new Date(this.trackingData.lastChecked);
            document.getElementById('lastUpdate').textContent = this.formatDateTime(lastUpdate);
        }

        if (this.trackingData.lastStatus) {
            document.getElementById('currentStatus').textContent = this.trackingData.lastStatus;
        }

        // Update status badge
        const badge = document.getElementById('statusBadge');
        if (this.trackingData.delivered) {
            badge.textContent = 'Delivered';
            badge.className = 'status-badge delivered';
            document.getElementById('nextCheck').textContent = 'Tracking complete';
        } else {
            badge.textContent = 'In Transit';
            badge.className = 'status-badge in-transit';
            this.updateNextCheckTime();
        }

        // Update history
        this.updateHistoryDisplay();
    }

    updateNextCheckTime() {
        if (!this.trackingData || this.trackingData.delivered) return;

        const nextCheck = () => {
            if (!this.trackingData.lastChecked) {
                return 'Soon...';
            }
            const lastCheckedTime = new Date(this.trackingData.lastChecked).getTime();
            const nextCheckTime = lastCheckedTime + this.CHECK_INTERVAL_MS;
            const now = Date.now();
            const remaining = nextCheckTime - now;

            if (remaining <= 0) {
                return 'Checking now...';
            }

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            return `${minutes}m ${seconds}s`;
        };

        document.getElementById('nextCheck').textContent = nextCheck();

        // Update every second
        if (this.nextCheckInterval) {
            clearInterval(this.nextCheckInterval);
        }
        this.nextCheckInterval = setInterval(() => {
            document.getElementById('nextCheck').textContent = nextCheck();
        }, 1000);
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        
        if (!this.trackingData.history || this.trackingData.history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No tracking events yet</p>';
            return;
        }

        historyList.innerHTML = this.trackingData.history
            .slice()
            .reverse()
            .map(event => `
                <div class="history-item">
                    <div class="history-item-date">${this.formatDateTime(new Date(event.timestamp))}</div>
                    <div class="history-item-status">${event.status}</div>
                </div>
            `).join('');
    }

    formatDateTime(date) {
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    async loadFromAPI() {
        if (!this.trackingData || !this.trackingData.trackingId) return;

        try {
            const response = await fetch(`${this.API_BASE}/tracking/${this.trackingData.trackingId}`);
            
            if (!response.ok) {
                console.error('Failed to load tracking data');
                return;
            }

            const data = await response.json();
            
            this.trackingData = {
                trackingId: data.trackingId,
                notificationsEnabled: data.notificationsEnabled,
                startedAt: data.startedAt,
                lastChecked: data.lastChecked,
                lastStatus: data.lastStatus,
                history: data.history,
                delivered: data.delivered
            };

            this.saveLocalSession();
            this.updateStatusDisplay();
        } catch (error) {
            console.error('Error loading tracking data:', error);
        }
    }

    async checkTrackingStatus() {
        if (!this.trackingData || this.trackingData.delivered) {
            return;
        }

        console.log('Checking tracking status for:', this.trackingData.trackingId);

        try {
            const response = await fetch(`${this.API_BASE}/tracking/${this.trackingData.trackingId}/check`, {
                method: 'POST'
            });

            if (!response.ok) {
                console.error('Failed to check tracking status');
                return;
            }

            const data = await response.json();

            // Update local data
            this.trackingData.lastStatus = data.status;
            this.trackingData.delivered = data.delivered;
            this.trackingData.lastChecked = new Date().toISOString();

            // If status changed, reload full data from API
            if (data.statusChanged) {
                await this.loadFromAPI();

                // Stop checking if delivered
                if (data.delivered) {
                    this.stopPeriodicCheck();
                }

                // Send notification if enabled
                if (data.notificationsEnabled) {
                    this.sendNotification(data.status);
                }
            }

            this.saveLocalSession();
            this.updateStatusDisplay();
        } catch (error) {
            console.error('Error checking tracking status:', error);
        }
    }

    sendNotification(status) {
        if (!this.trackingData.notificationsEnabled) return;

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Royal Mail Tracking Update', {
                body: `${this.trackingData.trackingId}: ${status}`,
                icon: '📦',
                badge: '📦',
                tag: 'rmtrack-' + this.trackingData.trackingId
            });
        }
    }

    startPeriodicCheck() {
        // Clear any existing interval
        this.stopPeriodicCheck();

        // Set up new interval
        this.checkInterval = setInterval(() => {
            this.checkTrackingStatus();
        }, this.CHECK_INTERVAL_MS);

        console.log('Periodic checking started (every 15 minutes)');
    }

    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('Periodic checking stopped');
        }
        if (this.nextCheckInterval) {
            clearInterval(this.nextCheckInterval);
            this.nextCheckInterval = null;
        }
    }

    async stopTracking() {
        if (confirm('Are you sure you want to stop tracking this package?')) {
            if (this.trackingData && this.trackingData.trackingId) {
                try {
                    // Delete from server
                    await fetch(`${this.API_BASE}/tracking/${this.trackingData.trackingId}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.error('Error deleting tracking:', error);
                }
            }

            this.stopPeriodicCheck();
            this.trackingData = null;
            this.saveLocalSession();
            this.hideTrackingStatus();
        }
    }

    saveLocalSession() {
        if (this.trackingData) {
            localStorage.setItem('rmtrack_session', JSON.stringify({
                trackingId: this.trackingData.trackingId
            }));
        } else {
            localStorage.removeItem('rmtrack_session');
        }
    }

    loadLocalSession() {
        const data = localStorage.getItem('rmtrack_session');
        if (data) {
            try {
                const session = JSON.parse(data);
                if (session.trackingId) {
                    // Initialize with minimal data, will load from API
                    this.trackingData = {
                        trackingId: session.trackingId,
                        notificationsEnabled: false,
                        startedAt: null,
                        lastChecked: null,
                        lastStatus: null,
                        history: [],
                        delivered: false
                    };
                }
            } catch (error) {
                console.error('Failed to load session:', error);
                localStorage.removeItem('rmtrack_session');
            }
        }
    }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new RoyalMailTracker();
    });
} else {
    new RoyalMailTracker();
}
