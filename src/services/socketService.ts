import io, { Socket } from 'socket.io-client';
import { RoomState, OnlinePlayer } from '../types';

class SocketService {
  public socket: any = null;
  public room: RoomState | null = null;
  public playerId: string | null = null;
  public listeners = new Set<() => void>();

  connect() {
    if (!this.socket) {
      this.socket = io({ transports: ['websocket'], upgrade: false });
      
      this.socket.on('connect', () => {
        this.playerId = this.socket!.id!;
        this.notify();
      });

      this.socket.on('roomUpdate', (room: RoomState) => {
        this.room = room;
        this.notify();
      });

      this.socket.on('returnedToLobby', (room: RoomState) => {
        this.room = room;
        this.notify();
      });

      this.socket.on('gameStarted', (room: RoomState) => {
        this.room = room;
        this.notify();
      });

      this.socket.on('disconnect', () => {
        this.room = null;
        this.notify();
      });

      this.socket.on('kicked', () => {
        this.room = null;
        this.notify();
      });

      this.socket.on('roomDestroyed', () => {
        this.room = null;
        this.notify();
      });
    } else if (!this.socket.connected) {
      this.socket.connect();
    } else {
      this.playerId = this.socket.id!;
    }
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  createRoom(playerName: string, passwordSettings: { enabled: boolean; password?: string }, callback: (res: any) => void) {
    if (!this.socket || !this.socket.connected) {
      return callback({ success: false, error: '与服务器的连接断开，请刷新页面重试。' });
    }
    this.socket?.emit('createRoom', { playerName, passwordSettings }, (res: any) => {
      if (res.success) {
        this.room = res.room;
        this.notify();
      }
      callback(res);
    });
  }

  joinRoom(roomId: string, playerName: string, password?: string, callback?: (res: any) => void) {
    this.socket?.emit('joinRoom', { roomId, playerName, password }, (res: any) => {
      if (res.success) {
        this.room = res.room;
        this.notify();
      }
      if (callback) callback(res);
    });
  }

  getRooms(callback: (res: any) => void) {
    this.socket?.emit('getRooms', callback);
  }

  adminDestroyRoom(roomId: string, password: string, callback: (res: any) => void) {
    this.socket?.emit('adminDestroyRoom', { roomId, password }, callback);
  }

  disbandRoom(callback?: (res: any) => void) {
    this.socket?.emit('disbandRoom', callback);
    this.room = null;
    this.notify();
  }

  leaveRoom() {
    this.socket?.emit('leaveRoom');
    this.room = null;
    this.notify();
  }

  updatePlayer(playerData: Partial<OnlinePlayer>) {
    this.socket?.emit('updatePlayer', playerData);
  }

  updateSettings(settings: Partial<RoomState['settings']>) {
    this.socket?.emit('updateSettings', settings);
  }

  transferHost(targetPlayerId: string) {
    this.socket?.emit('transferHost', targetPlayerId);
  }

  setReady(isReady: boolean) {
    this.socket?.emit('setReady', isReady);
  }

  addAi(aiData?: any) {
    this.socket?.emit('addAi', aiData);
  }

  updatePlayerByHost(id: string, updates: Partial<OnlinePlayer>) {
    this.socket?.emit('updatePlayerByHost', id, updates);
  }

  removeAi(aiId: string) {
    this.socket?.emit('removeAi', aiId);
  }

  kickPlayer(playerId: string) {
    this.socket?.emit('kickPlayer', playerId);
  }

  startGame() {
    this.socket?.emit('startGame');
  }

  syncLocalCar(carState: any) {
    this.socket?.emit('syncLocalCar', carState);
  }

  syncCars(payload: any) {
    this.socket?.emit('syncCars', payload);
  }

  sendInputs(inputs: string[]) {
    this.socket?.emit('sendInputs', inputs);
  }
}

export const socketService = new SocketService();
