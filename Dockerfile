FROM python:3.9-slim

WORKDIR /app

# 安裝系統依賴 (用於編譯C函式庫及Modbus通訊)
RUN apt-get update && apt-get install -y \
    build-essential \
    libmodbus-dev \
    && rm -rf /var/lib/apt/lists/*

# 複製並編譯 HAL (硬體抽象層)
# 這樣做可以利用 Docker 的層快取，如果C程式碼沒變，就不會重新編譯
COPY ./hal/ ./hal/
RUN make -C ./hal/
# 將編譯好的.so檔複製到工作目錄的根，方便Python調用
RUN cp ./hal/lib-cdu-hal.so .

# 複製並安裝 Python 依賴
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 複製所有應用程式碼
COPY . .

# 暴露端口並啟動服務
EXPOSE 8000
CMD ["uvicorn", "main_api:app", "--host", "0.0.0.0", "--port", "8000"]