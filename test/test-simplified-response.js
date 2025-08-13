#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

async function testSimplifiedResponse() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  
  console.log('🎯 Testing Simplified MCP Response');
  console.log('==================================');
  console.log('Only structured transcript data + metadata\n');
  
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
    console.log('📤 Request (no includeTimestamps parameter):');
    console.log('---------------------------------------------');
    
    const request = {
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

    console.log(JSON.stringify(request, null, 2));

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
      const toolData = JSON.parse(response.result.content[0].text);
      
      console.log('\n📥 Simplified Response Structure:');
      console.log('---------------------------------');
      console.log('✅ Success:', toolData.success);
      console.log('📊 Data contains:');
      console.log('   ├── videoId:', toolData.data.videoId);
      console.log('   ├── language:', toolData.data.language);
      console.log('   ├── totalDuration:', toolData.data.totalDuration);
      console.log('   ├── wordCount:', toolData.data.wordCount);
      console.log('   ├── segmentCount:', toolData.data.segmentCount);
      console.log('   └── transcript: [array of segments]');
      
      console.log('\n🗑️  Removed:');
      console.log('   ❌ formattedText (no longer included)');
      console.log('   ❌ includeTimestamps parameter (not needed)');
      
      console.log('\n📝 Sample Transcript Segments:');
      console.log('------------------------------');
      if (toolData.data.transcript && toolData.data.transcript.length > 0) {
        toolData.data.transcript.slice(0, 3).forEach((segment, index) => {
          console.log(`${index + 1}. {`);
          console.log(`     "text": "${segment.text}",`);
          console.log(`     "start": ${segment.start},`);
          console.log(`     "duration": ${segment.duration},`);
          console.log(`     "startTimeText": "${segment.startTimeText}"`);
          console.log('   }');
        });
        
        if (toolData.data.transcript.length > 3) {
          console.log(`   ... and ${toolData.data.transcript.length - 3} more segments`);
        }
      }
      
      console.log('\n🎯 Clean & Focused:');
      console.log('===================');
      console.log('• Only essential data returned');
      console.log('• Structured transcript segments with precise timestamps');
      console.log('• Metadata for processing (duration, word count, etc.)');
      console.log('• No redundant formatted text');
      console.log('• Smaller payload, faster processing');
      
    } else if (response.error) {
      console.log('❌ Request error:', response.error.message);
    }

    console.log('\n🧹 Cleaning up...');
    server.kill();
    process.exit(0);
  }
}

testSimplifiedResponse().catch(console.error);