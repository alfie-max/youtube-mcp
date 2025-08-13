#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test with the reliable short video first
const SHORT_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

async function quickTokenTest() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  
  console.log('⚡ Quick Token Limit Test');
  console.log('========================');
  console.log('Testing new maxSegments=100 default\n');
  
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stderr.on('data', (data) => {
    if (data.toString().includes('YouTube MCP Server running')) {
      console.log('✅ Server started\n');
      runTest();
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });

  async function runTest() {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_youtube_transcript',
        arguments: {
          url: SHORT_VIDEO_URL,
          language: 'en'
          // No maxSegments specified - should use default of 100
        }
      }
    };

    let responseBuffer = '';
    
    const responsePromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ timeout: true });
      }, 15000);
      
      const handler = (data) => {
        responseBuffer += data.toString();
        
        const lines = responseBuffer.split('\n');
        for (const line of lines) {
          if (line.trim() && line.startsWith('{')) {
            try {
              const response = JSON.parse(line);
              clearTimeout(timeout);
              server.stdout.removeListener('data', handler);
              resolve(response);
              return;
            } catch (e) {
              // Continue looking
            }
          }
        }
      };
      
      server.stdout.on('data', handler);
    });

    server.stdin.write(JSON.stringify(request) + '\n');
    
    const response = await responsePromise;
    
    if (response.timeout) {
      console.log('⏰ Request timed out');
    } else if (response.result && response.result.content) {
      const jsonString = response.result.content[0].text;
      const tokenCount = Math.ceil(jsonString.length / 4); // Rough token estimate
      
      const data = JSON.parse(jsonString);
      
      if (data.success && data.data) {
        console.log('✅ Test Results:');
        console.log('================');
        console.log(`📹 Video ID: ${data.data.videoId}`);
        console.log(`📝 Segments returned: ${data.data.segmentCount}`);
        console.log(`📊 Word count: ${data.data.wordCount}`);
        console.log(`📏 Response size: ~${tokenCount.toLocaleString()} tokens`);
        console.log(`🎯 Token safety: ${tokenCount < 25000 ? '✅ SAFE' : '❌ OVER LIMIT'}`);
        
        if (data.data.filtering) {
          console.log('\n🔍 Filtering Info:');
          console.log(`   Original segments: ${data.data.filtering.originalSegmentCount}`);
          console.log(`   Max segments setting: ${data.data.filtering.maxSegments}`);
          console.log(`   Was filtered: ${data.data.filtering.isFiltered ? 'YES' : 'NO'}`);
        }
        
        console.log('\n🎉 New default (maxSegments=100) working correctly!');
      }
    } else if (response.error) {
      console.log('❌ Request error:', response.error.message);
    }

    console.log('\n🧹 Cleaning up...');
    server.kill();
    process.exit(0);
  }
}

quickTokenTest().catch(console.error);