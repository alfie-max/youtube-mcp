#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { YouTubeJSTranscriptExtractor } from './youtube/youtube-js-transcript-extractor.js';

const server = new Server(
  {
    name: 'youtube-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_youtube_transcript',
        description: 'Extract structured transcript data with timestamps and metadata from a YouTube video',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'YouTube video URL (supports youtube.com, youtu.be, and other formats)',
            },
            language: {
              type: 'string',
              description: 'Language code for transcript (e.g., "en", "es", "fr"). Defaults to "en"',
              default: 'en',
            },
            maxSegments: {
              type: 'number',
              description: 'Maximum number of transcript segments to return. Defaults to 50 to ensure token limit compliance',
              default: 50,
            },
            startTime: {
              type: 'number',
              description: 'Start time in seconds to begin transcript extraction from. Defaults to 0',
              default: 0,
            },
            summary: {
              type: 'boolean',
              description: 'If true, returns a condensed version with every 5th segment plus metadata. Defaults to false',
              default: false,
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_youtube_transcript': {
        const {
          url,
          language = 'en',
          maxSegments = 50,
          startTime = 0,
          summary = false
        } = args as {
          url: string;
          language?: string;
          maxSegments?: number;
          startTime?: number;
          summary?: boolean;
        };

        const result = await YouTubeJSTranscriptExtractor.extract(url);

        if ('code' in result) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Failed to extract transcript: ${result.message}`
          );
        }

        // Filter transcript based on startTime
        let filteredTranscript = result.transcript.filter(item => item.start >= startTime);

        // Apply summary mode (every 5th segment) or limit segments
        if (summary) {
          filteredTranscript = filteredTranscript.filter((_, index) => index % 5 === 0);
        } else {
          filteredTranscript = filteredTranscript.slice(0, maxSegments);
        }

        // Calculate stats for the filtered transcript
        const actualWordCount = filteredTranscript.reduce((count, item) => {
          return count + item.text.trim().split(/\s+/).filter(word => word.length > 0).length;
        }, 0);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: {
                  videoId: result.videoId,
                  transcript: filteredTranscript,
                  language: result.language,
                  totalDuration: result.totalDuration,
                  wordCount: actualWordCount,
                  segmentCount: filteredTranscript.length,
                  // Metadata about filtering
                  filtering: {
                    originalSegmentCount: result.segmentCount,
                    originalWordCount: result.wordCount,
                    startTime: startTime,
                    maxSegments: maxSegments,
                    summaryMode: summary,
                    isFiltered: filteredTranscript.length < result.segmentCount
                  }
                },
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('YouTube MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});
