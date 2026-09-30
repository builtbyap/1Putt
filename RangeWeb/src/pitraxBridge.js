// Contract with TrackManWebRangeView.swift:
//   Swift -> JS: window.PITRAX.setSession({ shots: RangeWebShot[], selectedId })
//   JS -> Swift: webkit.messageHandlers.pitrax.postMessage('back')
// window.PITRAX must exist before the WebView finishes loading, so it is set at import time.

const listeners = new Set();
let session = { shots: [], selectedId: null };

export function getSession() {
  return session;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

window.PITRAX = {
  setSession(payload) {
    session = {
      shots: Array.isArray(payload?.shots) ? payload.shots : [],
      selectedId: payload?.selectedId ?? null,
    };
    listeners.forEach((listener) => listener());
  },
};

export function sendBack() {
  window.webkit?.messageHandlers?.pitrax?.postMessage('back');
}

export function hasRecordedFlight(shot) {
  if (!shot) return false;
  const carry = parseFloat(shot.carry);
  const ballSpeed = parseFloat(shot.ballSpeed);
  const clubSpeed = parseFloat(shot.clubSpeed);
  return carry > 0 && (ballSpeed > 0 || clubSpeed > 0);
}
