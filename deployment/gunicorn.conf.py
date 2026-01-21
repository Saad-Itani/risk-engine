# Gunicorn configuration for Risk Engine
# Production WSGI server configuration

# Server socket
bind = "127.0.0.1:5000"

# Worker processes
workers = 4  # Recommended: 2 * CPU cores + 1 (adjust based on VPS specs)
worker_class = "sync"  # Use sync workers for Flask
threads = 1  # Threads per worker

# Timeouts
timeout = 120  # 120 seconds for long-running risk calculations
keepalive = 5  # Seconds to wait for requests on Keep-Alive connections
graceful_timeout = 30  # Graceful restart timeout

# Logging
accesslog = "/var/log/risk-engine/gunicorn-access.log"
errorlog = "/var/log/risk-engine/gunicorn-error.log"
loglevel = "info"  # debug, info, warning, error, critical
capture_output = True  # Redirect stdout/stderr to log files
enable_stdio_inheritance = True

# Process naming
proc_name = "risk-engine"

# Server mechanics
daemon = False  # Run in foreground (systemd manages daemonization)
pidfile = None  # Don't use PID file (systemd manages this)
umask = 0o007  # File creation mask for log files
user = None  # systemd sets this
group = None  # systemd sets this

# Server hooks (optional - uncomment if needed)
# def on_starting(server):
#     """Called just before the master process is initialized."""
#     pass
#
# def on_reload(server):
#     """Called to recycle workers during a reload."""
#     pass
#
# def when_ready(server):
#     """Called just after the server is started."""
#     pass
#
# def pre_fork(server, worker):
#     """Called just before a worker is forked."""
#     pass
#
# def post_fork(server, worker):
#     """Called just after a worker has been forked."""
#     pass
