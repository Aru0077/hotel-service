const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/v1/health',
  method: 'GET',
  timeout: 5000,
  headers: {
    'User-Agent': 'Docker-HealthCheck/1.0'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('健康检查通过');
      process.exit(0);
    } else {
      console.error(`健康检查失败: HTTP ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error(`健康检查连接错误: ${err.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('健康检查请求超时');
  req.destroy();
  process.exit(1);
});

req.setTimeout(5000);
req.end();