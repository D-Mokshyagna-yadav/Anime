#!/usr/bin/env node

/**
 * AniStream API Test Suite
 * Run with: node test-api.mjs
 */

import http from 'http';

const BASE_URL = 'http://localhost:5000';
const TIMEOUT = 10000;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timeout after ${TIMEOUT}ms`)),
      TIMEOUT
    );

    const req = http.get(url, (res) => {
      clearTimeout(timeout);
      let data = '';

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function test(name, url) {
  try {
    console.log(`\n${colors.cyan}Testing: ${name}${colors.reset}`);
    console.log(`URL: ${url}`);
    
    const response = await makeRequest(url);
    const status = response.status;
    const isSuccess = status >= 200 && status < 300;
    
    const statusColor = isSuccess ? colors.green : colors.red;
    console.log(`${statusColor}Status: ${status}${colors.reset}`);
    
    if (response.body) {
      try {
        const json = JSON.parse(response.body);
        console.log(`${colors.green}✓ Valid JSON response${colors.reset}`);
        console.log(`Response preview: ${JSON.stringify(json).substring(0, 100)}...`);
      } catch (e) {
        console.log(`${colors.red}✗ Invalid JSON: ${e.message}${colors.reset}`);
        console.log(`Raw response: ${response.body.substring(0, 200)}`);
      }
    }
    
    return isSuccess;
  } catch (err) {
    console.log(`${colors.red}✗ Error: ${err.message}${colors.reset}`);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.bold}${colors.cyan}AniStream API Test Suite${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT}ms\n`);
  
  const tests = [
    ['Health Check', `${BASE_URL}/api/health`],
    ['Trending Anime', `${BASE_URL}/api/anime/trending`],
    ['Popular Anime', `${BASE_URL}/api/anime/popular`],
    ['Seasonal Anime', `${BASE_URL}/api/anime/seasonal?season=SPRING&year=2024`],
    ['Search Anime', `${BASE_URL}/api/anime/search?q=naruto`],
    ['Anime Details (ID: 1)', `${BASE_URL}/api/anime/1`],
  ];
  
  const results = [];
  
  for (const [name, url] of tests) {
    const result = await test(name, url);
    results.push({ name, url, result });
  }
  
  // Summary
  console.log(`\n${colors.bold}${colors.cyan}=== Test Summary ===${colors.reset}`);
  const passed = results.filter(r => r.result).length;
  const total = results.length;
  const passColor = passed === total ? colors.green : colors.yellow;
  console.log(`${passColor}Passed: ${passed}/${total}${colors.reset}\n`);
  
  results.forEach(r => {
    const icon = r.result ? colors.green + '✓' : colors.red + '✗';
    console.log(`${icon}${colors.reset} ${r.name}`);
  });
  
  console.log(`\n${colors.cyan}Test execution complete.${colors.reset}`);
  process.exit(passed === total ? 0 : 1);
}

runTests();
