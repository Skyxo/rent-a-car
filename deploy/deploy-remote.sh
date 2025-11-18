#!/bin/bash

##############################################################################
# Script de déploiement DISTANT pour PV Matériel Loué
# À exécuter depuis votre machine locale
##############################################################################

set -e

# Configuration
SERVER_IP="188.137.240.250"
SERVER_USER="root"  # Adapter selon votre utilisateur SSH

echo "============================================"
echo "Déploiement distant sur $SERVER_IP"
echo "============================================"

# Vérifier la connexion SSH
echo "→ Test de connexion SSH..."
ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo 'Connexion SSH OK'" || {
    echo "❌ Erreur: Impossible de se connecter au serveur"
    echo "Vérifiez votre connexion SSH et vos identifiants"
    exit 1
}

echo "→ Copie des fichiers vers le serveur..."
rsync -avz --exclude='.git' --exclude='venv' --exclude='__pycache__' \
    --exclude='*.pyc' --exclude='.env' --exclude='saved_pv/*' \
    ./ $SERVER_USER@$SERVER_IP:/tmp/pv-materiel-deploy/

echo "→ Exécution du déploiement sur le serveur..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    cd /tmp/pv-materiel-deploy
    chmod +x deploy/deploy.sh
    sudo ./deploy/deploy.sh
    cd ~
    rm -rf /tmp/pv-materiel-deploy
ENDSSH

echo ""
echo "============================================"
echo "✓ Déploiement distant terminé avec succès!"
echo "============================================"
echo ""
echo "🌐 Application accessible sur: http://$SERVER_IP"
echo ""
echo "📋 Pour vous connecter au serveur:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo ""
