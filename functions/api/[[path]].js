/**
 * Cloudflare Workers API for Royal Mail Tracking
 */

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle OPTIONS request for CORS
 */
function handleOptions() {
  return new Response(null, {
    headers: corsHeaders
  });
}

/**
 * Validate Royal Mail tracking ID format
 */
function validateTrackingId(trackingId) {
  const cleanId = trackingId.trim().toUpperCase();
  const royalMailPattern = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
  return royalMailPattern.test(cleanId);
}

/**
 * Simulate fetching tracking status from Royal Mail API
 * In production, this would call the actual Royal Mail API
 */
async function fetchRoyalMailStatus(trackingId, startedAt) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Mock data - simulate different statuses based on tracking time
  const startTime = new Date(startedAt).getTime();
  const elapsedMinutes = (Date.now() - startTime) / 60000;

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

/**
 * Add a new tracking ID
 */
async function addTracking(request, env) {
  try {
    const { trackingId, notificationsEnabled } = await request.json();

    if (!validateTrackingId(trackingId)) {
      return new Response(JSON.stringify({
        error: 'Invalid tracking ID format. Please use format: AB123456789GB'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cleanId = trackingId.trim().toUpperCase();
    const now = new Date().toISOString();

    // Check if tracking already exists
    const existing = await env.DB.prepare(
      'SELECT * FROM tracking WHERE tracking_id = ?'
    ).bind(cleanId).first();

    if (existing) {
      return new Response(JSON.stringify({
        error: 'Tracking ID already exists'
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert new tracking
    await env.DB.prepare(
      'INSERT INTO tracking (tracking_id, notifications_enabled, started_at, last_checked, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(cleanId, notificationsEnabled ? 1 : 0, now, now, now).run();

    // Get initial status
    const status = await fetchRoyalMailStatus(cleanId, now);

    // Add to history
    await env.DB.prepare(
      'INSERT INTO tracking_history (tracking_id, status, timestamp) VALUES (?, ?, ?)'
    ).bind(cleanId, status.status, now).run();

    // Update tracking with initial status
    await env.DB.prepare(
      'UPDATE tracking SET last_status = ?, delivered = ?, updated_at = ? WHERE tracking_id = ?'
    ).bind(status.status, status.delivered ? 1 : 0, now, cleanId).run();

    return new Response(JSON.stringify({
      trackingId: cleanId,
      status: status.status,
      delivered: status.delivered,
      notificationsEnabled
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to add tracking: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Get tracking information
 */
async function getTracking(trackingId, env) {
  try {
    const cleanId = trackingId.trim().toUpperCase();

    // Get tracking data
    const tracking = await env.DB.prepare(
      'SELECT * FROM tracking WHERE tracking_id = ?'
    ).bind(cleanId).first();

    if (!tracking) {
      return new Response(JSON.stringify({
        error: 'Tracking ID not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get history
    const history = await env.DB.prepare(
      'SELECT status, timestamp FROM tracking_history WHERE tracking_id = ? ORDER BY timestamp DESC'
    ).bind(cleanId).all();

    return new Response(JSON.stringify({
      trackingId: tracking.tracking_id,
      notificationsEnabled: tracking.notifications_enabled === 1,
      startedAt: tracking.started_at,
      lastChecked: tracking.last_checked,
      lastStatus: tracking.last_status,
      delivered: tracking.delivered === 1,
      history: history.results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get tracking: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Update tracking status (check for updates)
 */
async function updateTracking(trackingId, env) {
  try {
    const cleanId = trackingId.trim().toUpperCase();

    // Get tracking data
    const tracking = await env.DB.prepare(
      'SELECT * FROM tracking WHERE tracking_id = ?'
    ).bind(cleanId).first();

    if (!tracking) {
      return new Response(JSON.stringify({
        error: 'Tracking ID not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Don't check if already delivered
    if (tracking.delivered === 1) {
      return new Response(JSON.stringify({
        message: 'Package already delivered',
        delivered: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const now = new Date().toISOString();

    // Get new status
    const newStatus = await fetchRoyalMailStatus(cleanId, tracking.started_at);

    // Check if status changed
    const statusChanged = tracking.last_status !== newStatus.status;

    if (statusChanged) {
      // Add to history
      await env.DB.prepare(
        'INSERT INTO tracking_history (tracking_id, status, timestamp) VALUES (?, ?, ?)'
      ).bind(cleanId, newStatus.status, now).run();

      // Update tracking
      await env.DB.prepare(
        'UPDATE tracking SET last_status = ?, delivered = ?, last_checked = ?, updated_at = ? WHERE tracking_id = ?'
      ).bind(newStatus.status, newStatus.delivered ? 1 : 0, now, now, cleanId).run();
    } else {
      // Just update last_checked
      await env.DB.prepare(
        'UPDATE tracking SET last_checked = ?, updated_at = ? WHERE tracking_id = ?'
      ).bind(now, now, cleanId).run();
    }

    return new Response(JSON.stringify({
      trackingId: cleanId,
      status: newStatus.status,
      delivered: newStatus.delivered,
      statusChanged,
      notificationsEnabled: tracking.notifications_enabled === 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to update tracking: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Delete tracking
 */
async function deleteTracking(trackingId, env) {
  try {
    const cleanId = trackingId.trim().toUpperCase();

    // Delete tracking (history will be deleted due to CASCADE)
    const result = await env.DB.prepare(
      'DELETE FROM tracking WHERE tracking_id = ?'
    ).bind(cleanId).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        error: 'Tracking ID not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Tracking deleted successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to delete tracking: ' + error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Main request handler
 */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  // Route API requests
  if (path === '/api/tracking' && request.method === 'POST') {
    return addTracking(request, env);
  }

  if (path.startsWith('/api/tracking/') && request.method === 'GET') {
    const trackingId = path.split('/api/tracking/')[1];
    return getTracking(trackingId, env);
  }

  if (path.startsWith('/api/tracking/') && path.endsWith('/check') && request.method === 'POST') {
    const trackingId = path.split('/api/tracking/')[1].replace('/check', '');
    return updateTracking(trackingId, env);
  }

  if (path.startsWith('/api/tracking/') && request.method === 'DELETE') {
    const trackingId = path.split('/api/tracking/')[1];
    return deleteTracking(trackingId, env);
  }

  // Health check endpoint
  if (path === '/api/health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Not found
  return new Response(JSON.stringify({
    error: 'Not found'
  }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
