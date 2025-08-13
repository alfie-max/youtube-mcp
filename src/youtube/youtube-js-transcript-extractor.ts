import { Innertube } from 'youtubei.js';
import { YouTubeUrlParser } from './url-parser.js';

export interface YouTubeJSTranscriptItem {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
  startTimeText: string; // formatted like "0:05"
}

export interface YouTubeJSTranscriptResult {
  videoId: string;
  transcript: YouTubeJSTranscriptItem[];
  language: string;
  totalDuration: number;
  wordCount: number;
  segmentCount: number;
}

export interface YouTubeJSTranscriptError {
  code: 'INVALID_URL' | 'NO_TRANSCRIPT' | 'VIDEO_UNAVAILABLE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  videoId?: string;
}

export class YouTubeJSTranscriptExtractor {
  private static innertubeInstance: Innertube | null = null;

  private static async getInnertube(): Promise<Innertube> {
    if (!this.innertubeInstance) {
      this.innertubeInstance = await Innertube.create();
    }
    return this.innertubeInstance;
  }

  public static async extract(url: string): Promise<YouTubeJSTranscriptResult | YouTubeJSTranscriptError> {
    try {
      const parsedUrl = YouTubeUrlParser.parse(url);
      
      if (!parsedUrl.isValid) {
        return {
          code: 'INVALID_URL',
          message: 'Invalid YouTube URL provided'
        };
      }

      const videoId = parsedUrl.videoId;

      try {
        const innertube = await this.getInnertube();
        
        // Get video info
        const videoInfo = await innertube.getInfo(videoId);
        
        // Check if video is available
        if (!videoInfo || !videoInfo.basic_info) {
          return {
            code: 'VIDEO_UNAVAILABLE',
            message: 'Video is private, deleted, or unavailable',
            videoId
          };
        }

        // Get transcript using the getTranscript method
        const transcriptData = await videoInfo.getTranscript();
        
        if (!transcriptData || !transcriptData.transcript) {
          return {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript available for this video',
            videoId
          };
        }

        // Extract segments from the transcript data structure
        const segments = transcriptData.transcript.content?.body?.initial_segments;
        
        if (!segments || !Array.isArray(segments)) {
          return {
            code: 'NO_TRANSCRIPT',
            message: 'Transcript data format is not supported',
            videoId
          };
        }

        // Process transcript segments
        const processedTranscript: YouTubeJSTranscriptItem[] = segments
          .filter((segment: any) => segment.type === 'TranscriptSegment')
          .map((segment: any) => {
            const startMs = parseInt(segment.start_ms || '0');
            const endMs = parseInt(segment.end_ms || '0');
            const text = segment.snippet?.runs?.[0]?.text || '';
            const startTimeText = segment.start_time_text?.text || '';

            return {
              text: text.trim(),
              start: startMs / 1000, // Convert to seconds
              duration: (endMs - startMs) / 1000, // Duration in seconds
              startTimeText
            };
          })
          .filter((item: YouTubeJSTranscriptItem) => item.text.length > 0);

        if (processedTranscript.length === 0) {
          return {
            code: 'NO_TRANSCRIPT',
            message: 'No transcript content found in the video',
            videoId
          };
        }

        // Calculate stats
        const totalDuration = processedTranscript.length > 0 
          ? processedTranscript[processedTranscript.length - 1].start + processedTranscript[processedTranscript.length - 1].duration 
          : 0;

        const wordCount = processedTranscript.reduce((count, item) => {
          return count + item.text.trim().split(/\s+/).filter(word => word.length > 0).length;
        }, 0);

        return {
          videoId,
          transcript: processedTranscript,
          language: 'en', // YouTube.js doesn't seem to provide explicit language info in the transcript
          totalDuration,
          wordCount,
          segmentCount: processedTranscript.length
        };

      } catch (innertubeError: any) {
        if (innertubeError.message?.includes('Video unavailable')) {
          return {
            code: 'VIDEO_UNAVAILABLE',
            message: 'Video is private, deleted, or restricted',
            videoId
          };
        }

        if (innertubeError.message?.includes('not available')) {
          return {
            code: 'NO_TRANSCRIPT',
            message: 'Transcript is not available for this video',
            videoId
          };
        }

        return {
          code: 'NETWORK_ERROR',
          message: `Failed to fetch transcript: ${innertubeError.message}`,
          videoId
        };
      }

    } catch (error: any) {
      return {
        code: 'UNKNOWN_ERROR',
        message: `Unexpected error: ${error.message}`
      };
    }
  }

}