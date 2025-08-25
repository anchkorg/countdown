# Docker 部署指南

## 檔案結構
確保您的項目目錄包含以下檔案：
```
countdown-timer/
├── index.html
├── style.css  
├── app.js
├── Dockerfile
├── docker-compose.yml
└── nginx.conf (可選)
```

## 建立 Docker 映像

### 方法 1: 使用 docker build
```bash
# 進入項目目錄
cd countdown-timer

# 建立 Docker 映像
docker build -t countdown-timer:latest .

# 執行容器
docker run -d -p 3000:80 --name countdown-timer-app countdown-timer:latest
```

### 方法 2: 使用 docker-compose (推薦)
```bash
# 進入項目目錄
cd countdown-timer

# 建立並啟動容器
docker-compose up -d

# 查看容器狀態
docker-compose ps

# 停止容器
docker-compose down
```

## 部署到任何 Docker 服務器

### 1. 上傳到 Docker Hub
```bash
# 登入 Docker Hub
docker login

# 標記映像
docker tag countdown-timer:latest your-username/countdown-timer:latest

# 推送到 Docker Hub
docker push your-username/countdown-timer:latest
```

### 2. 在目標服務器上部署
```bash
# 拉取映像
docker pull your-username/countdown-timer:latest

# 執行容器
docker run -d -p 3000:80 --name countdown-timer-app your-username/countdown-timer:latest
```

## 訪問應用
- 本地測試: http://localhost:3000
- 服務器部署: http://your-server-ip:3000

## 容器管理命令
```bash
# 查看執行中的容器
docker ps

# 查看容器日誌
docker logs countdown-timer-app

# 停止容器
docker stop countdown-timer-app

# 重啟容器  
docker restart countdown-timer-app

# 刪除容器
docker rm countdown-timer-app

# 刪除映像
docker rmi countdown-timer:latest
```
