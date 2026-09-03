import { useEffect, useRef, useCallback } from 'react';
import { ActiveTab } from '../types';

export interface HistoryStatePayload {
  tab: ActiveTab;
  modal?: string | null;
  drawer?: boolean;
  exam?: boolean;
  step?: number;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Returns current window.history.state safely typed
 */
export function getCurrentHistoryState(): HistoryStatePayload | null {
  if (typeof window === 'undefined') return null;
  return (window.history.state as HistoryStatePayload) || null;
}

/**
 * Push new state to browser history stack (Prinsip 1: PushState pada setiap perubahan layar)
 */
export function pushNavigationState(payload: Partial<HistoryStatePayload>): void {
  if (typeof window === 'undefined') return;
  const current = getCurrentHistoryState();
  const nextStep = (current?.step || 0) + 1;
  const newState: HistoryStatePayload = {
    tab: payload.tab || current?.tab || 'dashboard',
    modal: payload.modal !== undefined ? payload.modal : null,
    drawer: payload.drawer !== undefined ? payload.drawer : false,
    exam: payload.exam !== undefined ? payload.exam : false,
    step: nextStep,
    timestamp: Date.now(),
    ...payload,
  };
  window.history.pushState(newState, '');
}

/**
 * Replace current state in browser history stack without creating a new step
 */
export function replaceNavigationState(payload: Partial<HistoryStatePayload>): void {
  if (typeof window === 'undefined') return;
  const current = getCurrentHistoryState();
  const newState: HistoryStatePayload = {
    tab: payload.tab || current?.tab || 'dashboard',
    modal: payload.modal !== undefined ? payload.modal : current?.modal || null,
    drawer: payload.drawer !== undefined ? payload.drawer : current?.drawer || false,
    exam: payload.exam !== undefined ? payload.exam : current?.exam || false,
    step: current?.step || 0,
    timestamp: Date.now(),
    ...payload,
  };
  window.history.replaceState(newState, '');
}

/**
 * Hook to synchronize a modal/dialog with browser history stack (Prinsip 1 & 2)
 *
 * 1. Saat modal dibuka: pushState dicatat ke history stack ({ tab, modal: modalId }).
 * 2. Saat tombol Back HP/Browser ditekan: popstate mendeteksi perubahan modal dan memanggil onClose().
 * 3. Saat modal ditutup via tombol UI (Batal/X): history.back() dipanggil agar tumpukan history tetap sinkron.
 */
export interface UseHistoryModalOptions {
  modalId: string;
  isOpen: boolean;
  onClose: () => void;
  tab?: ActiveTab;
}

export function useHistoryModal({
  modalId,
  isOpen,
  onClose,
  tab,
}: UseHistoryModalOptions): {
  handleModalClose: () => void;
} {
  const isClosingFromPopStateRef = useRef(false);
  const prevOpenRef = useRef(isOpen);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 1. When modal opens: Push modal state into browser history stack
  useEffect(() => {
    if (isOpen) {
      const currentState = getCurrentHistoryState();
      if (!currentState || currentState.modal !== modalId) {
        const currentTab = tab || currentState?.tab || 'dashboard';
        const nextStep = (currentState?.step || 0) + 1;
        window.history.pushState(
          {
            tab: currentTab,
            modal: modalId,
            drawer: false,
            exam: false,
            step: nextStep,
            timestamp: Date.now(),
          },
          ''
        );
      }
    }
  }, [isOpen, modalId, tab]);

  // 2. Handle popstate event: When user presses Back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as HistoryStatePayload | null;
      // If modal was open, and the popped state no longer matches this modalId
      if (isOpen && (!state || state.modal !== modalId)) {
        isClosingFromPopStateRef.current = true;
        onClose();
        // Reset flag after state update settles
        setTimeout(() => {
          if (isMountedRef.current) {
            isClosingFromPopStateRef.current = false;
          }
        }, 80);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, modalId, onClose]);

  // 3. When modal is closed from UI (e.g. clicking 'Batal', 'X', or submit):
  // Ensure history stack pops the modal state so back button stays perfectly sequential
  useEffect(() => {
    if (prevOpenRef.current && !isOpen) {
      const currentState = getCurrentHistoryState();
      // If closed by UI action (not popstate) and top history is still this modal:
      if (!isClosingFromPopStateRef.current && currentState?.modal === modalId) {
        window.history.back();
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, modalId]);

  const handleModalClose = useCallback(() => {
    const currentState = getCurrentHistoryState();
    if (currentState?.modal === modalId) {
      window.history.back();
    } else {
      onClose();
    }
  }, [modalId, onClose]);

  return { handleModalClose };
}
