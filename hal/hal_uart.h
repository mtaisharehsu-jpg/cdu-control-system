#ifndef HAL_UART_H
#define HAL_UART_H

// 模擬讀取一個 DI pin 的狀態
// 返回值：0 代表 LOW, 1 代表 HIGH
int uart_read_di_pin(const char* device, int pin_number);

#endif // HAL_UART_H
