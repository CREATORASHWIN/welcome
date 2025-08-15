import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  sharedKey: CryptoKey | null = null;
  private keyPair: CryptoKeyPair | null = null;
  private otherPublicKey: CryptoKey | null = null;

  constructor() {}

  // Load existing keys or generate new ECDH key pair
  async loadOrCreateKey(username: string): Promise<void> {
    // For simplicity, always generate new key pair (extend to load from storage later)
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey']
    );
    // No shared key yet — derived after receiving otherPublicKey
  }

  // Export public key as base64 (to send to other user)
  async getPublicKeyBase64(): Promise<string> {
    if (!this.keyPair) throw new Error('No key pair loaded');
    const spki = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
    return this.arrayBufferToBase64(spki);
  }

  // Receive other user's public key as base64, import it, and derive shared AES key
  async setOtherPublicKey(publicKeyBase64: string): Promise<void> {
    const keyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
    this.otherPublicKey = await crypto.subtle.importKey(
      'spki',
      keyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      []
    );

    if (!this.keyPair) throw new Error('Local key pair not loaded');
    this.sharedKey = await crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: this.otherPublicKey,
      },
      this.keyPair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt plaintext string with shared AES key
  async encryptText(plainText: string): Promise<{ ciphertext: string; nonce: string }> {
    if (!this.sharedKey) throw new Error('Shared key not loaded');

    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
      },
      this.sharedKey,
      data
    );

    return {
      ciphertext: this.arrayBufferToBase64(encrypted),
      nonce: this.arrayBufferToBase64(nonce),
    };
  }

  // Decrypt ciphertext with shared AES key
  async decryptText(ciphertextB64: string, nonceB64: string): Promise<string> {
    if (!this.sharedKey) throw new Error('Shared key not loaded');

    const ciphertext = this.base64ToArrayBuffer(ciphertextB64);
    const nonce = this.base64ToArrayBuffer(nonceB64);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: nonce,
      },
      this.sharedKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  }

  // Utility: ArrayBuffer to Base64 string
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return window.btoa(binary);
  }

  // Utility: Base64 string to ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}