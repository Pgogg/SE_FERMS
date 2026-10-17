// hooks/useSocketEvent.js — Custom hook to subscribe to a named Socket.IO event and clean up on unmount
import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * useSocketEvent(eventName, handler)
 * Subscribes to a named Socket.IO event on the shared socket in an effect,
 * cleans up on unmount, and always uses the latest handler without dropping listeners.
 *
 * Supports both signatures:
 *   useSocketEvent(eventName, handler)
 *   useSocketEvent(socket, eventName, handler)
 */
export function useSocketEvent(...args) {
  const ctx = useSocket();

  let targetSocket;
  let eventName;
  let handler;

  if (typeof args[0] === 'string') {
    targetSocket = ctx?.socket;
    eventName = args[0];
    handler = args[1];
  } else {
    targetSocket = args[0] || ctx?.socket;
    eventName = args[1];
    handler = args[2];
  }

  // Ref to hold the latest handler so the effect doesn't need to re-subscribe on handler reference changes
  const savedHandler = useRef(handler);
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!targetSocket || !eventName) return;

    const eventListener = (...payloads) => {
      if (savedHandler.current) {
        savedHandler.current(...payloads);
      }
    };

    targetSocket.on(eventName, eventListener);

    return () => {
      targetSocket.off(eventName, eventListener);
    };
  }, [targetSocket, eventName]);
}

export default useSocketEvent;
