#include "hal_modbus.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <windows.h>

modbus_t* hal_modbus_connect(const char* device, int baud, int slave_id) {
    modbus_t *ctx = (modbus_t*)malloc(sizeof(modbus_t));
    if (ctx == NULL) {
        fprintf(stderr, "Failed to allocate memory for modbus context\n");
        return NULL;
    }

    // 初始化 modbus context
    strncpy(ctx->device, device, sizeof(ctx->device) - 1);
    ctx->device[sizeof(ctx->device) - 1] = '\0';
    ctx->baud = baud;
    ctx->slave_id = slave_id;
    ctx->connected = 0;
    ctx->hSerial = NULL;

    // 嘗試打開串口
    char port_name[32];
    snprintf(port_name, sizeof(port_name), "\\\\.\\%s", device);

    HANDLE hSerial = CreateFileA(port_name,
                                GENERIC_READ | GENERIC_WRITE,
                                0,
                                NULL,
                                OPEN_EXISTING,
                                FILE_ATTRIBUTE_NORMAL,
                                NULL);

    if (hSerial == INVALID_HANDLE_VALUE) {
        DWORD error = GetLastError();
        printf("HAL: Failed to open serial port %s, error: %lu", device, error);
        switch(error) {
            case 2: printf(" (File not found - port may not exist)\n"); break;
            case 5: printf(" (Access denied - port may be in use by another application)\n"); break;
            case 87: printf(" (Invalid parameter)\n"); break;
            default: printf(" (Unknown error)\n"); break;
        }
        free(ctx);
        return NULL;
    }

    // 設定串口參數
    DCB dcbSerialParams = {0};
    dcbSerialParams.DCBlength = sizeof(dcbSerialParams);

    if (!GetCommState(hSerial, &dcbSerialParams)) {
        printf("HAL: Failed to get comm state\n");
        CloseHandle(hSerial);
        free(ctx);
        return NULL;
    }

    dcbSerialParams.BaudRate = baud;
    dcbSerialParams.ByteSize = 8;
    dcbSerialParams.StopBits = ONESTOPBIT;
    dcbSerialParams.Parity = NOPARITY;

    if (!SetCommState(hSerial, &dcbSerialParams)) {
        printf("HAL: Failed to set comm state\n");
        CloseHandle(hSerial);
        free(ctx);
        return NULL;
    }

    // 設定超時
    COMMTIMEOUTS timeouts = {0};
    timeouts.ReadIntervalTimeout = 50;
    timeouts.ReadTotalTimeoutConstant = 50;
    timeouts.ReadTotalTimeoutMultiplier = 10;
    timeouts.WriteTotalTimeoutConstant = 50;
    timeouts.WriteTotalTimeoutMultiplier = 10;

    if (!SetCommTimeouts(hSerial, &timeouts)) {
        printf("HAL: Failed to set timeouts\n");
        CloseHandle(hSerial);
        free(ctx);
        return NULL;
    }

    ctx->hSerial = hSerial;
    ctx->connected = 1;

    printf("HAL: Successfully opened serial port %s, slave ID %d, baud %d\n",
           device, slave_id, baud);
    return ctx;
}

void hal_modbus_disconnect(modbus_t* ctx) {
    if (ctx) {
        printf("HAL: Disconnecting modbus device %s\n", ctx->device);
        if (ctx->hSerial && ctx->hSerial != INVALID_HANDLE_VALUE) {
            CloseHandle((HANDLE)ctx->hSerial);
        }
        ctx->connected = 0;
        free(ctx);
    }
}

int hal_modbus_write_register(modbus_t* ctx, int addr, int value) {
    if (ctx == NULL || !ctx->connected) return -1;

    printf("HAL: Writing register [device:%s, addr:0x%04X, value:%d]\n",
           ctx->device, addr, value);

    // 模擬寫入操作（總是成功）
    return 0; // Success
}

