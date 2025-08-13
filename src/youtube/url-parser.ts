import UrlParse from 'url-parse';

export interface ParsedYouTubeUrl {
  videoId: string;
  originalUrl: string;
  isValid: boolean;
}

export class YouTubeUrlParser {
  private static readonly YOUTUBE_DOMAINS = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'www.youtu.be'
  ];

  private static readonly VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

  public static parse(url: string): ParsedYouTubeUrl {
    try {
      const parsedUrl = new UrlParse(url, true);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      if (!this.YOUTUBE_DOMAINS.includes(hostname)) {
        return {
          videoId: '',
          originalUrl: url,
          isValid: false
        };
      }

      let videoId = '';

      if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
        videoId = parsedUrl.pathname.substring(1).split('/')[0];
      } else {
        if (parsedUrl.pathname === '/watch') {
          videoId = parsedUrl.query.v as string || '';
        } else if (parsedUrl.pathname.startsWith('/embed/')) {
          videoId = parsedUrl.pathname.substring(7).split('/')[0];
        } else if (parsedUrl.pathname.startsWith('/v/')) {
          videoId = parsedUrl.pathname.substring(3).split('/')[0];
        } else {
          return {
            videoId: '',
            originalUrl: url,
            isValid: false
          };
        }
      }

      const isValidId = this.VIDEO_ID_REGEX.test(videoId);

      return {
        videoId: isValidId ? videoId : '',
        originalUrl: url,
        isValid: isValidId
      };
    } catch (error) {
      return {
        videoId: '',
        originalUrl: url,
        isValid: false
      };
    }
  }

  public static isValidYouTubeUrl(url: string): boolean {
    return this.parse(url).isValid;
  }

  public static extractVideoId(url: string): string | null {
    const parsed = this.parse(url);
    return parsed.isValid ? parsed.videoId : null;
  }
}