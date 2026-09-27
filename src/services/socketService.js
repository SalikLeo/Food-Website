import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

let socket = null;

/**
 * Returns a shared singleton Socket.io instance.
 * Automatically handles reconnection and operates across Web and Capacitor Android APKs.
 */
export const getSocket = () => {
  if (!socket) {
    const socketUrl = API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.io] Connected to real-time server:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚡ [Socket.io] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚡ [Socket.io] Connection error (falling back to polling):', err.message);
    });
  }
  return socket;
};
