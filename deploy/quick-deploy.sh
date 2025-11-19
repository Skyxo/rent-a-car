#!/bin/bash

##############################################################################
# DÉPLOIEMENT RAPIDE - PV Matériel Loué
# Ce script vous guide étape par étape
##############################################################################

set -e

SERVER_IP="188.137.240.250"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   DÉPLOIEMENT - PV MATÉRIEL LOUÉ                          ║"
echo "║   Centrale Lyon Conseil                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "server.py" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier de l'application"
    echo "   Utilisez: cd /home/charl/rent-a-car && ./deploy/quick-deploy.sh"
    exit 1
fi

echo "📋 Étape 1/5: Configuration"
echo "─────────────────────────────────────────────────────────────"
echo ""
read -p "Entrez l'utilisateur SSH du serveur [root]: " SERVER_USER
echo ""

echo "📡 Étape 2/5: Test de connexion au serveur $SERVER_IP"
echo "─────────────────────────────────────────────────────────────"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER_IP "echo 'OK'" > /dev/null 2>&1; then
    echo "⚠️  Connexion SSH échouée en mode automatique"
    echo ""
    read -p "Voulez-vous configurer une clé SSH maintenant? (o/N): " SETUP_SSH
    if [[ $SETUP_SSH =~ ^[Oo]$ ]]; then
        echo "→ Configuration de la clé SSH..."
        ssh-copy-id $SERVER_USER@$SERVER_IP
    else
        echo "❌ Le déploiement nécessite un accès SSH. Configurez-le d'abord avec:"
        echo "   ssh-copy-id $SERVER_USER@$SERVER_IP"
        exit 1
    fi
fi
echo "✓ Connexion SSH OK"
echo ""

echo "📦 Étape 3/5: Préparation du code"
echo "─────────────────────────────────────────────────────────────"
echo "→ Vérification des fichiers..."
if [ ! -d "deploy" ] || [ ! -f "deploy/deploy.sh" ]; then
    echo "❌ Fichiers de déploiement manquants"
    exit 1
fi
echo "✓ Fichiers OK"
echo ""

echo "🚀 Étape 4/5: Transfert et installation"
echo "─────────────────────────────────────────────────────────────"
echo "→ Copie des fichiers vers le serveur..."
rsync -avz --exclude='.git' --exclude='venv' --exclude='__pycache__' \
    --exclude='*.pyc' --exclude='.env' --exclude='saved_pv/*' \
    --exclude='config/*' --progress \
    ./ $SERVER_USER@$SERVER_IP:/tmp/pv-materiel-deploy/ || {
    echo "❌ Erreur lors du transfert des fichiers"
    exit 1
}
echo "✓ Transfert terminé"
echo ""

echo "→ Installation sur le serveur (cela peut prendre quelques minutes)..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
    set -e
    cd /tmp/pv-materiel-deploy
    chmod +x deploy/deploy.sh
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "Installation sur le serveur en cours..."
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    sudo ./deploy/deploy.sh
    
    echo ""
    echo "Nettoyage..."
    cd ~
    rm -rf /tmp/pv-materiel-deploy
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "Installation sur le serveur terminée"
    echo "═══════════════════════════════════════════════════════════"
ENDSSH

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de l'installation sur le serveur"
    exit 1
fi
echo ""

echo "🔍 Étape 5/5: Vérification"
echo "─────────────────────────────────────────────────────────────"
sleep 3  # Attendre que les services démarrent

echo "→ Test de l'application..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP/health || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Application accessible et fonctionnelle!"
else
    echo "⚠️  Code HTTP: $HTTP_CODE"
    echo "   L'application démarre, cela peut prendre quelques secondes..."
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    ✓ DÉPLOIEMENT RÉUSSI                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Accès à l'application:"
echo "   http://$SERVER_IP"
echo ""
echo "⚙️  Configuration à faire:"
echo "   1. Ouvrir http://$SERVER_IP dans votre navigateur"
echo "   2. Cliquer sur '⚙️ Configuration Email'"
echo "   3. Remplir les paramètres SMTP"
echo "   4. Tester la connexion email"
echo ""
echo "📋 Commandes utiles:"
echo "   • Se connecter au serveur:"
echo "     ssh $SERVER_USER@$SERVER_IP"
echo ""
echo "   • Voir les logs en direct:"
echo "     ssh $SERVER_USER@$SERVER_IP 'sudo journalctl -u pv-materiel -f'"
echo ""
echo "   • Redémarrer l'application:"
echo "     ssh $SERVER_USER@$SERVER_IP 'sudo systemctl restart pv-materiel'"
echo ""
echo "📖 Documentation complète: voir DEPLOY.md"
echo ""
