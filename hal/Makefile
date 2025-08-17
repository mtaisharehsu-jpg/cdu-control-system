# Makefile for building the CDU Hardware Abstraction Layer (Windows version)

CC=C:\mingw64\bin\gcc.exe
# -fPIC: Generate Position-Independent Code, required for shared libraries
# -Wall: Enable all warnings
CFLAGS=-fPIC -Wall
# No external libraries needed for simulation version
LDFLAGS=
TARGET=lib-cdu-hal.dll
SOURCES=hal_modbus.c hal_uart.c

all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CC) $(CFLAGS) -shared -o $(TARGET) $(SOURCES) $(LDFLAGS)

clean:
	del $(TARGET)