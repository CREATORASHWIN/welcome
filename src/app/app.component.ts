import { Component, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ChatService, Message } from './services/chat.service';
import { environment } from '../environments/environment';  // optional: for API URL

type ProfileKey = 'HB' | 'KEERIPULLAA';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, PickerModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ChatService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  profiles: Record<ProfileKey, { password: string; pic: string }> = {
    HB: { password: '1726', pic: 'female.png' },
    KEERIPULLAA: { password: '1726', pic: 'male.png' },
  };

  selectedProfile: ProfileKey | null = null;
  passwordInput = '';
  loggedIn = false;

  username: ProfileKey = 'HB';
  userPic = '';

  messages: (Message & { seenBy: ProfileKey[] })[] = [];
  newMessage = '';
  emojiOpen = false;

  constructor(private chatService: ChatService) {}

  selectProfile(profile: ProfileKey) {
    this.selectedProfile = profile;
  }

  getProfilePic(user: ProfileKey | string): string {
    return this.profiles[user as ProfileKey]?.pic ?? '';
  }

  async login() {
    if (!this.selectedProfile) return alert('Select a profile');
    const profile = this.profiles[this.selectedProfile];
    if (this.passwordInput !== profile.password) return alert('Incorrect password');

    this.username = this.selectedProfile;
    this.userPic = profile.pic;
    this.loggedIn = true;

    this.messages.push({
      from: this.username,
      text: `Welcome ${this.username}!`,
      fileType: 'text',
      timestamp: Date.now(),
      pic: this.userPic,
      seenBy: [this.username],
    });

    this.chatService.getMessages((msgs) => {
      this.messages = msgs.map((msg) => ({
        ...msg,
        pic: this.getProfilePic(msg.from),
        seenBy: msg.seenBy || [],
      }));
      this.markMessagesSeen();
      this.scrollToBottom();
    });
  }

  async sendMessage() {
    if (!this.loggedIn) return alert('Login first');

    if (this.newMessage.trim()) {
      const message: Message & { seenBy: ProfileKey[] } = {
        from: this.username,
        text: this.newMessage,
        fileType: 'text',
        timestamp: Date.now(),
        pic: this.userPic,
        seenBy: [this.username],
      };

      this.messages.push(message);
      await this.chatService.sendMessage(this.username, this.newMessage);
      this.newMessage = '';
      this.scrollToBottom();
    }
  }

  toggleEmoji() {
    this.emojiOpen = !this.emojiOpen;
  }

  addEmoji(event: any) {
    this.newMessage += event.emoji?.native || event.native || '';
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer)
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
    }, 50);
  }

  markMessagesSeen() {
    const other: ProfileKey = this.username === 'HB' ? 'KEERIPULLAA' : 'HB';
    this.messages.forEach((msg) => {
      if (!msg.seenBy.includes(other)) {
        msg.seenBy.push(other);
      }
    });
  }

  getSeenText(msg: Message & { seenBy: ProfileKey[] }): string {
    const other: ProfileKey = this.username === 'HB' ? 'KEERIPULLAA' : 'HB';
    return msg.seenBy.includes(other) ? 'Seen just now' : '';
  }
}
