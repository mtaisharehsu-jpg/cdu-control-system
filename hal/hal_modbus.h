#ifndef HAL_MODBUS_H
#define HAL_MODBUS_H

#include <stdint.h> // For uint16_t

// Windows Modbus context 結構
typedef struct {
    char device[256];
    int baud;
    int slave_id;
    int connected;
    void* hSerial;  // Windows HANDLE for serial port
} modbus_t;

// 初始化並連接到一個 Modbus RTU 設備
// 返回一個 modbus context 指標，失敗則返回 NULL
modbus_t* hal_modbus_connect(const char* device, int baud, int slave_id);

// 斷開連接並釋放資源
void hal_modbus_disconnect(modbus_t* ctx);

// 寫入單個保持暫存器
// 成功返回 0，失敗返回 -1
int hal_modbus_write_register(modbus_t* ctx, int addr, int value);
float modbus_read_temperature(const char *device, int addr, int reg);
float modbus_read_pressure(const char *device, int addr, int reg);

// 讀取多個保持暫存器
// 成功返回 0，失敗返回 -1
int hal_modbus_read_registers(modbus_t* ctx, int addr, int num, uint16_t* dest);

#endif // HAL_MODBUS_H