import { Innertube } from 'youtubei.js';
import { YouTubeUrlParser } from './url-parser.js';

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  duration: number; // in seconds
  viewCount: number;
  publishDate: string;
  thumbnailUrl: string;
  isLive: boolean;
  category: string;
  tags: string[];
}

export interface YouTubeVideoInfoResult {
  success: true;
  data: YouTubeVideoInfo;
}

export interface YouTubeVideoInfoError {
  success: false;
  code: 'INVALID_URL' | 'VIDEO_UNAVAILABLE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  videoId?: string;
}

export class YouTubeVideoInfoExtractor {
  private static innertubeInstance: Innertube | null = null;

  private static async getInnertube(): Promise<Innertube> {
    if (!this.innertubeInstance) {
      this.innertubeInstance = await Innertube.create();
    }
    return this.innertubeInstance;
  }

  public static async extract(url: string): Promise<YouTubeVideoInfoResult | YouTubeVideoInfoError> {
    try {
      const parsedUrl = YouTubeUrlParser.parse(url);
      
      if (!parsedUrl.isValid) {
        return {
          success: false,
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
            success: false,
            code: 'VIDEO_UNAVAILABLE',
            message: 'Video is private, deleted, or unavailable',
            videoId
          };
        }

        const basicInfo = videoInfo.basic_info;
        const secondaryInfo = videoInfo.secondary_info;

        // Extract video metadata
        const videoData: YouTubeVideoInfo = {
          videoId,
          title: (basicInfo.title as any)?.text || basicInfo.title || 'Unknown Title',
          description: (basicInfo.short_description as any)?.text || basicInfo.short_description || '',
          channelName: (basicInfo.channel as any)?.name?.text || (basicInfo.channel as any)?.name || 'Unknown Channel',
          duration: (basicInfo.duration as any)?.seconds_total || basicInfo.duration || 0,
          viewCount: basicInfo.view_count || 0,
          publishDate: (basicInfo as any).publish_date?.text || (basicInfo as any).upload_date || '',
          thumbnailUrl: basicInfo.thumbnail?.[0]?.url || '',
          isLive: basicInfo.is_live || false,
          category: basicInfo.category || '',
          tags: basicInfo.keywords || []
        };

        return {
          success: true,
          data: videoData
        };

      } catch (innertubeError: any) {
        if (innertubeError.message?.includes('Video unavailable')) {
          return {
            success: false,
            code: 'VIDEO_UNAVAILABLE',
            message: 'Video is private, deleted, or restricted',
            videoId
          };
        }

        return {
          success: false,
          code: 'NETWORK_ERROR',
          message: `Failed to fetch video info: ${innertubeError.message}`,
          videoId
        };
      }

    } catch (error: any) {
      return {
        success: false,
        code: 'UNKNOWN_ERROR',
        message: `Unexpected error: ${error.message}`
      };
    }
  }
}