// context/SocketContext.jsx — React context providing the shared Socket.IO client instance
import React, { createContext, useContext } from 'react';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  return <SocketContext.Provider value={null}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
