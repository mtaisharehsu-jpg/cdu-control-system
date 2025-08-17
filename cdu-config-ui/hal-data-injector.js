// HAL 數據注入腳本 - 直接在頁面中運行以顯示真實HAL數據
(function() {
  console.log('🚀 HAL Data Injector v1.0 - Starting...');
  
  let isInjectorActive = false;
  
  // 獲取真實HAL數據並更新頁面顯示
  async function updateHALData() {
    try {
      const response = await fetch('http://localhost:8001/api/v1/sensors/readings');
      if (!response.ok) return;
      
      const apiData = await response.json();
      console.log('📊 HAL Data received:', apiData);
      
      // 更新頁面顯示
      const rows = document.querySelectorAll('table tbody tr');
      let updatedCount = 0;
      
      rows.forEach(row => {
        const nameCell = row.cells[0];
        const valueCell = row.cells[2];
        
        if (nameCell && valueCell) {
          const sensorName = nameCell.textContent;
          
          // 溫度感測器 1 -> Temp1
          if (sensorName.includes('分散式溫度感測器 1')) {
            const temp1 = apiData.find(s => s.block_id === 'Temp1');
            if (temp1 && temp1.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${temp1.value.toFixed(1)} °C</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // 壓力感測器 1 -> Press1  
          if (sensorName.includes('分散式壓力感測器 1')) {
            const press1 = apiData.find(s => s.block_id === 'Press1');
            if (press1 && press1.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${press1.value.toFixed(1)} bar</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // 溫度感測器 2 -> Temp2
          if (sensorName.includes('分散式溫度感測器 2') || (sensorName.includes('溫度') && sensorName.includes('2'))) {
            const temp2 = apiData.find(s => s.block_id === 'Temp2');
            if (temp2 && temp2.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${temp2.value.toFixed(1)} °C</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // PLC溫度感測器 -> PLC1-Temp4
          if (sensorName.includes('PLC1-Temp4') || sensorName.includes('PLC溫度') || sensorName.includes('PLC1-Temp4 - MitsubishiPLCBlock')) {
            const plcTemp4 = apiData.find(s => s.block_id === 'PLC1-Temp4');
            if (plcTemp4 && plcTemp4.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${plcTemp4.value.toFixed(1)} °C</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // 溫度感測器 3 -> Temp3
          if (sensorName.includes('Temp3') || sensorName.includes('分散式溫度感測器 3') || (sensorName.includes('溫度') && sensorName.includes('3'))) {
            const temp3 = apiData.find(s => s.block_id === 'Temp3');
            if (temp3 && temp3.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${temp3.value.toFixed(1)} °C</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // PLC溫度感測器 5 -> PLC1-Temp5
          if (sensorName.includes('PLC1-Temp5') || sensorName.includes('PLC溫度5') || sensorName.includes('PLC1-Temp5 - MitsubishiPLCBlock')) {
            const plcTemp5 = apiData.find(s => s.block_id === 'PLC1-Temp5');
            if (plcTemp5 && plcTemp5.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${plcTemp5.value.toFixed(1)} °C</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // PLC壓力感測器 1 -> PLC1-Press1
          if (sensorName.includes('PLC1-Press1') || sensorName.includes('PLC壓力1') || sensorName.includes('PLC1-Press1 - MitsubishiPLCBlock')) {
            const plcPress1 = apiData.find(s => s.block_id === 'PLC1-Press1');
            if (plcPress1 && plcPress1.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${plcPress1.value.toFixed(1)} Bar</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
          
          // PLC流量感測器 1 -> PLC1-Flow1
          if (sensorName.includes('PLC1-Flow1') || sensorName.includes('PLC流量1') || sensorName.includes('PLC1-Flow1 - MitsubishiPLCBlock')) {
            const plcFlow1 = apiData.find(s => s.block_id === 'PLC1-Flow1');
            if (plcFlow1 && plcFlow1.health === 'OK') {
              valueCell.innerHTML = `<span style="color:#1976d2;font-weight:bold">${plcFlow1.value.toFixed(1)} L/min</span>`;
              addHALBadge(nameCell);
              updatedCount++;
            }
          }
        }
      });
      
      if (updatedCount > 0) {
        console.log(`✅ Updated ${updatedCount} sensors with real HAL data`);
        
        // 更新狀態指示器
        updateStatusIndicator(apiData.length);
      }
      
    } catch (error) {
      console.warn('⚠️ HAL Data update failed:', error.message);
    }
  }
  
  // 添加HAL標籤
  function addHALBadge(nameCell) {
    if (!nameCell.querySelector('.hal-badge')) {
      const halBadge = document.createElement('span');
      halBadge.className = 'hal-badge';
      halBadge.textContent = 'HAL';
      halBadge.style.cssText = 'margin-left:8px;padding:2px 6px;background:#4caf50;color:white;border-radius:10px;font-size:10px;font-weight:normal;';
      nameCell.appendChild(halBadge);
    }
  }
  
  // 更新狀態指示器
  function updateStatusIndicator(sensorCount) {
    // 尋找HAL狀態顯示區域並更新
    const statusChips = document.querySelectorAll('[class*="MuiChip"]');
    statusChips.forEach(chip => {
      if (chip.textContent.includes('模擬數據')) {
        chip.textContent = '真實HAL數據';
        chip.style.backgroundColor = '#4caf50';
        chip.style.color = 'white';
      }
    });
  }
  
  // 啟動HAL數據注入器
  function startHALInjector() {
    if (isInjectorActive) {
      console.log('🔄 HAL Injector already running');
      return;
    }
    
    isInjectorActive = true;
    console.log('▶️ Starting HAL Data Injector');
    
    // 立即執行一次
    updateHALData();
    
    // 每3秒更新一次
    const interval = setInterval(updateHALData, 1000);
    
    // 存儲interval ID以便停止
    window.halInjectorInterval = interval;
    
    console.log('✅ HAL Data Injector started successfully');
  }
  
  // 停止HAL數據注入器
  function stopHALInjector() {
    if (window.halInjectorInterval) {
      clearInterval(window.halInjectorInterval);
      window.halInjectorInterval = null;
      isInjectorActive = false;
      console.log('⏹️ HAL Data Injector stopped');
    }
  }
  
  // 等待頁面加載完成後啟動
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startHALInjector);
  } else {
    startHALInjector();
  }
  
  // 暴露控制函數到全局
  window.HALInjector = {
    start: startHALInjector,
    stop: stopHALInjector,
    update: updateHALData
  };
  
})();