# Guide de Déploiement - PV Matériel Loué

Ce guide explique comment déployer l'application sur un serveur de production Linux.

---

## 📋 Prérequis

### Serveur Linux

- **OS** : Ubuntu 20.04+ / Debian 11+ (recommandé)
- **RAM** : 1 GB minimum (2 GB recommandé)
- **Stockage** : 5 GB minimum
- **Accès** : SSH avec droits sudo
- **Python** : 3.8+ (installé par défaut sur Ubuntu 20.04+)

### Services requis

- **Nginx** : Reverse proxy et serveur web
- **Systemd** : Gestion du service (préinstallé)
- **Firewall** : UFW ou iptables (optionnel mais recommandé)

### Accès SSH

```bash
# Test de connexion SSH
ssh user@votre-serveur.com

# Si vous utilisez une clé SSH
ssh -i ~/.ssh/id_rsa user@votre-serveur.com
```

---

## 🚀 Déploiement Automatique (Recommandé)

Le script `deploy.sh` automatise l'ensemble du processus de déploiement.

### 1. Configuration du script

Éditez `deploy.sh` et configurez les variables en haut du fichier :

```bash
# Configuration serveur
SSH_USER="votre_user"
SSH_HOST="votre-serveur.com"
SSH_PORT="22"
SSH_KEY="/chemin/vers/votre/cle_ssh"  # Optionnel

# Configuration application
APP_DIR="/var/www/pv-materiel"
APP_USER="www-data"
DOMAIN_NAME="pv.votre-domaine.com"  # Optionnel pour HTTPS
```

### 2. Lancement du déploiement

```bash
# Rendre le script exécutable
chmod +x deploy.sh

# Lancer le déploiement
./deploy.sh
```

Le script va automatiquement :
- ✅ Installer les dépendances système (Python, Nginx, etc.)
- ✅ Créer la structure de répertoires
- ✅ Transférer les fichiers de l'application
- ✅ Créer l'environnement virtuel Python
- ✅ Installer les dépendances Python
- ✅ Configurer Nginx
- ✅ Créer et démarrer le service systemd
- ✅ Configurer le firewall
- ✅ Afficher l'URL d'accès

### 3. Vérification

Après le déploiement, vérifiez que tout fonctionne :

```bash
# Vérifier le statut du service
ssh user@serveur "sudo systemctl status pv-materiel"

# Vérifier les logs
ssh user@serveur "sudo journalctl -u pv-materiel -n 50"

# Tester l'accès HTTP
curl http://votre-serveur.com
```

---

## 🛠️ Déploiement Manuel

Si vous préférez un déploiement manuel ou si le script automatique échoue :

### Étape 1 : Préparation du serveur

```bash
# Connexion SSH
ssh user@votre-serveur.com

# Mise à jour du système
sudo apt-get update
sudo apt-get upgrade -y

# Installation des dépendances système
sudo apt-get install -y python3 python3-pip python3-venv nginx git
sudo apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0

# Création du répertoire d'application
sudo mkdir -p /var/www/pv-materiel
sudo chown $USER:$USER /var/www/pv-materiel
```

### Étape 2 : Transfert des fichiers

```bash
# Depuis votre machine locale, transférer les fichiers
scp -r server.py requirements.txt static/ templates/ config/ user@serveur:/var/www/pv-materiel/

# Ou utiliser rsync (recommandé)
rsync -avz --exclude='.venv' --exclude='__pycache__' --exclude='.git' \
  . user@serveur:/var/www/pv-materiel/
```

### Étape 3 : Configuration Python

```bash
# Sur le serveur
cd /var/www/pv-materiel

# Création de l'environnement virtuel
python3 -m venv .venv

# Activation de l'environnement virtuel
source .venv/bin/activate

# Installation des dépendances
pip install --upgrade pip
pip install -r requirements.txt

# Vérification
python -c "import flask, weasyprint; print('✅ Dépendances OK')"
```

### Étape 4 : Configuration Gunicorn

Créez le fichier `gunicorn_config.py` :

