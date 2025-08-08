# 🚀 DevFlow Platform - Quick Start Guide

## Starting the Platform

### Option 1: Unified Script (Easiest)
```bash
# Start everything with one command
./devflow.sh
```

### Option 2: Specific Commands
```bash
./devflow.sh start          # Start full platform (same as default)
./devflow.sh dashboard-only # Just dashboard for testing
./devflow.sh status         # Check service status
./devflow.sh stop           # Stop all services
```

### Option 3: From File Manager
1. Navigate to your project directory in file manager
2. **Double-click** `devflow.sh`
3. Wait for all services to start (about 2-3 minutes)
4. Open your browser to `http://localhost:3010`

## 🎯 What You'll Get

After starting, you'll have access to:

### 🎨 **Modern Dashboard UI** - `http://localhost:3010`
- **Main Dashboard**: Real-time productivity metrics and charts
- **Task Management**: `http://localhost:3010/tasks` - Kanban board with drag & drop
- **Code Archaeology**: `http://localhost:3010/archaeology` - 3D code visualization
- **Dark theme with glass morphism effects**
- **Responsive design for all screen sizes**

### 🔐 **Demo Login Credentials**
Simple login - just use:
- **Email**: `loic@loic.fr`
- **Password**: `loic`

Other emails available (all with password `loic`):
- `admin@loic.fr` - Full admin access
- `manager@loic.fr` - Manager role
- `lead@loic.fr` - Team lead role  
- `dev@loic.fr` - Developer role

### 🔧 **Backend Services**
- **API Gateway**: `http://localhost:3000` - JSON API endpoints
- **GraphQL Playground**: `http://localhost:3000/graphql` - Interactive API explorer
- **API Documentation**: `http://localhost:3000/api-docs` - Complete API docs

## 📊 Checking Status

### From File Manager
Double-click `devflow.sh` and it will show status if services are already running

### From Terminal
```bash
./devflow.sh status
```

## 🛑 Stopping the Platform

### From Terminal
```bash
./devflow.sh stop
```

## 🔧 Troubleshooting

### If Services Don't Start
1. Make sure Docker is running
2. Check if ports 3000-3010 are free
3. Run `./devflow.sh stop` then `./devflow.sh start` again

### If Dashboard Shows Errors
1. Wait 2-3 minutes for all services to fully start
2. Refresh the browser page
3. Check `logs/dashboard.log` for errors

### Common Issues
- **Port conflicts**: The script will automatically kill conflicting processes
- **Missing dependencies**: The script will install them automatically
- **Docker not running**: Start Docker Desktop first

## 📁 Log Files

All service logs are saved in the `logs/` directory:
- `logs/dashboard.log` - Dashboard UI logs
- `logs/api-gateway.log` - API Gateway logs
- Use `docker-compose logs -f` for infrastructure logs

## 🎉 Features Available

### Task Management (`/tasks`)
- ✅ Kanban board with drag & drop
- ✅ Rich text editor for task descriptions
- ✅ Advanced filtering and search
- ✅ Task analytics and reporting
- ✅ Real-time collaboration

### Dashboard (`/`)
- ✅ Productivity metrics
- ✅ Interactive charts
- ✅ Customizable widgets
- ✅ Real-time updates
- ✅ Dark/light theme toggle

### Code Archaeology (`/archaeology`)
- ✅ 3D code visualization
- ✅ Git history analysis
- ✅ Dependency graphs
- ✅ Hotspot detection
- ✅ Traceability matrix

## 🚀 Quick Commands

```bash
# Start everything
./devflow.sh

# Check status
./devflow.sh status

# Stop everything
./devflow.sh stop

# Run health tests
node tests/final-application-test.js
```

## 🌐 URLs to Bookmark

- **Main Dashboard**: http://localhost:3010
- **Task Manager**: http://localhost:3010/tasks
- **API Explorer**: http://localhost:3000/graphql
- **API Docs**: http://localhost:3000/api-docs

---

**Need help?** Check the logs in the `logs/` directory or run `./devflow.sh status` for detailed diagnostics.
---

##
 🎉 **Ready to Go!**

### **Quick Login:**
1. Open `http://localhost:3010`
2. Email: `loic@loic.fr`
3. Password: `loic`
4. Click "Sign In"

**That's it! Your comprehensive task management UI is ready to use!**