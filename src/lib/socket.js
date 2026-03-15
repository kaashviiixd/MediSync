import { io } from 'socket.io-client';

const SOCKET_URL = '/';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = (userId) => {
  if (!socket.connected) {
    socket.connect();
    socket.emit('join_user_room', userId);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
