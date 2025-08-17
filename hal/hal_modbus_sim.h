#ifndef HAL_MODBUS_SIM_H
#define HAL_MODBUS_SIM_H

#include <stdint.h>

// 模擬的 modbus context 結構
typedef struct {
    char device[256];
    int baud;
    int slave_id;
    int connected;
} modbus_sim_t;

// 初始化並連接到一個 Modbus RTU 設備（模擬版本）
modbus_sim_t* hal_modbus_connect(const char* device, int baud, int slave_id);

// 斷開連接並釋放資源
void hal_modbus_disconnect(modbus_sim_t* ctx);

// 寫入單個保持暫存器
int hal_modbus_write_register(modbus_sim_t* ctx, int addr, int value);

// 讀取多個保持暫存器
int hal_modbus_read_registers(modbus_sim_t* ctx, int addr, int num, uint16_t* dest);

// 讀取溫度感測器
float modbus_read_temperature(const char *device, int addr, int reg);

// 讀取壓力感測器
float modbus_read_pressure(const char *device, int addr, int reg);

#endif // HAL_MODBUS_SIM_H
