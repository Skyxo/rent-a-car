#!/bin/bash

##############################################################################
# Script de test de connexion au serveur Zomro
##############################################################################

SERVER_IP="188.137.240.250"
SERVER_USER="root"  # Modifier si nécessaire

echo "============================================"
echo "Test de connexion au serveur"
echo "============================================"
echo ""
echo "Serveur: $SERVER_IP"
echo "Utilisateur: $SERVER_USER"
echo ""

# Test de ping
echo "→ Test de ping..."
if ping -c 3 $SERVER_IP > /dev/null 2>&1; then
    echo "✓ Serveur accessible (ping OK)"
else
    echo "❌ Serveur inaccessible (ping échoué)"
    echo "Vérifiez l'adresse IP et votre connexion internet"
    exit 1
fi

# Test SSH
echo ""
echo "→ Test de connexion SSH..."
echo "  (Vous devrez peut-être entrer votre mot de passe)"
echo ""

ssh -o ConnectTimeout=10 -o BatchMode=no $SERVER_USER@$SERVER_IP << 'EOF'
    echo "✓ Connexion SSH réussie!"
    echo ""
    echo "Informations du serveur:"
    echo "  - OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "  - Kernel: $(uname -r)"
    echo "  - Python: $(python3 --version 2>/dev/null || echo 'Non installé')"
    echo "  - Nginx: $(nginx -v 2>&1 | cut -d'/' -f2 || echo 'Non installé')"
    echo "  - Git: $(git --version | cut -d' ' -f3 || echo 'Non installé')"
    echo ""
    echo "Espace disque disponible:"
    df -h / | tail -1
    echo ""
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✓ Tous les tests sont OK!"
    echo "============================================"
    echo ""
    echo "Vous pouvez maintenant déployer l'application avec:"
    echo "  ./deploy/deploy-remote.sh"
    echo ""
else
    echo ""
    echo "============================================"
    echo "❌ Erreur de connexion SSH"
    echo "============================================"
    echo ""
    echo "Veuillez vérifier:"
    echo "  1. Votre clé SSH est configurée"
    echo "  2. L'utilisateur '$SERVER_USER' existe sur le serveur"
    echo "  3. Le port SSH (22) est ouvert"
    echo ""
    echo "Pour configurer une clé SSH:"
    echo "  ssh-copy-id $SERVER_USER@$SERVER_IP"
    echo ""
fi
