import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalLocation = window.location;

function setLocationProtocol(protocol: string) {
  Object.defineProperty(window, 'location', {
    value: {
      ...originalLocation,
      protocol,
      hostname: protocol === 'http:' ? 'localhost' : '',
      port: protocol === 'http:' ? '5173' : '',
      host: protocol === 'http:' ? 'localhost:5173' : '',
      pathname: '/',
      hash: '',
    },
    writable: true,
    configurable: true,
  });
}

function setNavigatorProperty<T>(name: string, value: T) {
  Object.defineProperty(navigator, name, {
    value,
    writable: true,
    configurable: true,
  });
}

describe('exportPgn', () => {
  beforeEach(() => {
    vi.resetModules();
    setLocationProtocol('http:');
    setNavigatorProperty('share', undefined);
    setNavigatorProperty('canShare', undefined);
    setNavigatorProperty('clipboard', undefined);

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:mock-pgn-url'),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('uses the native share sheet when file sharing is available', async () => {
    setLocationProtocol('capacitor:');
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn(() => true);
    setNavigatorProperty('share', share);
    setNavigatorProperty('canShare', canShare);

    const { exportPgn } = await import('../../src/lib/pgnExport');
    const result = await exportPgn({
      pgn: '[Event "Test"]\n\n1. e4 *\n',
      filename: 'test-game.pgn',
      title: 'Test PGN',
    });

    expect(result).toBe('shared');
    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
    expect(share).toHaveBeenCalledWith({
      title: 'Test PGN',
      text: 'Test PGN',
      files: [expect.any(File)],
    });
  });

  it('downloads the PGN in normal browser mode', async () => {
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const createElement = vi.spyOn(document, 'createElement');

    createElement.mockImplementation((tagName: string, options?: ElementCreationOptions) => {
      const element = Document.prototype.createElement.call(document, tagName, options);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: click, configurable: true });
      }
      return element;
    });

    const { exportPgn } = await import('../../src/lib/pgnExport');
    const result = await exportPgn({
      pgn: '[Event "Browser"]\n\n1. d4 *\n',
      filename: 'browser-game.pgn',
    });

    expect(result).toBe('downloaded');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledWith(expect.objectContaining({
      download: 'browser-game.pgn',
      href: 'blob:mock-pgn-url',
    }));
    expect(removeChild).toHaveBeenCalled();
  });

  it('copies PGN to the clipboard when native WebView export paths are blocked', async () => {
    setLocationProtocol('capacitor:');
    setNavigatorProperty('share', undefined);
    setNavigatorProperty('canShare', undefined);
    setNavigatorProperty('clipboard', {
      writeText: vi.fn().mockResolvedValue(undefined),
    });
    vi.spyOn(window, 'open').mockReturnValue(null);

    const pgn = '[Event "Clipboard"]\n\n1. Nf3 *\n';
    const { exportPgn } = await import('../../src/lib/pgnExport');
    const result = await exportPgn({ pgn, filename: 'clipboard-game.pgn' });

    expect(result).toBe('copied');
    expect(window.open).toHaveBeenCalledWith('blob:mock-pgn-url', '_blank', 'noopener,noreferrer');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(pgn);
  });
});
