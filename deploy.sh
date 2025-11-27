#!/bin/bash

################################################################################
# Script de déploiement automatique - PV Matériel Loué
# Version 1.0
# Usage: ./deploy.sh [install|update|restart|logs]
################################################################################

set -e  # Arrêt en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# CONFIGURATION - À PERSONNALISER
################################################################################

# Configuration serveur
SSH_USER="votre_user"                    # Nom d'utilisateur SSH
SSH_HOST="votre-serveur.com"             # Adresse du serveur
SSH_PORT="22"                            # Port SSH (généralement 22)
SSH_KEY=""                               # Chemin vers clé SSH (optionnel)

# Configuration application
APP_DIR="/var/www/pv-materiel"           # Répertoire d'installation
APP_USER="www-data"                      # Utilisateur système pour l'app
DOMAIN_NAME=""                           # Nom de domaine (optionnel pour HTTPS)

# Configuration Python
PYTHON_VERSION="python3"                 # Version Python à utiliser

################################################################################
# FONCTIONS
################################################################################

print_header() {
    echo -e "${BLUE}=====================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}=====================================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Construire la commande SSH
ssh_cmd() {
    if [ -n "$SSH_KEY" ]; then
        ssh -i "$SSH_KEY" -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "$@"
    else
        ssh -p "$SSH_PORT" "$SSH_USER@$SSH_HOST" "$@"
    fi
}

# Construire la commande SCP
scp_cmd() {
    if [ -n "$SSH_KEY" ]; then
        scp -i "$SSH_KEY" -P "$SSH_PORT" "$@" "$SSH_USER@$SSH_HOST:$1"
    else
        scp -P "$SSH_PORT" "$@" "$SSH_USER@$SSH_HOST:$1"
    fi
}

# Test de connexion SSH
test_connection() {
    print_header "Test de connexion SSH"
    
    if ssh_cmd "echo 'Connexion SSH réussie'"; then
        print_success "Connexion SSH établie avec succès"
        return 0
    else
        print_error "Échec de la connexion SSH"
        return 1
    fi
}

# Installation complète
install() {
    print_header "Installation de l'application PV Matériel Loué"
    
    # Test de connexion
    if ! test_connection; then
        print_error "Impossible de se connecter au serveur. Vérifiez vos paramètres SSH."
        exit 1
    fi
    
    # Installation des dépendances système
    print_info "Installation des dépendances système..."
    ssh_cmd "sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv nginx git libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0"
    print_success "Dépendances système installées"
    
    # Création de la structure de répertoires
    print_info "Création de la structure de répertoires..."
    ssh_cmd "sudo mkdir -p $APP_DIR && sudo chown $USER:$USER $APP_DIR"
    ssh_cmd "mkdir -p $APP_DIR/saved_pv $APP_DIR/config $APP_DIR/static $APP_DIR/templates"
    ssh_cmd "sudo mkdir -p /var/log/pv-materiel && sudo chown $APP_USER:$APP_USER /var/log/pv-materiel"
    print_success "Structure de répertoires créée"
    
    # Transfert des fichiers
    print_info "Transfert des fichiers de l'application..."
    rsync -avz --exclude='.venv' --exclude='__pycache__' --exclude='.git' --exclude='.gitignore' \
          --exclude='saved_pv/*' --exclude='.env' \
          -e "ssh -p $SSH_PORT $([ -n "$SSH_KEY" ] && echo "-i $SSH_KEY")" \
          . "$SSH_USER@$SSH_HOST:$APP_DIR/"
    print_success "Fichiers transférés"
    
    # Création de l'environnement virtuel Python
    print_info "Création de l'environnement virtuel Python..."
    ssh_cmd "cd $APP_DIR && $PYTHON_VERSION -m venv .venv"
    print_success "Environnement virtuel créé"
    
    # Installation des dépendances Python
    print_info "Installation des dépendances Python..."
    ssh_cmd "cd $APP_DIR && source .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"
    print_success "Dépendances Python installées"
    
    # Création du fichier de configuration Gunicorn
    print_info "Configuration de Gunicorn..."
    ssh_cmd "cat > $APP_DIR/gunicorn_config.py << 'EOF'
bind = \"127.0.0.1:5000\"
workers = 2
worker_class = \"sync\"
timeout = 120
keepalive = 5
accesslog = \"/var/log/pv-materiel/access.log\"
errorlog = \"/var/log/pv-materiel/error.log\"
loglevel = \"info\"
EOF"
    print_success "Configuration Gunicorn créée"
    
    # Création du service systemd
    print_info "Création du service systemd..."
    ssh_cmd "sudo bash -c 'cat > /etc/systemd/system/pv-materiel.service << EOF
[Unit]
Description=PV Matériel Loué - France Montage
After=network.target

[Service]
Type=notify
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=\"PATH=$APP_DIR/.venv/bin\"
ExecStart=$APP_DIR/.venv/bin/gunicorn -c gunicorn_config.py server:app
ExecReload=/bin/kill -s HUP \\\$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF'"
    ssh_cmd "sudo systemctl daemon-reload"
    ssh_cmd "sudo systemctl enable pv-materiel"
    print_success "Service systemd créé"
    
    # Configuration Nginx
    print_info "Configuration de Nginx..."
    ssh_cmd "sudo bash -c 'cat > /etc/nginx/sites-available/pv-materiel << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME:-_};

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    location /static {
        alias $APP_DIR/static;
        expires 30d;
        add_header Cache-Control \"public, immutable\";
    }

    access_log /var/log/nginx/pv-materiel-access.log;
    error_log /var/log/nginx/pv-materiel-error.log;
}
EOF'"
    ssh_cmd "sudo ln -sf /etc/nginx/sites-available/pv-materiel /etc/nginx/sites-enabled/"
    ssh_cmd "sudo rm -f /etc/nginx/sites-enabled/default"  # Supprimer le site par défaut
    ssh_cmd "sudo nginx -t"
    print_success "Configuration Nginx créée"
    
    # Configuration des permissions
    print_info "Configuration des permissions..."
    ssh_cmd "sudo chown -R $APP_USER:$APP_USER $APP_DIR"
    ssh_cmd "sudo chmod -R 755 $APP_DIR"
    ssh_cmd "sudo chmod 775 $APP_DIR/saved_pv $APP_DIR/config"
    print_success "Permissions configurées"
    
    # Configuration du firewall (UFW)
    print_info "Configuration du firewall..."
    ssh_cmd "sudo ufw --force allow 22/tcp"  # SSH
    ssh_cmd "sudo ufw --force allow 80/tcp"  # HTTP
    ssh_cmd "sudo ufw --force allow 443/tcp" # HTTPS
    ssh_cmd "sudo ufw --force enable" || true
    print_success "Firewall configuré"
    
    # Démarrage des services
    print_info "Démarrage des services..."
    ssh_cmd "sudo systemctl start pv-materiel"
    ssh_cmd "sudo systemctl restart nginx"
    print_success "Services démarrés"
    
    # Vérification du statut
    sleep 3
    if ssh_cmd "sudo systemctl is-active --quiet pv-materiel"; then
        print_success "Service pv-materiel actif"
    else
        print_error "Le service pv-materiel n'est pas démarré"
        ssh_cmd "sudo journalctl -u pv-materiel -n 20"
        exit 1
    fi
    
    print_header "Installation terminée avec succès ! 🎉"
    echo ""
    print_info "Application accessible sur : http://$SSH_HOST"
    echo ""
    print_warning "Prochaines étapes :"
    echo "  1. Configurez l'email SMTP via l'interface web (⚙️ Configuration Email)"
    echo "  2. Testez la création d'un PV"
    if [ -n "$DOMAIN_NAME" ]; then
        echo "  3. Configurez HTTPS avec : sudo certbot --nginx -d $DOMAIN_NAME"
    fi
    echo ""
}

