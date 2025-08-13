#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_URL = 'https://www.youtube.com/watch?v=IxkSC8mfWN0';

async function testSpecificURL() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  
  console.log('🎯 Testing YouTube MCP with Specific URL');
  console.log('========================================');
  console.log(`URL: ${TEST_URL}\n`);
  
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stderr.on('data', (data) => {
    if (data.toString().includes('YouTube MCP Server running')) {
      console.log('✅ Server started successfully\n');
      runTest();
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });

  async function runTest() {
    console.log('📝 Extracting Transcript...');
    console.log('----------------------------');
    
    const transcriptRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_youtube_transcript',
        arguments: {
          url: TEST_URL,
          language: 'en'
        }
      }
    };

    let responseBuffer = '';
    
    const transcriptPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ timeout: true });
      }, 30000); // 30 second timeout for this test
      
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

    server.stdin.write(JSON.stringify(transcriptRequest) + '\n');
    
    const response = await transcriptPromise;
    
    if (response.timeout) {
      console.log('⏰ Request timed out (network issue or long video)');
      console.log('   The video might be very long or there could be network issues.');
    } else if (response.result && response.result.content) {
      const data = JSON.parse(response.result.content[0].text);
      
      if (data.success && data.data) {
        console.log('✅ SUCCESS! Transcript extracted:');
        console.log('================================');
        console.log(`📹 Video ID: ${data.data.videoId}`);
        console.log(`🗣️  Language: ${data.data.language}`);
        console.log(`⏱️  Duration: ${data.data.totalDuration} seconds (${Math.floor(data.data.totalDuration / 60)}:${Math.floor(data.data.totalDuration % 60).toString().padStart(2, '0')})`);
        console.log(`📝 Word count: ${data.data.wordCount}`);
        console.log(`📊 Segments: ${data.data.segmentCount}`);
        
        console.log('\n📋 Transcript Preview (first 10 segments):');
        console.log('------------------------------------------');
        const segments = data.data.transcript;
        segments.slice(0, 10).forEach((segment, index) => {
          console.log(`${(index + 1).toString().padStart(2, ' ')}. [${segment.startTimeText}] ${segment.text}`);
        });
        
        if (segments.length > 10) {
          console.log(`... and ${segments.length - 10} more segments`);
        }
        
        console.log('\n📋 Last 3 segments:');
        console.log('--------------------');
        segments.slice(-3).forEach((segment, index) => {
          console.log(`${(segments.length - 3 + index + 1).toString().padStart(2, ' ')}. [${segment.startTimeText}] ${segment.text}`);
        });
        
      } else {
        console.log('❌ Transcript extraction failed:');
        console.log(`   Error: ${data.error || 'Unknown error'}`);
        
        if (data.error && data.error.includes('No transcript')) {
          console.log('   This video might not have captions/subtitles available.');
        }
      }
    } else if (response.error) {
      console.log('❌ Request error:');
      console.log(`   ${response.error.message}`);
    }

    console.log('\n🧹 Cleaning up...');
    server.kill();
    process.exit(0);
  }
}

testSpecificURL().catch(console.error);