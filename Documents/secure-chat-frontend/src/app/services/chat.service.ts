import { Injectable } from '@angular/core';
import { Database, ref, push, onValue, update } from '@angular/fire/database';
import { Storage, ref as storageRef, uploadBytes, getDownloadURL } from '@angular/fire/storage';

export interface Message {
  id?: string;
  from: 'HB' | 'KEERIPULLAA';
  text?: string;
  fileUrl?: string;
  audioUrl?: string;
  fileName?: string;
  pic?: string;
  fileType: 'text' | 'image' | 'audio' | 'document';
  timestamp: number;

  // NEW: track who has seen this message
  seenBy?: ('HB' | 'KEERIPULLAA')[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private chatKey = 'HB_KEERIPULLAA';

  constructor(private db: Database, private storage: Storage) {}

  /** Send a simple text message */
  sendMessage(from: 'HB' | 'KEERIPULLAA', text: string) {
    const message: Message = {
      from,
      text,
      fileType: 'text',
      timestamp: Date.now(),
      seenBy: [], // initialize empty
    };
    const messagesRef = ref(this.db, `chats/${this.chatKey}/messages`);
    return push(messagesRef, message);
  }

  /** Listen to all messages in real-time */
  getMessages(callback: (messages: Message[]) => void) {
    const messagesRef = ref(this.db, `chats/${this.chatKey}/messages`);
    onValue(messagesRef, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((child) => {
        const msg = child.val() as Message;
        msg.id = child.key || undefined; // store push key as id
        if (!msg.seenBy) msg.seenBy = []; // ensure seenBy exists
        msgs.push(msg);
      });
      // Sort messages by timestamp ascending
      callback(msgs.sort((a, b) => a.timestamp - b.timestamp));
    });
  }

  /** Mark a message as seen by a user */
  markAsSeen(message: Message, user: 'HB' | 'KEERIPULLAA') {
    if (!message.id) return;
    const messagesRef = ref(this.db, `chats/${this.chatKey}/messages/${message.id}`);
    if (!message.seenBy) message.seenBy = [];
    if (!message.seenBy.includes(user)) {
      message.seenBy.push(user);
      update(messagesRef, { seenBy: message.seenBy });
    }
  }

  /** Upload a file to Firebase Storage */
  async uploadFile(file: File, folder: 'images' | 'audio' | 'documents'): Promise<string> {
    const fileRef = storageRef(
      this.storage,
      `chats/${this.chatKey}/${folder}/${Date.now()}_${file.name}`
    );
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  /** Send a file message (image, audio, or document) */
  async sendFileMessage(
    from: 'HB' | 'KEERIPULLAA',
    file: File,
    fileType: 'image' | 'audio' | 'document'
  ): Promise<string> {
    const folder = fileType === 'image' ? 'images' : fileType === 'audio' ? 'audio' : 'documents';
    const fileUrl = await this.uploadFile(file, folder);

    const message: Message = {
      from,
      fileUrl: fileType !== 'audio' ? fileUrl : undefined,
      audioUrl: fileType === 'audio' ? fileUrl : undefined,
      fileName: file.name,
      pic: fileType === 'image' ? fileUrl : undefined,
      fileType,
      timestamp: Date.now(),
      seenBy: [], // initialize empty
    };

    const messagesRef = ref(this.db, `chats/${this.chatKey}/messages`);
    await push(messagesRef, message);
    return fileUrl;
  }
}