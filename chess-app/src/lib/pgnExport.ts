import { isNativeApp } from './auth';

export type PgnExportResult = 'shared' | 'downloaded' | 'opened' | 'copied';

interface PgnExportOptions {
  pgn: string;
  filename?: string;
  title?: string;
}

function defaultFilename(): string {
  return `chess-game-${new Date().toISOString().slice(0, 10)}.pgn`;
}

function canShareFile(file: File): boolean {
  if (!navigator.share) return false;
  if (!navigator.canShare) return true;
  return navigator.canShare({ files: [file] });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyPgnToClipboard(pgn: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(pgn);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = pgn;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export async function exportPgn({ pgn, filename = defaultFilename(), title = 'Chess game PGN' }: PgnExportOptions): Promise<PgnExportResult> {
  const blob = new Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' });
  const file = new File([blob], filename, { type: 'application/x-chess-pgn' });

  if (canShareFile(file)) {
    await navigator.share({
      title,
      text: title,
      files: [file],
    });
    return 'shared';
  }

  if (!isNativeApp()) {
    triggerDownload(blob, filename);
    return 'downloaded';
  }

  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) {
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return 'opened';
  }
  URL.revokeObjectURL(url);

  await copyPgnToClipboard(pgn);
  return 'copied';
}
