// hooks/useSocketEvent.js — Custom hook to subscribe to a named Socket.IO event and clean up on unmount
import { useEffect } from 'react';

export function useSocketEvent(socket, event, handler) {
  useEffect(() => {}, [socket, event, handler]);
}
