#!/bin/bash

##############################################################################
# Script de déploiement pour PV Matériel Loué - Centrale Lyon Conseil
# Serveur: 188.137.240.250 (Zomro)
##############################################################################

set -e  # Arrêter en cas d'erreur

echo "============================================"
echo "Déploiement PV Matériel Loué"
echo "============================================"

# Variables
APP_DIR="/var/www/pv-materiel"
REPO_URL="https://github.com/Skyxo/rent-a-car.git"  # Adapter selon votre repo
LOG_DIR="/var/log/pv-materiel"
NGINX_CONF="/etc/nginx/sites-available/pv-materiel"
SYSTEMD_SERVICE="/etc/systemd/system/pv-materiel.service"

echo "→ Mise à jour du système..."
sudo apt update

echo "→ Installation des dépendances système..."
sudo apt install -y python3 python3-pip python3-venv nginx git \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libfribidi0 \
    libgdk-pixbuf2.0-0 libcairo2 libgirepository-1.0-1

echo "→ Création des répertoires..."
sudo mkdir -p $APP_DIR
sudo mkdir -p $LOG_DIR
sudo chown -R $USER:$USER $APP_DIR

echo "→ Clone/mise à jour du code..."
echo "→ Vérification du code..."
if [ ! -f "$APP_DIR/server.py" ]; then
    echo "❌ Erreur: Les fichiers de l'application ne sont pas présents"
    echo "Le script quick-deploy.sh doit d'abord transférer les fichiers"
    exit 1
fi

echo "→ Création de l'environnement virtuel Python..."
cd $APP_DIR
python3 -m venv venv
source venv/bin/activate

echo "→ Installation des dépendances Python..."
pip install --upgrade pip
pip install -r requirements.txt

echo "→ Création des répertoires de données..."
mkdir -p saved_pv config
sudo chown -R www-data:www-data saved_pv config

echo "→ Configuration Nginx..."
sudo cp deploy/nginx.conf $NGINX_CONF
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/pv-materiel
sudo rm -f /etc/nginx/sites-enabled/default  # Désactiver le site par défaut

echo "→ Test de la configuration Nginx..."
sudo nginx -t

echo "→ Configuration du service systemd..."
sudo cp deploy/pv-materiel.service $SYSTEMD_SERVICE
sudo systemctl daemon-reload

echo "→ Activation et démarrage du service..."
sudo systemctl enable pv-materiel.service
sudo systemctl restart pv-materiel.service

echo "→ Redémarrage de Nginx..."
sudo systemctl restart nginx

echo "→ Vérification du statut..."
sudo systemctl status pv-materiel.service --no-pager

echo ""
echo "============================================"
echo "✓ Déploiement terminé avec succès!"
echo "============================================"
echo ""
echo "📋 Commandes utiles:"
echo "  - Logs application:  sudo journalctl -u pv-materiel -f"
echo "  - Logs Nginx:        sudo tail -f /var/log/nginx/pv-materiel-*.log"
echo "  - Redémarrer app:    sudo systemctl restart pv-materiel"
echo "  - Statut app:        sudo systemctl status pv-materiel"
echo ""
echo "🌐 Application accessible sur: http://188.137.240.250"
echo ""
echo "⚙️  N'oubliez pas de configurer les paramètres SMTP via l'interface web!"
echo ""
