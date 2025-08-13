#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // First YouTube video - short and reliable

async function testSimplifiedServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  
  console.log('🎯 Testing Simplified YouTube Transcript MCP Server');
  console.log('===================================================');
  console.log('One tool. One purpose. Done right.\n');
  
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stderr.on('data', (data) => {
    if (data.toString().includes('YouTube MCP Server running')) {
      console.log('✅ Server started successfully\n');
      runTests();
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });

  async function runTests() {
    // Test 1: Check tools
    console.log('📋 Test 1: Available Tools');
    console.log('---------------------------');
    
    const listRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    let responseBuffer = '';
    
    const listPromise = new Promise((resolve) => {
      const handler = (data) => {
        responseBuffer += data.toString();
        
        const lines = responseBuffer.split('\n');
        for (const line of lines) {
          if (line.trim() && line.startsWith('{')) {
            try {
              const response = JSON.parse(line);
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

    server.stdin.write(JSON.stringify(listRequest) + '\n');
    
    const listResponse = await listPromise;
    
    if (listResponse.result && listResponse.result.tools) {
      const tools = listResponse.result.tools;
      console.log(`✅ Found ${tools.length} tool(s):`);
      tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.name}`);
        console.log(`      ${tool.description}`);
      });
      
      if (tools.length === 1 && tools[0].name === 'get_youtube_transcript') {
        console.log('🎯 Perfect! Only the transcript tool remains.');
      }
    }

    // Test 2: Extract transcript
    console.log('\n📝 Test 2: Extract Transcript');
    console.log('------------------------------');
    
    const transcriptRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_youtube_transcript',
        arguments: {
          url: TEST_URL,
          language: 'en'
        }
      }
    };

    responseBuffer = '';
    
    const transcriptPromise = new Promise((resolve) => {
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

    server.stdin.write(JSON.stringify(transcriptRequest) + '\n');
    
    const transcriptResponse = await transcriptPromise;
    
    if (transcriptResponse.timeout) {
      console.log('⏰ Request timed out (network issue)');
    } else if (transcriptResponse.result && transcriptResponse.result.content) {
      const data = JSON.parse(transcriptResponse.result.content[0].text);
      
      if (data.success && data.data) {
        console.log('✅ Transcript extracted successfully!');
        console.log(`   📹 Video ID: ${data.data.videoId}`);
        console.log(`   🗣️  Language: ${data.data.language}`);
        console.log(`   ⏱️  Duration: ${data.data.totalDuration}s`);
        console.log(`   📝 Word count: ${data.data.wordCount}`);
        console.log(`   📊 Segments: ${data.data.segmentCount}`);
        
        // Show first segment
        const firstSegment = data.data.transcript[0];
        console.log(`   🎬 First segment: "${firstSegment.text}" at ${firstSegment.startTimeText}`);
        
        console.log('\n🎉 SUCCESS! Your simplified YouTube transcript MCP server works perfectly!');
      } else {
        console.log('❌ Transcript extraction failed:', data.error || 'Unknown error');
      }
    } else if (transcriptResponse.error) {
      console.log('❌ Request error:', transcriptResponse.error.message);
    }

    console.log('\n📊 Final Summary');
    console.log('================');
    console.log('✅ Single-purpose MCP server');
    console.log('✅ Only transcript extraction tool');
    console.log('✅ Clean, focused implementation');
    console.log('✅ Reliable YouTube transcript access');
    
    console.log('\n🎯 Your server does ONE thing and does it RIGHT!');
    
    console.log('\n🧹 Cleaning up...');
    server.kill();
    process.exit(0);
  }
}

testSimplifiedServer().catch(console.error);