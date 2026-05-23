import { expect, test } from '@playwright/test';

test('Stockfish 18 worker returns moves while replaying the mate del pastor line', async ({ page }) => {
  await page.goto('/');

  const result = await page.evaluate(async () => {
    return await new Promise<{
      ok: boolean;
      bestmoves: string[];
      errors: string[];
      messages: string[];
    }>((resolve) => {
      const worker = new Worker('/stockfish.js', { type: 'classic' });
      const messages: string[] = [];
      const errors: string[] = [];
      const bestmoves: string[] = [];
      const pastorFens = [
        // 1. e4
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        // 1. e4 e5 2. Bc4
        'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2',
        // 1. e4 e5 2. Bc4 Nc6 3. Qh5
        'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
        'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
      ];

      const done = (ok: boolean) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve({ ok, bestmoves, errors, messages });
      };

      const send = (command: string) => {
        messages.push(`> ${command}`);
        worker.postMessage(command);
      };

      const requestMove = (fen: string) => {
        send(`position fen ${fen}`);
        send('go movetime 200');
      };

      const timeout = window.setTimeout(() => done(false), 10_000);

      worker.onerror = (event) => {
        errors.push(event.message);
        done(false);
      };

      worker.onmessage = (event) => {
        const message = String(event.data);
        messages.push(message);

        if (message === 'uciok') {
          send('isready');
          return;
        }

        if (message === 'readyok') {
          send('setoption name UCI_LimitStrength value true');
          send('setoption name UCI_Elo value 1320');
          send('setoption name Skill Level value 0');
          send('ucinewgame');
          requestMove(pastorFens[0]);
          return;
        }

        if (message.startsWith('bestmove')) {
          bestmoves.push(message);
          if (bestmoves.length === pastorFens.length) {
            done(true);
          } else {
            requestMove(pastorFens[bestmoves.length]);
          }
        }
      };

      send('uci');
    });
  });

  expect(result.errors).toEqual([]);
  expect(result.messages).toContain('uciok');
  expect(result.messages).toContain('readyok');
  expect(result.ok).toBe(true);
  expect(result.bestmoves.slice(0, 3)).toHaveLength(3);
  for (const bestmove of result.bestmoves.slice(0, 3)) {
    expect(bestmove).toMatch(/^bestmove [a-h][1-8][a-h][1-8][qrbn]?/);
  }
  expect(result.bestmoves[3]).toBe('bestmove (none)');
});
