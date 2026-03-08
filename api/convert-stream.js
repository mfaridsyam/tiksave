import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

const execFileAsync = promisify(execFile);

const ALLOWED_DOMAINS = ['tiktokcdn', 'tiktokcdn-us', 'tiktok.com', 'tikwm.com', 'muscdn.com'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { url } = req.query;
  if (!url) return res.status(400).send('URL is required');

  const isAllowed = ALLOWED_DOMAINS.some(d => url.includes(d));
  if (!isAllowed) return res.status(403).send('Domain not allowed');

  const id = randomBytes(8).toString('hex');
  const inputPath = join(tmpdir(), `tik_in_${id}.mp4`);
  const outputPath = join(tmpdir(), `tik_out_${id}.mp4`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/',
      }
    });

    if (!response.ok) throw new Error('Failed to fetch video');

    const buffer = await response.arrayBuffer();
    await writeFile(inputPath, Buffer.from(buffer));

    await execFileAsync(ffmpegPath.path, [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y',
      outputPath
    ]);

    const outBuffer = await readFile(outputPath);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'inline; filename="tiksave_video.mp4"');
    res.setHeader('Content-Length', outBuffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(outBuffer);

  } catch (err) {
    console.error('Convert-stream error:', err);
    if (!res.headersSent) {
      res.status(500).send('Gagal mengkonversi video.');
    }
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}