int hal_modbus_read_registers(modbus_t* ctx, int addr, int num, uint16_t* dest) {
    if (ctx == NULL || !ctx->connected || dest == NULL) return -1;

    printf("HAL: Reading %d registers from [device:%s, addr:0x%04X]\n",
           num, ctx->device, addr);

    // 模擬讀取操作 - 生成一些模擬數據
    srand((unsigned int)time(NULL) + addr);
    for (int i = 0; i < num; i++) {
        dest[i] = (uint16_t)(rand() % 4000 + 1000); // 1000-5000 範圍的隨機值
    }

    return 0; // Success
}

// 計算 Modbus RTU CRC16
static unsigned short crc16(unsigned char *buffer, unsigned short buffer_length) {
    unsigned short crc = 0xFFFF;

    for (int pos = 0; pos < buffer_length; pos++) {
        crc ^= (unsigned short)buffer[pos];

        for (int i = 8; i != 0; i--) {
            if ((crc & 0x0001) != 0) {
                crc >>= 1;
                crc ^= 0xA001;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

// 讀取溫度感測器
float modbus_read_temperature(const char *device, int addr, int reg) {
    printf("HAL: Reading temperature from device %s, addr %d, reg 0x%04X\n", device, addr, reg);

    // 打開串口
    char port_name[32];
    snprintf(port_name, sizeof(port_name), "\\\\.\\%s", device);

    HANDLE hSerial = CreateFileA(port_name,
                                GENERIC_READ | GENERIC_WRITE,
                                0,
                                NULL,
                                OPEN_EXISTING,
                                FILE_ATTRIBUTE_NORMAL,
                                NULL);

    if (hSerial == INVALID_HANDLE_VALUE) {
        printf("HAL: Failed to open serial port %s, error: %lu\n", device, GetLastError());
        return -1.0f;
    }

    // 設定串口參數
    DCB dcbSerialParams = {0};
    dcbSerialParams.DCBlength = sizeof(dcbSerialParams);

    if (!GetCommState(hSerial, &dcbSerialParams)) {
        printf("HAL: Failed to get comm state\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    dcbSerialParams.BaudRate = 9600;
    dcbSerialParams.ByteSize = 8;
    dcbSerialParams.Parity = NOPARITY;
    dcbSerialParams.StopBits = ONESTOPBIT;
    dcbSerialParams.fBinary = TRUE;
    dcbSerialParams.fParity = FALSE;
    dcbSerialParams.fOutxCtsFlow = FALSE;
    dcbSerialParams.fOutxDsrFlow = FALSE;
    dcbSerialParams.fDtrControl = DTR_CONTROL_DISABLE;
    dcbSerialParams.fDsrSensitivity = FALSE;
    dcbSerialParams.fTXContinueOnXoff = FALSE;
    dcbSerialParams.fOutX = FALSE;
    dcbSerialParams.fInX = FALSE;
    dcbSerialParams.fErrorChar = FALSE;
    dcbSerialParams.fNull = FALSE;
    dcbSerialParams.fRtsControl = RTS_CONTROL_DISABLE;
    dcbSerialParams.fAbortOnError = FALSE;

    if (!SetCommState(hSerial, &dcbSerialParams)) {
        printf("HAL: Failed to set comm state\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 設定超時 (參考工作程式的設定)
    COMMTIMEOUTS timeouts = {0};
    timeouts.ReadIntervalTimeout = 50;
    timeouts.ReadTotalTimeoutMultiplier = 10;
    timeouts.ReadTotalTimeoutConstant = 1000;
    timeouts.WriteTotalTimeoutMultiplier = 10;
    timeouts.WriteTotalTimeoutConstant = 1000;

    if (!SetCommTimeouts(hSerial, &timeouts)) {
        printf("HAL: Failed to set timeouts\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 構建 Modbus RTU 請求 (Function Code 3: Read Holding Registers)
    unsigned char request[8];
    request[0] = (unsigned char)addr;  // Slave address
    request[1] = 0x03;                 // Function code (Read Holding Registers)
    request[2] = (unsigned char)(reg >> 8);    // Register address (high byte)
    request[3] = (unsigned char)(reg & 0xFF);  // Register address (low byte)
    request[4] = 0x00;                 // Number of registers (high byte)
    request[5] = 0x01;                 // Number of registers (low byte)

    // 計算 CRC (參考工作程式的順序)
    unsigned short crc = crc16(request, 6);
    request[6] = (unsigned char)(crc & 0xFF);        // CRC 低位元組
    request[7] = (unsigned char)((crc >> 8) & 0xFF); // CRC 高位元組

    // 清空接收緩衝區
    PurgeComm(hSerial, PURGE_RXCLEAR | PURGE_TXCLEAR);

    // 發送請求
    DWORD bytes_written = 0;
    if (!WriteFile(hSerial, request, 8, &bytes_written, NULL) || bytes_written != 8) {
        printf("HAL: Failed to write to serial port\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 等待回應
    Sleep(100);

    // 接收回應 (使用循環讀取策略)
    unsigned char response[256];
    DWORD bytes_read = 0;
    DWORD total_read = 0;
    DWORD start_time = GetTickCount();

    while (total_read < sizeof(response) && (GetTickCount() - start_time) < 1000) {
        if (ReadFile(hSerial, response + total_read, sizeof(response) - total_read, &bytes_read, NULL)) {
            if (bytes_read > 0) {
                total_read += bytes_read;
                if (total_read >= 7) break; // 最少需要 7 個位元組
            }
        }
        Sleep(10);
    }

    if (total_read < 7) {
        printf("HAL: Failed to read from serial port or timeout (read %lu bytes)\n", total_read);
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 關閉串口
    CloseHandle(hSerial);

    // 顯示接收到的數據 (除錯用)
    printf("HAL: Received %lu bytes: ", total_read);
    for (DWORD i = 0; i < total_read; i++) {
        printf("%02X ", response[i]);
    }
    printf("\n");

    // 檢查回應
    if (response[0] != addr || response[1] != 0x03) {
        printf("HAL: Invalid response (expected addr=%d func=03, got addr=%d func=%02X)\n",
               addr, response[0], response[1]);
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 檢查數據長度
    if (total_read < 5 || response[2] != 2) {
        printf("HAL: Invalid data length in response (expected 2 bytes, got %d)\n",
               total_read >= 3 ? response[2] : 0);
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 解析溫度值 (16 位整數，根據實際設備調整單位)
    unsigned short raw_temp = (response[3] << 8) | response[4];
    float temperature = raw_temp / 10.0f;  // 假設單位為 0.1°C

    printf("HAL: Successfully read temperature: %.1f°C (raw: %d)\n", temperature, raw_temp);
    return temperature;
}

// 讀取壓力感測器
float modbus_read_pressure(const char *device, int addr, int reg) {
    printf("HAL: Reading pressure from device %s, addr %d, reg 0x%04X\n", device, addr, reg);

    // 打開串口
    char port_name[32];
    snprintf(port_name, sizeof(port_name), "\\\\.\\%s", device);

    HANDLE hSerial = CreateFileA(port_name,
                                GENERIC_READ | GENERIC_WRITE,
                                0,
                                NULL,
                                OPEN_EXISTING,
                                FILE_ATTRIBUTE_NORMAL,
                                NULL);

    if (hSerial == INVALID_HANDLE_VALUE) {
        printf("HAL: Failed to open serial port %s, error: %lu\n", device, GetLastError());
        return -1.0f;
    }

    // 設定串口參數
    DCB dcbSerialParams = {0};
    dcbSerialParams.DCBlength = sizeof(dcbSerialParams);

    if (!GetCommState(hSerial, &dcbSerialParams)) {
        printf("HAL: Failed to get comm state\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    dcbSerialParams.BaudRate = 9600;
    dcbSerialParams.ByteSize = 8;
    dcbSerialParams.Parity = NOPARITY;
    dcbSerialParams.StopBits = ONESTOPBIT;
    dcbSerialParams.fBinary = TRUE;
    dcbSerialParams.fParity = FALSE;
    dcbSerialParams.fOutxCtsFlow = FALSE;
    dcbSerialParams.fOutxDsrFlow = FALSE;
    dcbSerialParams.fDtrControl = DTR_CONTROL_DISABLE;
    dcbSerialParams.fDsrSensitivity = FALSE;
    dcbSerialParams.fTXContinueOnXoff = FALSE;
    dcbSerialParams.fOutX = FALSE;
    dcbSerialParams.fInX = FALSE;
    dcbSerialParams.fErrorChar = FALSE;
    dcbSerialParams.fNull = FALSE;
    dcbSerialParams.fRtsControl = RTS_CONTROL_DISABLE;
    dcbSerialParams.fAbortOnError = FALSE;

    if (!SetCommState(hSerial, &dcbSerialParams)) {
        printf("HAL: Failed to set comm state\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 設定超時
    COMMTIMEOUTS timeouts = {0};
    timeouts.ReadIntervalTimeout = 50;
    timeouts.ReadTotalTimeoutConstant = 500;
    timeouts.ReadTotalTimeoutMultiplier = 10;
    timeouts.WriteTotalTimeoutConstant = 50;
    timeouts.WriteTotalTimeoutMultiplier = 10;

    if (!SetCommTimeouts(hSerial, &timeouts)) {
        printf("HAL: Failed to set timeouts\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 構建 Modbus RTU 請求 (Function Code 3: Read Holding Registers)
    unsigned char request[8];
    request[0] = (unsigned char)addr;  // Slave address
    request[1] = 0x03;                 // Function code (Read Holding Registers)
    request[2] = (unsigned char)(reg >> 8);    // Register address (high byte)
    request[3] = (unsigned char)(reg & 0xFF);  // Register address (low byte)
    request[4] = 0x00;                 // Number of registers (high byte)
    request[5] = 0x01;                 // Number of registers (low byte)

    // 計算 CRC
    unsigned short crc = crc16(request, 6);
    request[6] = (unsigned char)(crc & 0xFF);       // CRC (low byte)
    request[7] = (unsigned char)((crc >> 8) & 0xFF); // CRC (high byte)

    // 清空接收緩衝區
    PurgeComm(hSerial, PURGE_RXCLEAR | PURGE_TXCLEAR);

    // 發送請求
    DWORD bytes_written = 0;
    if (!WriteFile(hSerial, request, 8, &bytes_written, NULL) || bytes_written != 8) {
        printf("HAL: Failed to write to serial port\n");
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 等待回應
    Sleep(100);

    // 接收回應 (使用循環讀取策略)
    unsigned char response[256];
    DWORD bytes_read = 0;
    DWORD total_read = 0;
    DWORD start_time = GetTickCount();

    while (total_read < sizeof(response) && (GetTickCount() - start_time) < 1000) {
        if (ReadFile(hSerial, response + total_read, sizeof(response) - total_read, &bytes_read, NULL)) {
            if (bytes_read > 0) {
                total_read += bytes_read;
                if (total_read >= 7) break; // 最少需要 7 個位元組
            }
        }
        Sleep(10);
    }

    if (total_read < 7) {
        printf("HAL: Failed to read from serial port or timeout (read %lu bytes)\n", total_read);
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 關閉串口
    CloseHandle(hSerial);

    // 顯示接收到的數據 (除錯用)
    printf("HAL: Received %lu bytes: ", total_read);
    for (DWORD i = 0; i < total_read; i++) {
        printf("%02X ", response[i]);
    }
    printf("\n");

    // 檢查回應
    if (response[0] != addr || response[1] != 0x03) {
        printf("HAL: Invalid response (expected addr=%d func=03, got addr=%d func=%02X)\n",
               addr, response[0], response[1]);
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 檢查數據長度
    if (total_read < 5 || response[2] != 2) {
        printf("HAL: Invalid data length in response (expected 2 bytes, got %d)\n",
               total_read >= 3 ? response[2] : 0);
        CloseHandle(hSerial);
        return -1.0f;
    }

    // 解析壓力值 (16 位整數，根據實際設備調整單位)
    unsigned short raw_pressure = (response[3] << 8) | response[4];
    float pressure = raw_pressure / 100.0f;  // 假設單位為 0.01 Bar

    printf("HAL: Successfully read pressure: %.2f Bar (raw: %d)\n", pressure, raw_pressure);
    return pressure;
}