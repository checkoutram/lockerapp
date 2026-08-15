declare module 'jszip' {
  export default class JSZip {
    file(name: string, data: string | Blob | ArrayBuffer): this;
    file(name: string): { async(type: 'string'): Promise<string> } | null;
    folder(name: string): this;
    generateAsync(options: { type: 'blob' | 'base64' | 'uint8array' }): Promise<Blob | string | Uint8Array>;
    loadAsync(data: Blob | ArrayBuffer | string): Promise<JSZip>;
    files: Record<string, { name: string; async(type: 'string' | 'blob' | 'base64'): Promise<any> }>;
  }
}