# Mise à jour de l'application
update() {
    print_header "Mise à jour de l'application"
    
    # Transfert des fichiers mis à jour
    print_info "Transfert des fichiers mis à jour..."
    rsync -avz --exclude='.venv' --exclude='__pycache__' --exclude='.git' \
          --exclude='saved_pv/*' --exclude='config/*' --exclude='.env' \
          -e "ssh -p $SSH_PORT $([ -n "$SSH_KEY" ] && echo "-i $SSH_KEY")" \
          . "$SSH_USER@$SSH_HOST:$APP_DIR/"
    print_success "Fichiers transférés"
    
    # Mise à jour des dépendances
    print_info "Mise à jour des dépendances Python..."
    ssh_cmd "cd $APP_DIR && source .venv/bin/activate && pip install -r requirements.txt"
    print_success "Dépendances mises à jour"
    
    # Redémarrage du service
    print_info "Redémarrage du service..."
    ssh_cmd "sudo systemctl restart pv-materiel"
    sleep 2
    
    if ssh_cmd "sudo systemctl is-active --quiet pv-materiel"; then
        print_success "Service redémarré avec succès"
    else
        print_error "Échec du redémarrage du service"
        ssh_cmd "sudo journalctl -u pv-materiel -n 20"
        exit 1
    fi
    
    print_success "Mise à jour terminée !"
}

# Redémarrage du service
restart() {
    print_header "Redémarrage du service"
    
    ssh_cmd "sudo systemctl restart pv-materiel"
    sleep 2
    
    if ssh_cmd "sudo systemctl is-active --quiet pv-materiel"; then
        print_success "Service redémarré avec succès"
    else
        print_error "Échec du redémarrage"
        exit 1
    fi
}

# Afficher les logs
logs() {
    print_header "Logs du service (Ctrl+C pour quitter)"
    ssh_cmd "sudo journalctl -u pv-materiel -f"
}

# Afficher le statut
status() {
    print_header "Statut du service"
    ssh_cmd "sudo systemctl status pv-materiel"
}

# Menu d'aide
show_help() {
    echo "Usage: $0 [commande]"
    echo ""
    echo "Commandes disponibles :"
    echo "  install    Installation complète de l'application"
    echo "  update     Mise à jour de l'application (fichiers + dépendances)"
    echo "  restart    Redémarrage du service"
    echo "  logs       Afficher les logs en temps réel"
    echo "  status     Afficher le statut du service"
    echo "  test       Tester la connexion SSH"
    echo ""
    echo "Exemple :"
    echo "  $0 install    # Installation complète"
    echo "  $0 update     # Mise à jour rapide"
    echo ""
}

################################################################################
# MAIN
################################################################################

# Vérification de la configuration
if [ "$SSH_USER" = "votre_user" ] || [ "$SSH_HOST" = "votre-serveur.com" ]; then
    print_error "Veuillez configurer les variables SSH_USER et SSH_HOST dans le script"
    echo ""
    echo "Éditez le fichier deploy.sh et modifiez :"
    echo "  SSH_USER=\"votre_utilisateur_ssh\""
    echo "  SSH_HOST=\"votre-serveur.com\""
    exit 1
fi

# Traitement de la commande
case "${1:-install}" in
    install)
        install
        ;;
    update)
        update
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    test)
        test_connection
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Commande inconnue : $1"
        echo ""
        show_help
        exit 1
        ;;
esac
