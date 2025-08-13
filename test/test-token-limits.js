#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test with a longer video to verify token limits
const LONG_VIDEO_URL = 'https://www.youtube.com/watch?v=IxkSC8mfWN0'; // 21 minute video

async function testTokenLimits() {
  const serverPath = path.join(__dirname, '..', 'dist', 'server.js');
  
  console.log('🔬 Testing Token Limit Compliance');
  console.log('=================================');
  console.log(`Testing with: ${LONG_VIDEO_URL}`);
  console.log('Expected: Should stay well under 25,000 token limit\n');
  
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stderr.on('data', (data) => {
    if (data.toString().includes('YouTube MCP Server running')) {
      console.log('✅ Server started\n');
      runTests();
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });

  async function runTests() {
    
    // Test 1: Default parameters (should be safe)
    console.log('📊 Test 1: Default Parameters (maxSegments=100)');
    console.log('------------------------------------------------');
    await testWithParams({
      url: LONG_VIDEO_URL,
      language: 'en'
    }, 'Default');

    // Test 2: Summary mode (should be very safe)
    console.log('\n📊 Test 2: Summary Mode');
    console.log('------------------------');
    await testWithParams({
      url: LONG_VIDEO_URL,
      language: 'en',
      summary: true
    }, 'Summary');

    // Test 3: Very small limit (ultra safe)
    console.log('\n📊 Test 3: Ultra Conservative (maxSegments=50)');
    console.log('-----------------------------------------------');
    await testWithParams({
      url: LONG_VIDEO_URL,
      language: 'en',
      maxSegments: 50
    }, 'Conservative');

    console.log('\n🧹 Cleaning up...');
    server.kill();
    process.exit(0);
  }

  async function testWithParams(params, testName) {
    const request = {
      jsonrpc: '2.0',
      id: Math.random(),
      method: 'tools/call',
      params: {
        name: 'get_youtube_transcript',
        arguments: params
      }
    };

    let responseBuffer = '';
    
    const responsePromise = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ timeout: true });
      }, 30000);
      
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
      console.log(`   ⏰ ${testName}: Request timed out`);
    } else if (response.result && response.result.content) {
      const jsonString = response.result.content[0].text;
      const tokenCount = Math.ceil(jsonString.length / 4); // Rough token estimate (4 chars per token)
      
      const data = JSON.parse(jsonString);
      
      if (data.success && data.data) {
        console.log(`   ✅ ${testName}: Success`);
        console.log(`      📝 Segments: ${data.data.segmentCount}`);
        console.log(`      📊 Word count: ${data.data.wordCount}`);
        console.log(`      📏 Response size: ~${tokenCount.toLocaleString()} tokens`);
        console.log(`      🎯 Token safety: ${tokenCount < 25000 ? '✅ SAFE' : '❌ OVER LIMIT'}`);
        
        if (data.data.filtering) {
          console.log(`      🔍 Filtered from ${data.data.filtering.originalSegmentCount} segments`);
          console.log(`      📋 Summary mode: ${data.data.filtering.summaryMode ? 'ON' : 'OFF'}`);
        }
      } else {
        console.log(`   ❌ ${testName}: Failed - ${data.error || 'Unknown error'}`);
      }
    } else if (response.error) {
      console.log(`   ❌ ${testName}: Error - ${response.error.message}`);
    }
  }
}

testTokenLimits().catch(console.error);