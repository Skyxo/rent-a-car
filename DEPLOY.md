# Guide de Déploiement - PV Matériel Loué
## Serveur Zomro: 188.137.240.250

### 📋 Prérequis
- Accès SSH au serveur (root ou sudo)
- Git installé localement
- Python 3.8+ sur le serveur

---

## 🚀 Méthode 1: Déploiement automatique depuis votre machine locale

### Option A: Via rsync (Recommandé)

```bash
# 1. Rendre le script exécutable
chmod +x deploy/deploy-remote.sh

# 2. Éditer le script pour configurer votre utilisateur SSH
nano deploy/deploy-remote.sh
# Modifier SERVER_USER="root" si nécessaire

# 3. Lancer le déploiement
./deploy/deploy-remote.sh
```

### Option B: Via Git (si le repo est public ou accessible)

```bash
# Sur le serveur via SSH
ssh root@188.137.240.250

# Une fois connecté:
cd /tmp
git clone https://github.com/Skyxo/rent-a-car.git pv-materiel-deploy
cd pv-materiel-deploy
chmod +x deploy/deploy.sh
sudo ./deploy/deploy.sh
```

---

## 🚀 Méthode 2: Déploiement manuel pas à pas

### 1. Connexion au serveur
```bash
ssh root@188.137.240.250
```

### 2. Installation des dépendances système
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx git \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libfribidi0 \
    libgdk-pixbuf2.0-0 libcairo2 libgirepository-1.0-1
```

### 3. Création des répertoires
```bash
sudo mkdir -p /var/www/pv-materiel
sudo mkdir -p /var/log/pv-materiel
sudo chown -R $USER:$USER /var/www/pv-materiel
```

### 4. Copie des fichiers
Depuis votre machine locale:
```bash
rsync -avz --exclude='.git' --exclude='venv' --exclude='__pycache__' \
    --exclude='*.pyc' --exclude='.env' --exclude='saved_pv/*' \
    /home/charl/rent-a-car/ root@188.137.240.250:/var/www/pv-materiel/
```

### 5. Configuration de l'environnement Python
Sur le serveur:
```bash
cd /var/www/pv-materiel
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 6. Permissions
```bash
mkdir -p saved_pv config
sudo chown -R www-data:www-data saved_pv config
```

### 7. Configuration Nginx
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pv-materiel
sudo ln -sf /etc/nginx/sites-available/pv-materiel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
```

### 8. Configuration du service systemd
```bash
sudo cp deploy/pv-materiel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pv-materiel.service
sudo systemctl start pv-materiel.service
```

### 9. Démarrage des services
```bash
sudo systemctl restart nginx
sudo systemctl restart pv-materiel
```

---

## 🔍 Vérification du déploiement

### Vérifier le statut de l'application
```bash
sudo systemctl status pv-materiel
```

### Vérifier les logs
```bash
# Logs de l'application
sudo journalctl -u pv-materiel -f

# Logs Nginx
sudo tail -f /var/log/nginx/pv-materiel-access.log
sudo tail -f /var/log/nginx/pv-materiel-error.log

# Logs Gunicorn
sudo tail -f /var/log/pv-materiel/error.log
```

### Test de l'application
```bash
# Test local
curl http://localhost:8000/health

# Test via Nginx
curl http://188.137.240.250/health
```

---

## ⚙️ Configuration post-déploiement

### 1. Configurer les paramètres SMTP
- Accéder à http://188.137.240.250
- Cliquer sur "⚙️ Configuration Email"
- Remplir les paramètres SMTP:
  - **Serveur SMTP**: smtp.gmail.com
  - **Port**: 587
  - **Email**: votre.email@gmail.com
  - **Mot de passe**: Mot de passe d'application Gmail
  - **Nom expéditeur**: Centrale Lyon Conseil

### 2. Tester l'envoi d'email
- Cliquer sur "Tester la connexion"
- Vérifier que la connexion SMTP fonctionne

---

## 🔒 Sécurisation (Recommandé pour la production)

### 1. Installer un certificat SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

### 2. Configurer un firewall
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Sécuriser SSH
Éditer `/etc/ssh/sshd_config`:
```bash
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

---

## 🔄 Commandes de gestion

### Redémarrer l'application
```bash
sudo systemctl restart pv-materiel
```

### Voir les logs en temps réel
```bash
sudo journalctl -u pv-materiel -f
```

### Mettre à jour l'application
```bash
cd /var/www/pv-materiel
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart pv-materiel
```

### Arrêter l'application
```bash
sudo systemctl stop pv-materiel
```

### Désactiver le démarrage automatique
```bash
sudo systemctl disable pv-materiel
```

---

## 🐛 Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs d'erreur
sudo journalctl -u pv-materiel -n 50

# Vérifier que Python et les dépendances sont installés
cd /var/www/pv-materiel
source venv/bin/activate
python3 -c "import flask; print('Flask OK')"
```

### Erreur 502 Bad Gateway
```bash
# L'application ne répond pas
sudo systemctl status pv-materiel
sudo journalctl -u pv-materiel -f
```

### Erreur 404 Not Found
```bash
# Nginx mal configuré
sudo nginx -t
sudo systemctl restart nginx
```

### Problème de permissions
```bash
sudo chown -R www-data:www-data /var/www/pv-materiel/saved_pv
sudo chown -R www-data:www-data /var/www/pv-materiel/config
```

---

## 📊 Monitoring

### Vérifier l'utilisation des ressources
```bash
# CPU et mémoire
htop

# Espace disque
df -h

# Processus Gunicorn
ps aux | grep gunicorn
```

### Statistiques Nginx
```bash
sudo tail -n 100 /var/log/nginx/pv-materiel-access.log | awk '{print $9}' | sort | uniq -c
```

---

## 📞 Support

Pour toute question ou problème:
1. Vérifier les logs: `sudo journalctl -u pv-materiel -f`
2. Vérifier la configuration Nginx: `sudo nginx -t`
3. Vérifier que le port 8000 est accessible: `curl localhost:8000/health`

---

## 🎯 URL de Production

**Application**: http://188.137.240.250

*Note: Pour utiliser un nom de domaine personnalisé, configurer les DNS et mettre à jour `server_name` dans `/etc/nginx/sites-available/pv-materiel`*
