import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { config } from '../config';

// 1. Thread-safe Mutex Lock for CPU conservation on small EC2 instances
class Mutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          if (next) next();
        } else {
          this.locked = false;
        }
      };

      if (this.locked) {
        this.queue.push(() => resolve(release));
      } else {
        this.locked = true;
        resolve(release);
      }
    });
  }
}

export class EncodingService {
  private mutex = new Mutex();
  // Map to track progress percentage of running jobs (jobId -> percent)
  private progressMap = new Map<string, number>();

  constructor() {
    // Attempt to locate system ffmpeg/ffprobe paths if set in environment
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }
  }

  /**
   * Returns current active progress for a specific job
   */
  getJobProgress(jobId: string): number {
    return this.progressMap.get(jobId) ?? 0;
  }

  /**
   * Queue and transcode an MP4 to keyframe-aligned HLS segments.
   * This is thread-safe: exactly ONE transcode runs concurrently.
   */
  async transcodeToHLS(
    jobId: string,
    inputFilePath: string,
    outputFolderName: string
  ): Promise<{ playlistUrl: string; duration: number }> {
    console.log(`📥 Job [${jobId}] queued. Waiting for Mutex lock...`);
    const release = await this.mutex.acquire();
    console.log(`🔒 Job [${jobId}] acquired Mutex lock. Initializing FFmpeg...`);

    this.progressMap.set(jobId, 0);

    const targetFolder = path.join(config.uploadDir, 'hls', outputFolderName);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const playlistFilePath = path.join(targetFolder, 'index.m3u8');

    return new Promise<{ playlistUrl: string; duration: number }>((resolve, reject) => {
      let durationInSeconds = 0;

      // First retrieve metadata to find total duration
      ffmpeg.ffprobe(inputFilePath, (err, metadata) => {
        if (err) {
          this.progressMap.delete(jobId);
          release();
          return reject(new Error(`Failed to read video metadata: ${err.message}`));
        }

        durationInSeconds = metadata.format.duration ?? 0;

        // Run the optimized HLS segment generator
        ffmpeg(inputFilePath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            '-b:v 2000k',                    // Constrained VBR video target
            '-maxrate 2500k',                 // Upper bound ceiling
            '-bufsize 4000k',                 // Decoder buffer
            '-g 48',                          // Enforce keyframe boundaries (GOP of 48 frames, aligning perfectly to 2s)
            '-keyint_min 48',
            '-sc_threshold 0',                // Disable scene-change detection to enforce exact 2s keyframes
            '-hls_time 8',                    // HLS segment length (T_segment = 8 seconds)
            '-hls_list_size 0',               // Include all segments in index.m3u8
            `-hls_segment_filename ${path.join(targetFolder, 'segment_%03d.ts')}` // Clean segmentation formatting
          ])
          .output(playlistFilePath)
          .on('progress', (progress) => {
            const percent = Math.min(Math.round(progress.percent ?? 0), 99);
            this.progressMap.set(jobId, percent);
            console.log(`⏳ Job [${jobId}] Transcoding: ${percent}%`);
          })
          .on('end', () => {
            this.progressMap.set(jobId, 100);
            console.log(`✅ Job [${jobId}] Completed successfully! Output: ${playlistFilePath}`);
            
            // Clean up temporary local input file if desired in actual upload pipelines
            this.progressMap.delete(jobId);
            release(); // Release Mutex for next job in line
            
            resolve({
              playlistUrl: `/static/uploads/hls/${outputFolderName}/index.m3u8`,
              duration: durationInSeconds
            });
          })
          .on('error', (ffmpegErr) => {
            console.error(`❌ Job [${jobId}] Failed:`, ffmpegErr.message);
            this.progressMap.delete(jobId);
            release(); // Ensure we release lock on failure as well
            reject(new Error(`FFmpeg transcoding failed: ${ffmpegErr.message}`));
          })
          .run();
      });
    });
  }
}

export const encodingService = new EncodingService();
