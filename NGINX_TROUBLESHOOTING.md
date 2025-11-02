# 502 Bad Gateway Troubleshooting Guide

## Common Causes

A 502 Bad Gateway error means nginx received the request but couldn't connect to your backend server. Here are the most common causes:

### 1. Backend Server Not Running
- **Check**: Is the Node.js backend process running?
- **Solution**: Start the backend with `npm run start:prod` or `pm2 start dist/main.js`

### 2. Wrong Port Configuration
- **Backend listens on**: `process.env.PORT || 3000` (default: 3000)
- **Nginx must proxy to**: The same port your backend is listening on

### 3. Nginx Configuration Issue
- **Check**: Is nginx pointing to the correct backend URL and port?

### 4. Backend Crashed on Startup
- **Check**: Application logs for startup errors
- **Common issues**:
  - Missing environment variables (DATABASE_URL, JWT_SECRET, etc.)
  - Database connection failed
  - Port already in use

## Step-by-Step Troubleshooting

### Step 1: Check if Backend is Running

```bash
# Check if Node.js process is running
ps aux | grep node

# Check if port 3000 (or your PORT) is listening
netstat -tlnp | grep :3000
# OR
ss -tlnp | grep :3000
# OR
lsof -i :3000
```

### Step 2: Check Backend Logs

```bash
# If using PM2
pm2 logs

# If running directly
# Check your application logs or console output
```

### Step 3: Verify Environment Variables

Make sure these are set in your `.env` file:
```env
NODE_ENV=production
PORT=3000  # or your chosen port
DATABASE_URL=mongodb://...
JWT_SECRET=your-secret
FRONTEND_URL=https://theworknow.com
BASE_URL=https://theworknow.com
```

### Step 4: Test Backend Directly

Try accessing the backend directly (bypassing nginx):
```bash
# On the server
curl http://localhost:3000/api/v1/ping

# Should return a response, not connection refused
```

### Step 5: Verify Nginx Configuration

Your nginx configuration should look something like this:

```nginx
server {
    listen 80;
    server_name theworknow.com;

    # Backend API
    location /backend {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Frontend (if served from nginx)
    location / {
        # Your frontend configuration
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Important**: The `proxy_pass` should point to `http://localhost:3000` (or whatever port your backend uses), and should NOT include `/backend` in the proxy_pass URL.

### Step 6: Check Nginx Error Logs

```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Common errors you might see:
# - connect() failed (111: Connection refused) -> Backend not running
# - connect() failed (110: Connection timed out) -> Firewall issue
# - upstream prematurely closed connection -> Backend crashed
```

### Step 7: Restart Services

```bash
# Restart backend
pm2 restart all
# OR
systemctl restart your-backend-service

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Common Issues and Solutions

### Issue: Backend starts but immediately crashes

**Check for:**
1. Missing environment variables
2. Database connection issues
3. Port conflicts
4. Template files not found (we fixed this!)

**Solution:**
- Check application logs
- Verify all required env vars are set
- Ensure database is accessible

### Issue: Connection refused (111)

**Cause**: Backend is not running or listening on the wrong port

**Solution:**
- Start the backend server
- Verify PORT environment variable
- Check firewall rules

### Issue: Connection timed out (110)

**Cause**: Firewall blocking connection or backend not accepting connections

**Solution:**
- Check firewall: `sudo ufw status` or `sudo firewall-cmd --list-all`
- Ensure backend is listening on 0.0.0.0, not just 127.0.0.1

### Issue: Backend works locally but not through nginx

**Check:**
1. Nginx proxy_pass URL is correct
2. Nginx is reloaded after config changes: `sudo nginx -t && sudo systemctl reload nginx`
3. SELinux (if enabled) might be blocking: `sudo setsebool -P httpd_can_network_connect 1`

## Quick Fix Checklist

- [ ] Backend process is running (`ps aux | grep node`)
- [ ] Backend is listening on correct port (`netstat -tlnp | grep :PORT`)
- [ ] Backend responds to direct connection (`curl http://localhost:PORT/api/v1/ping`)
- [ ] Environment variables are set correctly
- [ ] Nginx configuration is correct
- [ ] Nginx can reach backend (`sudo nginx -t` passes)
- [ ] Nginx error logs don't show connection errors
- [ ] Firewall allows connections on backend port

## Testing After Fix

Once fixed, test:
1. `https://theworknow.com/backend/api/v1/ping` - Should return success
2. `https://theworknow.com/backend/api/v1/api-docs` - Swagger should load
3. `https://theworknow.com/backend/api/v1/auth/login` - Login endpoint should work (may return 400/401, but not 502)

