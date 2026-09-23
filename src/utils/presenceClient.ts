import { AuthUser, ActiveOnlineSession, PresenceSummary } from '../types';

// Persistent session identifier per browser tab
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  let sId = sessionStorage.getItem('cbt_presence_session_id');
  if (!sId) {
    sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('cbt_presence_session_id', sId);
  }
  return sId;
}

function getBrowserAndDeviceInfo(): { device: string; browser: string } {
  if (typeof navigator === 'undefined') {
    return { device: 'PC/Desktop', browser: 'Browser' };
  }

  const ua = navigator.userAgent;
  let device = 'PC / Komputer';
  if (/mobile/i.test(ua)) device = 'Smartphone / HP';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  let browser = 'Web Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';

  return { device, browser };
}

type OnKickedCallback = () => void;
type OnPresenceUpdateCallback = (summary: PresenceSummary) => void;
type OnDifferentAccountDetectedCallback = (session: ActiveOnlineSession) => void;

let heartbeatTimer: any = null;
let pollTimer: any = null;
let visibilityHandler: (() => void) | null = null;
let currentSummary: PresenceSummary | null = null;
const presenceSubscribers = new Set<OnPresenceUpdateCallback>();
const differentAccountSubscribers = new Set<OnDifferentAccountDetectedCallback>();
const knownOnlineAccountKeys = new Set<string>();
let onKickedHandler: OnKickedCallback | null = null;

export function registerKickedHandler(cb: OnKickedCallback) {
  onKickedHandler = cb;
}

export function subscribeToPresence(cb: OnPresenceUpdateCallback): () => void {
  presenceSubscribers.add(cb);
  if (currentSummary) {
    cb(currentSummary);
  }
  return () => {
    presenceSubscribers.delete(cb);
  };
}

export function subscribeToDifferentAccountDetected(cb: OnDifferentAccountDetectedCallback): () => void {
  differentAccountSubscribers.add(cb);
  return () => {
    differentAccountSubscribers.delete(cb);
  };
}

/**
 * Send heartbeat to backend server
 */
export async function sendPresenceHeartbeat(
  user: AuthUser,
  activity = 'Aktif di Sistem',
  activityDetails = ''
): Promise<{ success: boolean; kicked?: boolean }> {
  try {
    const sessionId = getOrCreateSessionId();
    const { device, browser } = getBrowserAndDeviceInfo();

    let identifier = user.username || '';
    let classRoom: string | undefined = undefined;
    let positionOrSubject: string | undefined = undefined;

    if (user.role === 'siswa' && user.details && 'nisn' in user.details) {
      identifier = user.details.nisn || user.details.nis || user.username || '';
      classRoom = user.details.classRoom;
    } else if (user.role === 'guru' && user.details && 'nip' in user.details) {
      identifier = user.details.nip || user.details.nuptk || user.username || '';
      positionOrSubject = `${user.details.position || 'Guru'}${user.details.subject ? ` (${user.details.subject})` : ''}`;
    }

    const payload = {
      sessionId,
      userId: user.details?.id || user.username || user.name,
      name: user.name,
      role: user.role,
      identifier: identifier || user.username || '-',
      classRoom,
      positionOrSubject,
      device,
      browser,
      currentActivity: activity,
      activityDetails,
      loginTime: user.lastLogin || new Date().toLocaleTimeString('id-ID'),
      photoUrl: user.photoUrl,
    };

    const resp = await fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.kicked && onKickedHandler) {
        onKickedHandler();
        return { success: false, kicked: true };
      }
      return { success: true };
    }
  } catch (err) {
    // Network or server error - fail silent
  }
  return { success: false };
}

/**
 * Fetch all active sessions from server
 */
export async function fetchActivePresence(): Promise<PresenceSummary | null> {
  try {
    const resp = await fetch('/api/presence/active', {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.sessions)) {
        const summary: PresenceSummary = {
          totalOnline: data.totalOnline,
          uniqueAccountsCount: data.uniqueAccountsCount,
          guruCount: data.guruCount,
          siswaCount: data.siswaCount,
          adminCount: data.adminCount,
          sessions: data.sessions,
          guruSessions: data.guruSessions || [],
          siswaSessions: data.siswaSessions || [],
          adminSessions: data.adminSessions || [],
          serverTime: data.serverTime || Date.now(),
        };

        // Check if any new/different account has appeared
        data.sessions.forEach((s: ActiveOnlineSession) => {
          const key = `${s.role}:${(s.identifier || s.name).toLowerCase()}:${s.sessionId}`;
          if (!knownOnlineAccountKeys.has(key)) {
            knownOnlineAccountKeys.add(key);
            // Notify different account detected listeners
            differentAccountSubscribers.forEach((fn) => fn(s));
          }
        });

        currentSummary = summary;
        presenceSubscribers.forEach((fn) => fn(summary));
        return summary;
      }
    }
  } catch (err) {
    // ignore
  }
  return null;
}

/**
 * Explicit presence logout on sign out
 */
export async function sendPresenceLogout() {
  try {
    const sessionId = getOrCreateSessionId();
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ sessionId })], { type: 'application/json' });
      navigator.sendBeacon('/api/presence/logout', blob);
    } else {
      await fetch('/api/presence/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      });
    }
  } catch {}
}

/**
 * Admin remote kick
 */
export async function kickPresenceSession(sessionId: string): Promise<boolean> {
  try {
    const resp = await fetch('/api/presence/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (resp.ok) {
      await fetchActivePresence();
      return true;
    }
  } catch {}
  return false;
}

/**
 * Start presence heartbeat for current logged in user & global polling
 */
export function startPresenceService(
  getUser: () => AuthUser | null,
  getActivity: () => { activity: string; details?: string }
) {
  stopPresenceService();

  const ping = () => {
    const user = getUser();
    if (!user) return;
    const { activity, details } = getActivity();
    sendPresenceHeartbeat(user, activity, details);
  };

  // Immediate first ping
  ping();
  fetchActivePresence();

  // Heartbeat every 10 seconds while tab is active
  heartbeatTimer = setInterval(ping, 10000);

  // Poll active presence every 4 seconds for instant real-time detection without manual refresh
  pollTimer = setInterval(() => {
    fetchActivePresence();
  }, 4000);

  // Instant refresh when admin/user focuses or switches to the browser tab
  visibilityHandler = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      ping();
      fetchActivePresence();
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  // Cleanup on tab close/unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', sendPresenceLogout);
  }
}

export function stopPresenceService() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
}
