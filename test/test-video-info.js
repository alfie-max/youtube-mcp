#!/usr/bin/env node

import { YouTubeVideoInfoExtractor } from '../dist/youtube/video-info-extractor.js';

async function testVideoInfo() {
  console.log('Testing YouTube Video Info Extractor...\n');
  
  // Test with a well-known video
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll
  
  console.log(`Testing URL: ${testUrl}`);
  console.log('Extracting video metadata...\n');
  
  try {
    const result = await YouTubeVideoInfoExtractor.extract(testUrl);
    
    if (result.success) {
      console.log('✅ Video info extracted successfully!');
      console.log('\n📹 Video Information:');
      console.log(`Title: ${result.data.title}`);
      console.log(`Channel: ${result.data.channelName}`);
      console.log(`Duration: ${Math.floor(result.data.duration / 60)}:${(result.data.duration % 60).toString().padStart(2, '0')}`);
      console.log(`Views: ${result.data.viewCount.toLocaleString()}`);
      console.log(`Published: ${result.data.publishDate}`);
      console.log(`Category: ${result.data.category}`);
      console.log(`Is Live: ${result.data.isLive}`);
      console.log(`Tags: ${result.data.tags.slice(0, 5).join(', ')}${result.data.tags.length > 5 ? '...' : ''}`);
      console.log(`\nDescription (first 200 chars):`);
      console.log(`${result.data.description.substring(0, 200)}${result.data.description.length > 200 ? '...' : ''}`);
    } else {
      console.log('❌ Failed to extract video info:');
      console.log(`Error: ${result.message}`);
      console.log(`Code: ${result.code}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testVideoInfo();