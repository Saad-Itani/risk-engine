# Risk Engine - Deployment Guide

Complete guide for deploying Risk Engine to a VPS (Virtual Private Server) with nginx, gunicorn, and systemd.

## 📋 Prerequisites

- Fresh Ubuntu 22.04 or Debian 11+ VPS (e.g., Hetzner)
- Root/sudo access to VPS
- Domain configured in Cloudflare DNS (risk.saaditani.com)
- Git repository access
- Your local `instance/risk_engine.db` file ready to transfer

## 🚀 Quick Start

### 1. Initial VPS Setup (One-Time)

SSH into your VPS as root and run:

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/[your-repo]/Risk_Engine/main/deployment/install.sh
chmod +x install.sh
sudo ./install.sh
```

This installs:
- Python 3.11
- nginx web server
- Node.js 20.x LTS
- Creates `risk-engine` user
- Creates necessary directories

### 2. Clone Repository

```bash
# Switch to risk-engine user
sudo su - risk-engine

# Clone repository
cd /opt/risk-engine
git clone https://github.com/[your-repo]/Risk_Engine.git .
```

### 3. Setup Python Environment

```bash
# Create virtual environment
python3.11 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Setup Frontend

```bash
cd /opt/risk-engine/frontend
npm install
```

### 5. Configure Environment

```bash
# Copy environment template
cd /opt/risk-engine
cp deployment/.env.production .env.production

# Edit if needed (defaults are fine)
nano .env.production
```

### 6. Configure Services

As root:

```bash
# Setup systemd service
sudo ln -s /opt/risk-engine/deployment/risk-engine-backend.service \
    /etc/systemd/system/risk-engine-backend.service
sudo systemctl daemon-reload
sudo systemctl enable risk-engine-backend

# Setup nginx
sudo ln -s /opt/risk-engine/deployment/nginx-risk-engine.conf \
    /etc/nginx/sites-available/risk-engine
sudo ln -s /etc/nginx/sites-available/risk-engine \
    /etc/nginx/sites-enabled/risk-engine
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t
sudo systemctl reload nginx

# Setup cron job for daily price updates
sudo cp /opt/risk-engine/deployment/cron-refresh-prices \
    /etc/cron.d/risk-engine-refresh
sudo chmod 0644 /etc/cron.d/risk-engine-refresh
```

### 7. Transfer Database File

On your **local Windows machine**:

#### Option A: Using WinSCP (Easiest)
1. Download WinSCP from https://winscp.net/
2. Connect to VPS (host: [vps-ip], user: risk-engine)
3. Navigate local: `C:\Users\Saada\Desktop\Side_Projects\Risk_Engine\instance\`
4. Navigate remote: `/tmp/`
5. Drag-and-drop `risk_engine.db` to `/tmp/`

#### Option B: Using scp (Git Bash/WSL)
```bash
cd C:\Users\Saada\Desktop\Side_Projects\Risk_Engine
scp instance/risk_engine.db risk-engine@[vps-ip]:/tmp/risk_engine.db
```

Then on VPS (as risk-engine user):

```bash
mv /tmp/risk_engine.db /var/lib/risk-engine/risk_engine.db
chmod 640 /var/lib/risk-engine/risk_engine.db
```

### 8. Run Deployment

```bash
# As risk-engine user
cd /opt/risk-engine
./deployment/deploy.sh
```

This will:
- Build React frontend
- Start backend service
- Reload nginx

**Done!** Your application should now be live at https://risk.saaditani.com

---

## 🔄 Regular Updates

When you push changes to GitHub:

```bash
# SSH into VPS
ssh risk-engine@[vps-ip]

# Run deployment script
cd /opt/risk-engine
./deployment/deploy.sh
```

Takes 2-3 minutes. Near-zero downtime (graceful restart).

---

## 🌐 Cloudflare DNS Setup

1. Go to Cloudflare dashboard → saaditani.com
2. Add DNS record:
   - Type: **A**
   - Name: **risk**
   - IPv4 address: **[your-vps-ip]**
   - Proxy status: **Proxied** (orange cloud)
3. SSL/TLS mode: **Full** (or Full Strict with Cloudflare Origin Certificate)

---

## 📁 File Overview

| File | Purpose |
|------|---------|
| `gunicorn.conf.py` | Gunicorn WSGI server configuration |
| `.env.production` | Environment variables template |
| `risk-engine-backend.service` | systemd service definition |
| `nginx-risk-engine.conf` | nginx reverse proxy config |
| `deploy.sh` | Deployment/update script |
| `install.sh` | Initial VPS setup script |
| `cron-refresh-prices` | Daily price update cron job |

---

## 🗂️ Directory Structure on VPS

```
/opt/risk-engine/              # Application code
├── backend/                   # Flask backend
├── frontend/                  # React frontend
│   └── dist/                  # Built static files
├── deployment/                # Deployment configs
├── venv/                      # Python virtual environment
└── .env.production            # Environment variables

