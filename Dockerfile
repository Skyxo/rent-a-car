# Dockerfile pour l'application PV Matériel Loué
# Basé sur Python 3.11 avec les dépendances système nécessaires pour WeasyPrint

FROM python:3.11-slim

# Variables d'environnement pour Python
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Installer les dépendances système requises par WeasyPrint
# GTK, Pango, Cairo, GDK-PixBuf sont essentiels pour le rendu PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Créer un répertoire de travail
WORKDIR /app

# Copier le fichier des dépendances Python
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'application
COPY . .

# Créer les répertoires nécessaires s'ils n'existent pas
RUN mkdir -p templates static

# Exposer le port Flask
EXPOSE 5000

# Variables d'environnement par défaut (à surcharger en production)
ENV FLASK_APP=server.py \
    FLASK_ENV=production

# Commande de démarrage
# En production, utiliser gunicorn au lieu du serveur de développement Flask
CMD ["python", "server.py"]

# Alternative avec Gunicorn (recommandée pour la production)
# RUN pip install gunicorn
# CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "server:app"]