```python
# /var/www/pv-materiel/gunicorn_config.py
bind = "127.0.0.1:5000"
workers = 2
worker_class = "sync"
timeout = 120
keepalive = 5
accesslog = "/var/log/pv-materiel/access.log"
errorlog = "/var/log/pv-materiel/error.log"
loglevel = "info"
```

Créez le répertoire des logs :

```bash
sudo mkdir -p /var/log/pv-materiel
sudo chown www-data:www-data /var/log/pv-materiel
```

### Étape 5 : Service Systemd

Créez le fichier de service `/etc/systemd/system/pv-materiel.service` :

```ini
[Unit]
Description=PV Matériel Loué - France Montage
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/pv-materiel
Environment="PATH=/var/www/pv-materiel/.venv/bin"
ExecStart=/var/www/pv-materiel/.venv/bin/gunicorn -c gunicorn_config.py server:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activez et démarrez le service :

```bash
sudo systemctl daemon-reload
sudo systemctl enable pv-materiel
sudo systemctl start pv-materiel

# Vérifier le statut
sudo systemctl status pv-materiel
```

### Étape 6 : Configuration Nginx

Créez le fichier `/etc/nginx/sites-available/pv-materiel` :

```nginx
server {
    listen 80;
    server_name _;  # Remplacer par votre domaine si vous en avez un

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    location /static {
        alias /var/www/pv-materiel/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/pv-materiel-access.log;
    error_log /var/log/nginx/pv-materiel-error.log;
}
```

Activez le site et redémarrez Nginx :

```bash
sudo ln -s /etc/nginx/sites-available/pv-materiel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Étape 7 : Firewall (UFW)

```bash
# Autoriser SSH, HTTP et HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer le firewall
sudo ufw --force enable

# Vérifier
sudo ufw status
```

### Étape 8 : Permissions

```bash
sudo chown -R www-data:www-data /var/www/pv-materiel
sudo chmod -R 755 /var/www/pv-materiel
sudo chmod 775 /var/www/pv-materiel/saved_pv
sudo chmod 775 /var/www/pv-materiel/config
```

---

## 🔒 HTTPS avec Let's Encrypt (Optionnel mais recommandé)

### Installation de Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### Obtention du certificat

```bash
# Remplacer par votre domaine
sudo certbot --nginx -d pv.votre-domaine.com

# Suivre les instructions (email, accepter les termes, etc.)
```

### Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est configuré via cron
sudo systemctl status certbot.timer
```

---

## 🔄 Mise à jour de l'application

### Méthode rapide

```bash
# Depuis votre machine locale
./deploy.sh update
```

### Méthode manuelle

```bash
# 1. Transférer les nouveaux fichiers
rsync -avz --exclude='.venv' --exclude='saved_pv' --exclude='config' \
  . user@serveur:/var/www/pv-materiel/

# 2. Sur le serveur, mettre à jour les dépendances
ssh user@serveur
cd /var/www/pv-materiel
source .venv/bin/activate
pip install -r requirements.txt

# 3. Redémarrer le service
sudo systemctl restart pv-materiel

# 4. Vérifier
sudo systemctl status pv-materiel
```

---

## 🐛 Dépannage

### Le service ne démarre pas

```bash
# Voir les logs détaillés
sudo journalctl -u pv-materiel -n 100 --no-pager

# Vérifier les permissions
ls -la /var/www/pv-materiel

# Tester manuellement
cd /var/www/pv-materiel
source .venv/bin/activate
gunicorn -c gunicorn_config.py server:app
```

### Erreur WeasyPrint

```bash
# Réinstaller les dépendances système
sudo apt-get install --reinstall libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0

# Vérifier
python3 -c "import weasyprint; print(weasyprint.__version__)"
```

### Nginx renvoie 502 Bad Gateway

```bash
# Vérifier que le service Flask tourne
sudo systemctl status pv-materiel

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/pv-materiel-error.log

# Vérifier que Gunicorn écoute bien sur le port 5000
sudo ss -tlnp | grep 5000
```

### Les fichiers ne sont pas sauvegardés

```bash
# Vérifier les permissions
ls -la /var/www/pv-materiel/saved_pv
ls -la /var/www/pv-materiel/config

# Corriger si nécessaire
sudo chown www-data:www-data /var/www/pv-materiel/saved_pv
sudo chmod 775 /var/www/pv-materiel/saved_pv
```

### Problème de mémoire

```bash
# Vérifier l'utilisation mémoire
free -h
ps aux | grep gunicorn

# Réduire le nombre de workers dans gunicorn_config.py
# workers = 1  # Au lieu de 2 ou plus
```

---

## 📊 Monitoring

### Vérifier l'état du service

```bash
# Statut du service
sudo systemctl status pv-materiel

# Logs en temps réel
sudo journalctl -u pv-materiel -f

# Logs Nginx
sudo tail -f /var/log/nginx/pv-materiel-access.log
sudo tail -f /var/log/nginx/pv-materiel-error.log
```

### Statistiques d'utilisation

```bash
# Utilisation CPU/RAM
top
htop  # Si installé

# Espace disque
df -h
du -sh /var/www/pv-materiel/saved_pv

# Connexions actives
sudo ss -tunlp | grep :80
```

---

## 🔐 Sauvegarde

### Script de sauvegarde automatique

Créez `/usr/local/bin/backup-pv-materiel.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pv-materiel"
APP_DIR="/var/www/pv-materiel"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarde des PV et configuration
tar -czf $BACKUP_DIR/pv-backup-$DATE.tar.gz \
  $APP_DIR/saved_pv \
  $APP_DIR/config

# Garder seulement les 30 dernières sauvegardes
ls -t $BACKUP_DIR/pv-backup-*.tar.gz | tail -n +31 | xargs rm -f

echo "✅ Sauvegarde créée : pv-backup-$DATE.tar.gz"
```

Rendez-le exécutable et planifiez-le :

```bash
sudo chmod +x /usr/local/bin/backup-pv-materiel.sh

# Ajouter au crontab (tous les jours à 2h du matin)
sudo crontab -e
# Ajouter cette ligne :
# 0 2 * * * /usr/local/bin/backup-pv-materiel.sh >> /var/log/pv-backup.log 2>&1
```

---

## ⚙️ Configuration Avancée

### Variables d'environnement

Créez un fichier `.env` dans `/var/www/pv-materiel/` :

```bash
FLASK_ENV=production
SECRET_KEY=votre_cle_secrete_aleatoire_ici
MAX_CONTENT_LENGTH=16777216
```

Modifiez le service systemd pour charger ces variables :

```ini
[Service]
EnvironmentFile=/var/www/pv-materiel/.env
```

### Limitation de taux (Rate Limiting)

Dans la configuration Nginx, ajoutez :

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    # ... reste de la config ...
    
    location /submit {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://127.0.0.1:5000;
        # ... reste de la config proxy ...
    }
}
```

---

## 📝 Checklist de déploiement

- [ ] Serveur Linux préparé (Ubuntu/Debian)
- [ ] Accès SSH configuré
- [ ] Python 3.8+ installé
- [ ] Dépendances système installées
- [ ] Fichiers transférés sur le serveur
- [ ] Environnement virtuel créé
- [ ] Dépendances Python installées
- [ ] Service systemd créé et démarré
- [ ] Nginx configuré et redémarré
- [ ] Firewall configuré
- [ ] Permissions correctes sur les répertoires
- [ ] HTTPS configuré (si applicable)
- [ ] Configuration SMTP testée
- [ ] Sauvegarde automatique configurée
- [ ] Monitoring en place

---

## 🆘 Support

Pour toute question ou problème durant le déploiement :

1. Vérifiez les logs : `sudo journalctl -u pv-materiel -n 100`
2. Consultez les logs Nginx : `/var/log/nginx/pv-materiel-error.log`
3. Testez manuellement l'application en mode développement
4. Vérifiez que toutes les dépendances sont installées

**Note** : Ce guide suppose une installation sur Ubuntu 20.04+. Pour d'autres distributions, adaptez les commandes `apt-get` en conséquence (yum, dnf, pacman, etc.).
