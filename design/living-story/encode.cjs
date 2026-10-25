/** CPU-only H.264 web derivative. FFmpeg must already exist locally.
 * Usage: node encode.cjs FFMPEG_EXE PREPARED_FRAMES_DIRECTORY OUTPUT_MP4 [CRF]
 * Existing outputs are not overwritten. No source audio is copied.
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const [ffmpeg, frames, output, crf = '31'] = process.argv.slice(2);
if (!ffmpeg || !frames || !output) throw new Error('Expected ffmpeg executable, prepared frames and output MP4.');
if (fs.existsSync(output)) throw new Error('Output already exists; choose a new destination.');
if (!/^\d+$/.test(crf) || Number(crf) > 51) throw new Error('CRF must be an integer from 0 to 51.');
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
const args = [
  '-hide_banner', '-n', '-framerate', '30', '-start_number', '0',
  '-i', path.join(frames, 'frame-%04d.png'),
  '-map', '0:v:0', '-frames:v', '360', '-an',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-threads', '4',
  '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-colorspace', 'bt709', '-color_range', 'tv', '-g', '60',
  '-movflags', '+faststart', output,
];
fs.writeFileSync(output + '.command.json', JSON.stringify({ executable: ffmpeg, args }, null, 2));
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
