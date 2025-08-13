# YouTube MCP
[![smithery badge](https://smithery.ai/badge/@alfie-max/youtube-mcp)](https://smithery.ai/server/@alfie-max/youtube-mcp)

A Model Context Protocol (MCP) server for extracting YouTube video transcripts with advanced filtering capabilities. This streamlined server provides a single, robust tool for AI assistants and MCP clients to get structured transcript data from YouTube videos with comprehensive filtering options and token limit compliance.

## Features

- **Single-purpose transcript extraction** with timestamps and metadata
- **Advanced filtering options** including time-based extraction, summarization, and segment limiting
- **Token-safe defaults** to prevent MCP token limit violations (default 50 segments)
- **Summary mode** for quick video overviews (every 5th segment)
- **Support multiple languages** for transcripts
- **Handle various YouTube URL formats** (youtube.com, youtu.be, embed URLs)
- **Comprehensive error handling** for private videos, unavailable content, etc.
- **Transparent filtering metadata** showing original vs filtered content
- **Built with YouTube.js** for reliable transcript panel access

## Installation

### Installing via Smithery

To install youtube-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@alfie-max/youtube-mcp):

```bash
npx -y @smithery/cli install @alfie-max/youtube-mcp --client claude
```

### Manual Installation
1. Clone the repository:
```bash
git clone <repository-url>
cd youtube-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Usage

### Running the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

### MCP Tool

The server provides a single, comprehensive tool:

#### `get_youtube_transcript`
Extract structured transcript data with advanced filtering capabilities.

**Parameters:**
- `url` (required): YouTube video URL (supports all common formats)
- `language` (optional): Language code (e.g., "en", "es", "fr"). Defaults to "en"
- `maxSegments` (optional): Maximum number of transcript segments to return. Defaults to 50 for token limit compliance
- `startTime` (optional): Start time in seconds to begin transcript extraction. Defaults to 0
- `summary` (optional): Return condensed version with every 5th segment. Defaults to false

**Token Management:**
- Default `maxSegments: 50` keeps responses under ~2,500 tokens (safe for MCP 25,000 token limit)
- Use `summary: true` for longer videos to get overview with every 5th segment
- Increase `maxSegments` for more detailed extraction when needed

### Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

### Example Response

```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "transcript": [
      {
        "text": "We're no strangers to love",
        "start": 12.5,
        "duration": 3.2,
        "startTimeText": "0:12"
      },
      {
        "text": "You know the rules and so do I",
        "start": 15.7,
        "duration": 2.8,
        "startTimeText": "0:15"
      }
    ],
    "language": "en",
    "totalDuration": 213,
    "wordCount": 156,
    "segmentCount": 50,
    "filtering": {
      "originalSegmentCount": 245,
      "originalWordCount": 890,
      "startTime": 0,
      "maxSegments": 50,
      "summaryMode": false,
      "isFiltered": true
    }
  }
}
```

## Error Handling

The server handles various error scenarios gracefully:

- **Invalid URLs**: Returns clear error message for malformed YouTube URLs
- **Private/Deleted Videos**: Indicates when videos are unavailable
- **No Transcripts**: Handles videos without available captions
- **Network Errors**: Provides meaningful error messages for connection issues

## Claude Code Integration

### Local Setup for Claude Code

1. **Clone and build the project:**
```bash
git clone <repository-url>
cd youtube-mcp
npm install
npm run build
```

2. **Configure Claude Code MCP settings:**

Add to your Claude Code configuration file (typically `~/.claude/mcp_servers.json`):
```json
{
  "youtube-mcp": {
    "command": "node",
    "args": ["/absolute/path/to/youtube-mcp/dist/server.js"],
    "env": {}
  }
}
```

**Important:** Use the absolute path to your built `dist/server.js` file.

3. **Restart Claude Code** to load the MCP server.

4. **Verify the setup:**
After restart, you should see the `get_youtube_transcript` tool available in Claude Code. Test with:
```
Can you extract the transcript from this YouTube video: https://youtu.be/dQw4w9WgXcQ
```

### Agent OS Integration

This project includes an Agent OS agent configuration for comprehensive YouTube video analysis.

#### Setting up the YouTube Video Analyzer Agent

1. **Copy the agent configuration:**
```bash
# Copy to your global Agent OS agents directory
cp agent/youtube-video-analyzer.md ~/.agent-os/agents/

# Or copy to a project-specific location
cp agent/youtube-video-analyzer.md .agent-os/agents/
```

2. **Use the agent in Claude Code:**
```
@agent:youtube-video-analyzer

Please analyze this video comprehensively: https://youtu.be/VIDEO_ID
```

#### Agent Capabilities

The YouTube Video Analyzer agent provides:
- **One-line overview** of video content
- **3-5 key takeaways** with main insights
- **Detailed timestamped breakdown** with clickable links
- **Important quotes** from the transcript
- **Action items** derived from content
- **Resources mentioned** in the video
- **Structured markdown output** for easy consumption

#### Example Agent Usage

```
@agent:youtube-video-analyzer

Analyze this tutorial video and give me the key programming concepts covered: https://youtu.be/EXAMPLE_ID
```

The agent will automatically:
1. Extract the full transcript using this MCP server
2. Handle token limits intelligently (may use summary mode for long videos)
3. Provide comprehensive analysis with timestamps
4. Format everything in readable markdown

### Development Workflow with Claude Code

1. **Development mode:**
```bash
npm run dev  # Run with auto-reload during development
```

2. **Testing the MCP integration:**
```bash
# Test the tool directly
node test/manual-test.js

# Verify token limits
node test/quick-token-test.js
```

3. **Update configuration after changes:**
```bash
npm run build  # Rebuild after code changes
# Restart Claude Code to pick up changes
```

### Troubleshooting

**MCP Server not loading:**
- Verify the absolute path in your MCP configuration
- Check that `dist/server.js` exists (run `npm run build`)
- Restart Claude Code completely after configuration changes
- Check Claude Code logs for MCP connection errors

**Transcript extraction failing:**
- Test with the manual test: `node test/simple-transcript-test.js`
- Verify the YouTube URL format is supported
- Check if the video has captions available
- Some private/restricted videos may not have accessible transcripts

**Token limit issues:**
- Use `summary: true` for very long videos
- Adjust `maxSegments` parameter (default 50 is conservative)
- Run `node test/quick-token-test.js` to verify token usage

**Agent not found:**
- Ensure agent file is in the correct directory: `~/.agent-os/agents/` or `.agent-os/agents/`
- Verify the agent file has `.md` extension
- Check that Agent OS is properly configured in your environment

## Development

### Scripts

- `npm run dev` - Run in development mode with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run type-check` - Check TypeScript types without building

### Project Structure

```
src/
├── server.ts                           # Main MCP server with tool implementation
└── youtube/
    ├── youtube-js-transcript-extractor.ts  # Core transcript extraction using YouTube.js
    └── url-parser.ts                   # YouTube URL parsing utilities
test/                                   # Comprehensive test suite
├── simple-transcript-test.js           # Main functionality tests
├── test-simplified-response.js         # Response structure validation
├── manual-test.js                      # MCP protocol compliance tests
├── single-url-test.js                  # Detailed transcript display
└── quick-token-test.js                 # Token limit verification
agent/
└── youtube-video-analyzer.md           # Agent OS integration example
```

## Dependencies

- `@modelcontextprotocol/sdk` - Official MCP SDK for server implementation
- `youtubei.js` - Reliable YouTube transcript panel access
- `url-parse` - URL parsing utilities for YouTube URL formats

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
