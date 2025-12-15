# 安裝與部署指南

本文件說明如何在本地環境安裝、執行與建置 BorderCollie 專案。

## 環境需求

-   **Node.js**: v16.0.0 或更高版本
-   **npm**: v7.0.0 或更高版本

## 本地開發 (Development)

1.  **複製專案 (Clone)**
    ```bash
    git clone <repository-url>
    cd BorderCollie
    ```

2.  **安裝依賴 (Install Dependencies)**
    ```bash
    npm install
    ```

3.  **啟動開發伺服器 (Start Dev Server)**
    ```bash
    npm run dev
    ```
    伺服器啟動後，請瀏覽終端機顯示的 URL (預設為 `http://localhost:5173`)。

## 建置部署 (Production Build)

1.  **建置專案 (Build)**
    ```bash
    npm run build
    ```
    此指令會將原始碼編譯並輸出至 `dist/` 目錄。

2.  **預覽建置結果 (Preview)**
    ```bash
    npm run preview
    ```
    此指令可模擬正式環境執行 `dist/` 中的靜態檔案。

3.  **部署 (Deploy)**
    BorderCollie 是純靜態網站 (Static Site)，您可以將 `dist/` 目錄下的所有檔案上傳至任何靜態網站託管服務，例如：
    -   GitHub Pages
    -   Vercel
    -   Netlify
    -   Amazon S3 + CloudFront
    -   Nginx / Apache Web Server

## Docker 部署 (可選)

若您希望使用 Docker 進行部署，可使用以下 `Dockerfile` 範例：

```dockerfile
# Build stage
FROM node:18-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

建置與執行：
```bash
docker build -t border-collie .
docker run -d -p 8080:80 border-collie
```
瀏覽 `http://localhost:8080` 即可使用。
