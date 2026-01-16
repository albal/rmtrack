// Royal Mail Tracking App
class RoyalMailTracker {
    constructor() {
        this.trackingData = null;
        this.checkInterval = null;
        this.CHECK_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
        this.init();
    }

    init() {
        // Load existing tracking data
        this.loadTrackingData();
        
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

        // Initialize tracking data
        this.trackingData = {
            trackingId: trackingId,
            notificationsEnabled: enableNotifications && Notification.permission === 'granted',
            startedAt: new Date().toISOString(),
            lastChecked: null,
            lastStatus: null,
            history: [],
            delivered: false
        };

        this.saveTrackingData();
        this.showTrackingStatus();
        
        // Perform initial check
        await this.checkTrackingStatus();
        
        // Start periodic checking
        this.startPeriodicCheck();

        // Clear form
        trackingIdInput.value = '';
        document.getElementById('enableNotifications').checked = false;
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
                const registration = await navigator.serviceWorker.register('service-worker.js');
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

    async checkTrackingStatus() {
        if (!this.trackingData || this.trackingData.delivered) {
            return;
        }

        console.log('Checking tracking status for:', this.trackingData.trackingId);

        // Simulate API call to Royal Mail
        // In a real implementation, this would call the Royal Mail API
        const newStatus = await this.fetchTrackingStatus(this.trackingData.trackingId);

        this.trackingData.lastChecked = new Date().toISOString();

        // Check if status has changed
        const statusChanged = this.trackingData.lastStatus !== newStatus.status;

        if (statusChanged) {
            this.trackingData.lastStatus = newStatus.status;
            
            // Add to history
            this.trackingData.history.push({
                timestamp: new Date().toISOString(),
                status: newStatus.status
            });

            // Check if delivered
            if (newStatus.delivered) {
                this.trackingData.delivered = true;
                this.stopPeriodicCheck();
            }

            // Send notification if enabled
            if (this.trackingData.notificationsEnabled) {
                this.sendNotification(newStatus.status);
            }
        }

        this.saveTrackingData();
        this.updateStatusDisplay();
    }

    /**
     * Simulate fetching tracking status from Royal Mail API
     * In a real implementation, this would make an API call
     */
    async fetchTrackingStatus(trackingId) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock data - simulate different statuses based on how long tracking has been active
        const startTime = new Date(this.trackingData.startedAt).getTime();
        const elapsedMinutes = (Date.now() - startTime) / 60000;

        // Create a progressive status flow
        if (elapsedMinutes < 1) {
            return { status: 'Item received by Royal Mail', delivered: false };
        } else if (elapsedMinutes < 2) {
            return { status: 'In transit to delivery depot', delivered: false };
        } else if (elapsedMinutes < 3) {
            return { status: 'At local delivery office', delivered: false };
        } else if (elapsedMinutes < 4) {
            return { status: 'Out for delivery', delivered: false };
        } else {
            return { status: 'Delivered and signed for', delivered: true };
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

    stopTracking() {
        if (confirm('Are you sure you want to stop tracking this package?')) {
            this.stopPeriodicCheck();
            this.trackingData = null;
            this.saveTrackingData();
            this.hideTrackingStatus();
        }
    }

    saveTrackingData() {
        if (this.trackingData) {
            localStorage.setItem('rmtrack_data', JSON.stringify(this.trackingData));
        } else {
            localStorage.removeItem('rmtrack_data');
        }
    }

    loadTrackingData() {
        const data = localStorage.getItem('rmtrack_data');
        if (data) {
            try {
                this.trackingData = JSON.parse(data);
            } catch (error) {
                console.error('Failed to load tracking data:', error);
                // Clear corrupted data
                localStorage.removeItem('rmtrack_data');
                this.trackingData = null;
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
