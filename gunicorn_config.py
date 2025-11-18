"""
Configuration Gunicorn pour l'application PV Matériel Loué
Production-ready avec gestion des workers et timeouts
"""

import multiprocessing
import os

# Adresse et port
bind = "127.0.0.1:8000"

# Nombre de workers (2-4 x CPU cores)
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000

# Timeouts
timeout = 120  # 2 minutes pour la génération de PDF
keepalive = 5

# Logging
accesslog = "/var/log/pv-materiel/access.log"
errorlog = "/var/log/pv-materiel/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Environnement de production
raw_env = [
    "FLASK_ENV=production"
]

# Process naming
proc_name = "pv-materiel-loue"

# Rechargement automatique en dev (désactiver en prod)
reload = False

# Sécurité
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190
