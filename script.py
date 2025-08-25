# Create Docker configuration files for the countdown timer application

dockerfile_content = """# Use nginx to serve the static web application
FROM nginx:alpine

# Copy the web application files to nginx html directory  
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Copy custom nginx configuration if needed (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
"""

docker_compose_content = """version: '3.8'

services:
  countdown-timer:
    build: .
    container_name: countdown-timer-app
    ports:
      - "3000:80"  # Map host port 3000 to container port 80
    restart: unless-stopped
    volumes:
      - ./logs:/var/log/nginx  # Optional: for nginx logs
"""

nginx_config_content = """events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle client-side routing (if needed)
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
"""

dockerfile_instructions = """# Docker 部署指南

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
"""

# Write files
with open('Dockerfile', 'w', encoding='utf-8') as f:
    f.write(dockerfile_content)

with open('docker-compose.yml', 'w', encoding='utf-8') as f:
    f.write(docker_compose_content)
    
with open('nginx.conf', 'w', encoding='utf-8') as f:
    f.write(nginx_config_content)

with open('Docker_部署指南.md', 'w', encoding='utf-8') as f:
    f.write(dockerfile_instructions)

print("✅ Docker 配置檔案已創建:")
print("- Dockerfile")
print("- docker-compose.yml") 
print("- nginx.conf")
print("- Docker_部署指南.md")
print("\n📝 部署步驟：")
print("1. 下載上面的網頁應用檔案 (index.html, style.css, app.js)")
print("2. 下載這些 Docker 配置檔案") 
print("3. 將所有檔案放在同一個目錄中")
print("4. 執行 'docker-compose up -d' 來啟動應用")
print("5. 訪問 http://localhost:3000 來使用倒數計時器")