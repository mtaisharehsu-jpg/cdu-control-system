---
name: Bug Report | 錯誤報告
about: Create a report to help us improve | 建立報告以幫助我們改進
title: '[BUG] '
labels: 'bug'
assignees: ''

---

## Bug Description | 錯誤描述
A clear and concise description of what the bug is.
清楚簡潔地描述錯誤是什麼。

## To Reproduce | 重現步驟
Steps to reproduce the behavior:
重現行為的步驟：
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior | 預期行為
A clear and concise description of what you expected to happen.
清楚簡潔地描述您期望發生的事情。

## Screenshots | 截圖
If applicable, add screenshots to help explain your problem.
如果適用，請添加截圖以幫助解釋您的問題。

## Environment | 環境資訊
- OS: [e.g. Windows 11, Ubuntu 20.04]
- Docker Version: [e.g. 20.10.8]
- Python Version: [e.g. 3.8.10]
- Browser (if applicable): [e.g. chrome, safari]

## API/Component | API/組件
Which API or component is affected?
哪個 API 或組件受到影響？
- [ ] Standard Redfish API (port 8000)
- [ ] Distributed API (port 8001)
- [ ] Frontend UI
- [ ] HAL Layer
- [ ] Function Blocks
- [ ] Docker Configuration

## Additional Context | 額外上下文
Add any other context about the problem here.
在此處添加有關問題的任何其他上下文。

## Logs | 日誌
If applicable, include relevant logs from:
如果適用，請包含來自以下的相關日誌：
```
# Backend logs
docker logs cdu_service

# Or direct Python logs
python main_api.py
```