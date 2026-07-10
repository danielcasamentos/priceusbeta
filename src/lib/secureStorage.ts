const ENCRYPTION_KEY = 'priceus_secure_storage_salt_key_2026';

function encrypt(text: string): string {
  try {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    // Safe Base64 encode for Unicode strings
    return btoa(encodeURIComponent(result).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
  } catch (e) {
    return text;
  }
}

function decrypt(cipherText: string): string {
  try {
    // Safe Base64 decode for Unicode strings
    const decoded = atob(cipherText).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('');
    const text = decodeURIComponent(decoded);

    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    return cipherText;
  }
}

export const secureLocalStorage = {
  setItem(key: string, value: string): void {
    const encryptedKey = encrypt(key);
    const encryptedValue = encrypt(value);
    localStorage.setItem(encryptedKey, encryptedValue);
  },

  getItem(key: string): string | null {
    const encryptedKey = encrypt(key);
    const encryptedValue = localStorage.getItem(encryptedKey);
    if (!encryptedValue) return null;
    return decrypt(encryptedValue);
  },

  removeItem(key: string): void {
    const encryptedKey = encrypt(key);
    localStorage.removeItem(encryptedKey);
  },

  clear(): void {
    localStorage.clear();
  }
};

export const secureSessionStorage = {
  setItem(key: string, value: string): void {
    const encryptedKey = encrypt(key);
    const encryptedValue = encrypt(value);
    sessionStorage.setItem(encryptedKey, encryptedValue);
  },

  getItem(key: string): string | null {
    const encryptedKey = encrypt(key);
    const encryptedValue = sessionStorage.getItem(encryptedKey);
    if (!encryptedValue) return null;
    return decrypt(encryptedValue);
  },

  removeItem(key: string): void {
    const encryptedKey = encrypt(key);
    sessionStorage.removeItem(encryptedKey);
  },

  clear(): void {
    sessionStorage.clear();
  }
};
