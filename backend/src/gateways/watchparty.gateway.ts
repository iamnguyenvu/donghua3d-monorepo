import { Server, Socket } from 'socket.io';
import { prisma } from '../db';

interface RoomState {
  playing: boolean;
  currentTime: number;
  movieId: string;
  episodeId: string;
  hostId: string; // The socket ID of the room creator
}

const rooms: Record<string, RoomState> = {};

export function setupWatchPartyGateway(io: Server) {
  console.log('💬 [Socket.io] Watch Party Real-time Gateway enabled.');

  io.on('connection', (socket: Socket) => {
    console.log(`💬 [Socket.io] Client connected: ${socket.id}`);

    // ==============================================================================
    // REAL-TIME DANMAKU (BULLET COMMENTS) LOGIC
    // ==============================================================================
    
    // Join Episode Room for Danmaku
    socket.on('join-episode', (data: { episodeId: string }) => {
      const { episodeId } = data;
      socket.join(`episode-${episodeId}`);
      console.log(`💬 [Socket.io] Client ${socket.id} joined episode room: episode-${episodeId}`);
    });

    // Send Danmaku via WebSocket
    socket.on('send-danmaku', async (data: { 
      userId: string; 
      movieId: string; 
      episodeId: string; 
      text: string; 
      time: number; 
      color?: string; 
      style?: string; 
    }) => {
      const { userId, movieId, episodeId, text, time, color, style } = data;
      
      try {
        // Save to Database
        const danmaku = await prisma.danmaku.create({
          data: {
            userId,
            movieId,
            episodeId,
            text,
            time: parseFloat(time as any),
            color: color || '#ffffff',
            style: style || 'scroll',
          },
          select: {
            id: true,
            text: true,
            time: true,
            color: true,
            style: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
              }
            }
          }
        });

        // Broadcast to everyone else watching this episode in real-time
        socket.to(`episode-${episodeId}`).emit('new-danmaku', danmaku);
        console.log(`💬 [Socket.io] Broadcasted new danmaku for episode ${episodeId}: "${text}"`);
      } catch (err: any) {
        console.error('💥 [Socket.io Error] Failed to save danmaku:', err.message);
      }
    });

    // ==============================================================================
    // WATCH PARTY SYNC LOGIC
    // ==============================================================================

    // Join Watch Party Room
    socket.on('join-room', (data: { roomId: string; username: string; movieId: string; episodeId: string }) => {
      const { roomId, username, movieId, episodeId } = data;
      socket.join(roomId);

      console.log(`💬 [Socket.io] ${username} (${socket.id}) joined room: ${roomId}`);

      // If room doesn't exist, create it with socket as host
      if (!rooms[roomId]) {
        rooms[roomId] = {
          playing: false,
          currentTime: 0,
          movieId,
          episodeId,
          hostId: socket.id
        };
      }

      // Notify others that a new user joined
      socket.to(roomId).emit('user-joined', { username, socketId: socket.id });

      // Send the current room state back to the newly joined client so they sync up
      socket.emit('room-sync', rooms[roomId]);
    });

    // Handle Play / Pause / Seek state synchronization
    socket.on('video-state-change', (data: { roomId: string; playing: boolean; currentTime: number }) => {
      const { roomId, playing, currentTime } = data;
      if (rooms[roomId]) {
        rooms[roomId].playing = playing;
        rooms[roomId].currentTime = currentTime;
      }
      // Broadcast state update to everyone else in the room
      socket.to(roomId).emit('video-state-change', { playing, currentTime });
    });

    // Handle Chat Messages
    socket.on('send-message', (data: { roomId: string; username: string; content: string }) => {
      const { roomId, username, content } = data;
      const messagePayload = {
        username,
        content,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast message to everyone in the room (including sender)
      io.to(roomId).emit('new-message', messagePayload);
    });

    // Handle Disconnections
    socket.on('disconnect', () => {
      console.log(`💬 [Socket.io] Client disconnected: ${socket.id}`);
      
      // Clean up rooms if the host disconnected
      for (const roomId in rooms) {
        if (rooms[roomId].hostId === socket.id) {
          console.log(`💬 [Socket.io] Host left. Closing room: ${roomId}`);
          delete rooms[roomId];
          io.to(roomId).emit('room-closed');
        }
      }
    });
  });
}
