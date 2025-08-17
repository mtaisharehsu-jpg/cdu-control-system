/**
 * Simple status check script
 *
 * This script checks if the development server is running and accessible.
 */

import http from 'http';

const checkServer = () => {
  const options = {
    hostname: 'localhost',
    port: 5173,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log('✅ 開發服務器正在運行');
    console.log(`狀態碼: ${res.statusCode}`);
    console.log(`內容類型: ${res.headers['content-type']}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (data.includes('<div id="root">')) {
        console.log('✅ HTML結構正常');
      } else {
        console.log('⚠️  HTML結構可能有問題');
      }
      
      if (data.includes('script')) {
        console.log('✅ JavaScript文件已載入');
      } else {
        console.log('⚠️  JavaScript文件可能未載入');
      }
    });
  });

  req.on('error', (err) => {
    console.log('❌ 無法連接到開發服務器');
    console.log(`錯誤: ${err.message}`);
    console.log('請確認開發服務器正在運行: npm run dev');
  });

  req.on('timeout', () => {
    console.log('❌ 連接超時');
    req.destroy();
  });

  req.end();
};

console.log('檢查CDU前端開發服務器狀態...');
console.log('目標: http://localhost:5173');
console.log('---');

checkServer();
