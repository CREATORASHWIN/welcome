import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket!: Socket;
  private backend = environment.backendUrl || 'http://localhost:3000';

  constructor(private http: HttpClient) {
    this.connectSocket();
  }

  /** Connect to Socket.IO server with auto-reconnect */
  private connectSocket() {
    this.socket = io(this.backend, {
      transports: ['websocket'], // more stable for real-time
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => console.log('✅ Socket connected'));
    this.socket.on('disconnect', () => console.log('❌ Socket disconnected'));
    this.socket.on('connect_error', (err) => console.error('⚠️ Socket error:', err));
  }

  /** Getter for connection status */
  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  /** Emit an event */
  emit(event: string, payload?: any) {
    this.socket.emit(event, payload);
  }

  /** Listen to an event with a callback */
  on<T>(event: string, callback: (data: T) => void): void {
    this.socket.on(event, callback);
  }

  /** Listen to an event as an Observable */
  on$<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      this.socket.on(event, (data: T) => subscriber.next(data));
      return () => this.socket.off(event);
    });
  }

  /** Simple REST login call with optional token storage */
  async apiLogin(username: string, password: string): Promise<boolean> {
    try {
      const res: any = await this.http
        .post(`${this.backend}/login`, { username, password })
        .toPromise();

      if (res?.token) {
        localStorage.setItem('authToken', res.token);
      }

      return res?.ok ?? false;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  }

  /** Authenticate socket connection with stored token */
  authenticateSocket() {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.emit('authenticate', { token });
    }
  }
}