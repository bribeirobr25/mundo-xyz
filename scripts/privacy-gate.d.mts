declare const gate: {
  scanPdf: (buffer: Buffer, file: string) => string[];
  scanPngBytes: (buffer: Buffer, file: string) => string[];
  scanText: (text: string, file?: string) => string[];
};
export default gate;
