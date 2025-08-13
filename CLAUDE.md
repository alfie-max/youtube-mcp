# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides YouTube video transcript extraction capabilities. The project has been streamlined to focus on a single, reliable tool: `get_youtube_transcript` with advanced filtering and summarization features.

## Key Commands

**Development workflow:**
```bash
npm run dev          # Run in development mode with auto-reload
npm run build        # Build TypeScript to JavaScript  
npm start           # Run the built server
npm run type-check  # Type check without building
```

**Testing:**
```bash
node test/simple-transcript-test.js     # Main functionality test
node test/test-simplified-response.js   # Response structure verification
node test/manual-test.js               # MCP protocol compliance
node test/single-url-test.js           # Detailed transcript display
node test/quick-token-test.js          # Token limit verification
```

## Architecture & Core Concepts

### MCP Server Design
The server follows a focused, single-tool approach:
- **One primary tool**: `get_youtube_transcript` with comprehensive parameters
- **Token-safe defaults**: `maxSegments: 50` to prevent MCP token limit violations
- **Advanced filtering**: Time-based extraction, summarization mode, segment limiting
- **Transparent metadata**: Complete filtering information in responses

### Key Components

**`src/server.ts`** - Main MCP server implementation
- Handles `tools/list` and `tools/call` MCP requests
- Implements parameter validation and response formatting
- Manages transcript filtering logic and token compliance

**`src/youtube/youtube-js-transcript-extractor.ts`** - Core transcript extraction
- Uses `youtubei.js` for reliable YouTube API access
- Provides structured transcript data with precise timestamps
- Returns `YouTubeJSTranscriptResult` or `YouTubeJSTranscriptError` interfaces

**`src/youtube/url-parser.ts`** - YouTube URL handling
- Supports all common YouTube URL formats (youtube.com, youtu.be, embed, etc.)
- Extracts video IDs for API calls

### Tool Parameters & Token Management

**Critical parameter understanding:**
- `maxSegments` (default: 50) - Primary token limit control mechanism
- `summary` (boolean) - Returns every 5th segment for overview mode
- `startTime` (seconds) - Extract from specific video timestamp
- `language` (string) - Transcript language selection

**Token compliance strategy:**
- Default `maxSegments: 50` keeps responses ~2,500 tokens (safe margin under 25,000 limit)
- Filtering metadata shows original vs. filtered counts for transparency
- Users can increase `maxSegments` or use `summary: true` for longer content

### Response Structure
```typescript
{
  success: true,
  data: {
    videoId: string,
    transcript: YouTubeJSTranscriptItem[], // Filtered segments
    language: string,
    totalDuration: number,
    wordCount: number,     // Calculated from filtered data
    segmentCount: number,  // Filtered count
    filtering: {
      originalSegmentCount: number,
      originalWordCount: number,
      startTime: number,
      maxSegments: number,
      summaryMode: boolean,
      isFiltered: boolean
    }
  }
}
```

### Agent OS Integration

The `agent/youtube-video-analyzer.md` file defines an Agent OS agent that uses this MCP tool for comprehensive video analysis. This demonstrates:
- Real-world usage patterns of the transcript tool
- How to handle filtered/truncated transcript data
- Integration with structured analysis workflows

## Important Implementation Details

**Error handling hierarchy:**
1. URL validation via `YouTubeUrlParser`
2. Transcript extraction with `youtubei.js` 
3. MCP error wrapping with appropriate error codes
4. Graceful handling of private/unavailable videos

**Filtering logic priority:**
1. Time-based filtering (`startTime` parameter)
2. Summary mode (every 5th segment) OR segment limiting
3. Word count recalculation for filtered data
4. Metadata preservation for transparency

**Development history context:**
- Originally had 3 tools (transcript, video info, combined data)
- Streamlined to single tool after video info proved unreliable
- Token limits discovered through real-world usage led to conservative defaults
- Comprehensive test suite validates all functionality

## Testing Philosophy

Tests are organized by purpose:
- **Functionality**: Core transcript extraction works
- **Protocol**: MCP compliance and tool registration  
- **Token limits**: Response size validation
- **Edge cases**: URL formats, error scenarios

When modifying the tool parameters or response structure, always run the token limit tests to ensure MCP compliance.

## Development Guidelines

**Commit Message Conventions:**
- Use conventional commit format: `feat:`, `fix:`, `docs:`, etc.
- Write clear, descriptive commit messages
- Do NOT include Claude or AI assistant co-author attribution
- Focus on what the change accomplishes and why

**Code Quality:**
- Run `npm run type-check` before committing
- Ensure all tests pass with `npm test` (if available)
- Follow existing code patterns and naming conventions
- Update documentation when changing tool parameters or behavior