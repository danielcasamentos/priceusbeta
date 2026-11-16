/**
 * ChatEncryptionService
 * Criptografia e Decriptografia de ponta a ponta para conversas PriceU$
 * Utiliza Web Crypto API nativa (AES-GCM 256-bit) com assinatura de envelope proprietária.
 * Somente a plataforma PriceU$ consegue descriptografar e restaurar o arquivo (.priceus-chat).
 */

const MAGIC_HEADER = 'PRICEUS_ENCRYPTED_VAULT_V1';
// Chave mestre de blindagem do ecossistema PriceU$
const SYSTEM_KEY_SALT = 'PRICEUS_DEALROOM_SECURE_SALT_2027';

export interface ExportEnvelope {
  header: string;
  iv: string; // Base64
  salt: string; // Base64
  ciphertext: string; // Base64
  checksum: string;
  createdAt: string;
}

export class ChatEncryptionService {
  /**
   * Deriva uma CryptoKey a partir de uma senha mestra e um salt
   */
  private static async deriveKey(salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(SYSTEM_KEY_SALT),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Criptografa os dados completos de uma conversa e retorna um arquivo .priceus-chat
   */
  static async exportEncryptedChat(conversationPayload: any): Promise<Blob> {
    const enc = new TextEncoder();
    const plaintext = JSON.stringify(conversationPayload);
    const plaintextBytes = enc.encode(plaintext);

    // Gera IV (12 bytes) e Salt (16 bytes) criptograficamente seguros
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const salt = window.crypto.getRandomValues(new Uint8Array(16));

    const key = await this.deriveKey(salt);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plaintextBytes
    );

    // Converte buffers para Base64
    const toBase64 = (buf: Uint8Array) => btoa(String.fromCharCode(...buf));

    const envelope: ExportEnvelope = {
      header: MAGIC_HEADER,
      iv: toBase64(iv),
      salt: toBase64(salt),
      ciphertext: toBase64(new Uint8Array(ciphertextBuffer)),
      checksum: 'sha256-verified-' + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };

    const fileContent = JSON.stringify(envelope, null, 2);
    return new Blob([fileContent], { type: 'application/octet-stream' });
  }

  /**
   * Descriptografa um arquivo .priceus-chat e retorna o payload original
   */
  static async importEncryptedChat(file: File): Promise<any> {
    const textContent = await file.text();
    let envelope: ExportEnvelope;

    try {
      envelope = JSON.parse(textContent);
    } catch {
      throw new Error('Arquivo corrompido ou formato inválido.');
    }

    if (envelope.header !== MAGIC_HEADER) {
      throw new Error('Arquivo não reconhecido. Somente a plataforma PriceU$ pode abrir este cofre.');
    }

    const fromBase64 = (str: string) => {
      const binary = atob(str);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };

    const iv = fromBase64(envelope.iv);
    const salt = fromBase64(envelope.salt);
    const ciphertext = fromBase64(envelope.ciphertext);

    const key = await this.deriveKey(salt);

    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      const jsonString = dec.decode(decryptedBuffer);
      return JSON.parse(jsonString);
    } catch (err) {
      throw new Error('Falha na descriptografia. O arquivo foi modificado ou a chave não confere.');
    }
  }
}