/var/lib/risk-engine/          # Application data
└── risk_engine.db             # SQLite database

/var/log/risk-engine/          # Application logs
├── gunicorn-access.log
├── gunicorn-error.log
└── price-refresh.log
```

---

## 🔧 Useful Commands

### Service Management
```bash
# Start/stop/restart backend
sudo systemctl start risk-engine-backend
sudo systemctl stop risk-engine-backend
sudo systemctl restart risk-engine-backend

# Check service status
sudo systemctl status risk-engine-backend

# View live logs
sudo journalctl -u risk-engine-backend -f
tail -f /var/log/risk-engine/gunicorn-error.log
```

### nginx
```bash
# Test configuration
sudo nginx -t

# Reload (graceful)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# View logs
tail -f /var/log/nginx/risk-engine-access.log
tail -f /var/log/nginx/risk-engine-error.log
```

### Database
```bash
# Check database
ls -lh /var/lib/risk-engine/risk_engine.db

# Query database
sqlite3 /var/lib/risk-engine/risk_engine.db
> SELECT COUNT(*) FROM company;
> .quit
```

### Price Updates
```bash
# Run manually
sudo -u risk-engine /opt/risk-engine/venv/bin/python -m backend.scripts.refresh_prices

# View cron logs
tail -f /var/log/risk-engine/price-refresh.log

# Check cron job
cat /etc/cron.d/risk-engine-refresh
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
sudo journalctl -u risk-engine-backend -n 100
tail -f /var/log/risk-engine/gunicorn-error.log

# Common fixes
sudo chown risk-engine:risk-engine /var/lib/risk-engine/risk_engine.db
sudo systemctl restart risk-engine-backend
```

### Frontend shows blank page
```bash
# Rebuild frontend
cd /opt/risk-engine/frontend
sudo -u risk-engine npm run build
sudo systemctl reload nginx
```

### CORS errors
- Verify `backend/app/__init__.py` includes production domain
- Restart backend: `sudo systemctl restart risk-engine-backend`

### Price refresh not working
```bash
# Test manually
sudo -u risk-engine /opt/risk-engine/venv/bin/python -m backend.scripts.refresh_prices

# Check logs
tail -f /var/log/risk-engine/price-refresh.log
```

---

## 🔐 Security Notes

- Backend runs as non-root `risk-engine` user
- Backend only listens on localhost (not exposed to internet)
- nginx handles all external requests
- Cloudflare provides DDoS protection and SSL
- SQLite database has restricted permissions (640)
- Security headers configured in nginx

---

## 📊 Monitoring

### Health Check
```bash
# Test backend API
curl http://localhost/universe/companies

# Test nginx
curl http://localhost/health
```

### Resource Usage
```bash
# Check disk space
df -h

# Check database size
ls -lh /var/lib/risk-engine/risk_engine.db

# Check log sizes
du -sh /var/log/risk-engine/*
```

---

## 🆘 Support

For issues or questions:
1. Check logs first (`journalctl` and log files)
2. Review this README
3. Check the main repository README
4. Refer to the deployment plan: `~/.claude/plans/joyful-stirring-clock.md`

---

## 📝 Notes

- Daily price updates run at 6:30 AM via cron
- Database is backed up to `/var/backups/risk-engine/` (if you set that up)
- Frontend build takes ~30 seconds
- Backend restart is graceful (finishes in-flight requests)
- nginx reload is seamless (no dropped connections)

---

## ✅ Post-Deployment Checklist

After deployment, verify:

- [ ] Backend service is running: `sudo systemctl status risk-engine-backend`
- [ ] nginx is running: `sudo systemctl status nginx`
- [ ] API responds: `curl http://localhost/universe/companies`
- [ ] Frontend loads: visit https://risk.saaditani.com
- [ ] Database is accessible: `sqlite3 /var/lib/risk-engine/risk_engine.db "SELECT COUNT(*) FROM company;"`
- [ ] Cron job is configured: `cat /etc/cron.d/risk-engine-refresh`
- [ ] Logs are being written: `ls -la /var/log/risk-engine/`
- [ ] No errors in logs: `tail -20 /var/log/risk-engine/gunicorn-error.log`

---

**🎉 Congratulations!** Your Risk Engine is now deployed and ready for production use!
