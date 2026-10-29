const { spawn } = require('child_process');
const http = require('http');

console.log('[Deploy] Checking local ScholarTrack server on port 5050...');

function checkServer() {
  return new Promise((resolve) => {
    http.get('http://localhost:5050/api/health', (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

async function startDeploymentTunnel() {
  const isUp = await checkServer();
  if (!isUp) {
    console.log('[Deploy] Server not running on 5050. Starting unified server...');
    const serverProc = spawn('node', ['server/server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: '5050', NODE_ENV: 'production' },
      stdio: 'inherit'
    });
    // Wait 3 seconds for server to boot
    await new Promise(r => setTimeout(r, 3000));
  } else {
    console.log('[Deploy] Unified server is active on port 5050.');
  }

  console.log('[Deploy] Initializing public HTTPS tunnel...');
  
  const tunnel = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-R', '80:localhost:5050',
    'nokey@localhost.run'
  ]);

  tunnel.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
    if (match) {
      console.log('\n======================================================');
      console.log('🚀 SCHOLARTRACK DEPLOYED & LIVE PUBLIC LINK:');
      console.log('🔗 URL: ' + match[0]);
      console.log('======================================================\n');
    }
  });

  tunnel.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Error') || text.includes('fatal')) {
      console.error('[Tunnel Error]', text.trim());
    }
  });

  tunnel.on('close', (code) => {
    console.log(`[Tunnel] Process exited with code ${code}. Reconnecting in 3s...`);
    setTimeout(startDeploymentTunnel, 3000);
  });
}

startDeploymentTunnel();
