#!/usr/bin/env node

import { spawn } from 'child_process';

async function testMCPVideoInfo() {
  console.log('Testing MCP get_youtube_video_info tool...\n');
  
  const testMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_youtube_video_info',
      arguments: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      }
    }
  };

  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let response = '';
  let hasReceivedResponse = false;

  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim() && line.includes('"jsonrpc"')) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === 1 && !hasReceivedResponse) {
            hasReceivedResponse = true;
            console.log('✅ Received response from MCP server');
            
            if (parsed.result && parsed.result.content) {
              const content = JSON.parse(parsed.result.content[0].text);
              if (content.success) {
                console.log('\n📹 Video Metadata:');
                console.log(`Title: ${content.data.title}`);
                console.log(`Channel: ${content.data.channelName}`);
                console.log(`Duration: ${Math.floor(content.data.duration / 60)}:${(content.data.duration % 60).toString().padStart(2, '0')}`);
                console.log(`Views: ${content.data.viewCount.toLocaleString()}`);
                console.log('\n✅ MCP tool working correctly!');
              } else {
                console.log('❌ Tool returned error:', content.message);
              }
            } else {
              console.log('❌ Unexpected response format');
            }
            
            server.kill();
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    }
  });

  server.stderr.on('data', (data) => {
    const message = data.toString();
    if (message.includes('running on stdio')) {
      // Server is ready, send the test message
      server.stdin.write(JSON.stringify(testMessage) + '\n');
    }
  });

  setTimeout(() => {
    if (!hasReceivedResponse) {
      console.log('❌ Test timed out - no response received');
      server.kill();
    }
  }, 10000);
}

testMCPVideoInfo();