# PV Matériel Loué - France Montage - Groupe Briand

## 🎯 Application de Gestion des Procès-Verbaux de Matériel Loué

Application web professionnelle développée pour **France Montage - Groupe Briand** permettant la numérisation complète du processus de contrôle des matériels loués. Cette solution transforme les procès-verbaux papier en documents PDF professionnels avec photos, signatures électroniques et envoi automatisé par email.

### ✨ Fonctionnalités Principales

- ✅ **Formulaire de contrôle complet** : Saisie guidée pour réception et retour de matériel
- 📸 **Upload de photos** : Ajout de photos pour chaque poste d'inspection avec observations
- ✍️ **Signatures électroniques** : Capture tactile des visas loueur et locataire (compatible mobile)
- 📄 **Génération PDF automatique** : Documents professionnels avec insertion des photos et signatures
- 📧 **Envoi par email** : Email automatique avec PDF en pièce jointe au conducteur de travaux
- 💾 **Sauvegarde automatique** : Protection contre la perte de données (localStorage 24h)
- 🔄 **Gestion des PV** : Sauvegarde, chargement et reprise des PV en cours (brouillons, envoyés)
- ⚙️ **Configuration SMTP** : Paramètres email configurables via interface web
- 📱 **100% Responsive** : Interface mobile-first optimisée pour tablettes et smartphones de chantier
- 🎨 **Charte graphique** : Respect de l'identité visuelle France Montage - Groupe Briand

---

## 🚀 ACCÈS EN PRODUCTION

### 🌐 URL : **http://188.137.240.250**

L'application est déployée et accessible 24h/24, 7j/7 depuis n'importe quel navigateur moderne.

### Premier accès

1. **Ouvrir l'application** : http://188.137.240.250
2. **Configurer l'email** : Cliquer sur "⚙️ Configuration Email" en haut à droite
3. **Renseigner les paramètres SMTP** : Serveur, port, email expéditeur et mot de passe
4. **Tester la connexion** : Utiliser le bouton "Tester" puis "Sauvegarder"

> 📖 **Guide utilisateur complet** : Consultez [GUIDE_UTILISATEUR.md](GUIDE_UTILISATEUR.md) pour les instructions détaillées.

---

## 💻 DÉVELOPPEMENT LOCAL

### Prérequis

- Python 3.8+ (testé avec Python 3.11)
- Dépendances système pour WeasyPrint (génération PDF)

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv
sudo apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
```

#### Windows
```powershell
# Installer Python 3.11+ depuis python.org
# Télécharger GTK3 Runtime : https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
```

#### macOS
```bash
brew install python3 pango gdk-pixbuf
```

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/Skyxo/rent-a-car.git
cd rent-a-car

# Créer un environnement virtuel
python3 -m venv .venv

# Activer l'environnement virtuel
# Linux/macOS :
source .venv/bin/activate
# Windows PowerShell :
.\.venv\Scripts\Activate.ps1

# Installer les dépendances
pip install -r requirements.txt
```

---

## ⚙️ Configuration SMTP

La configuration SMTP se fait directement via l'interface web (recommandé) ou via variables d'environnement.

### Via l'interface web (recommandé)

1. Accéder à l'application
2. Cliquer sur "⚙️ Configuration Email"
3. Renseigner les paramètres :
   - **Serveur SMTP** : `smtp.gmail.com` (pour Gmail)
   - **Port SMTP** : `587`
   - **Email expéditeur** : votre adresse email
   - **Mot de passe** : mot de passe d'application (pas le mot de passe principal)
   - **Nom expéditeur** : "France Montage" (par exemple)

### Configuration Gmail

Pour utiliser Gmail, vous devez générer un **mot de passe d'application** :

1. Activer la validation en deux étapes sur votre compte Google
2. Accéder à [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Créer un nouveau mot de passe d'application (nommer "PV Matériel")
4. Copier le code à 16 caractères généré
5. Utiliser ce code dans le champ "Mot de passe SMTP"

---

## 🏃 Lancement de l'application

### Mode Développement

```bash
# Activer l'environnement virtuel
source .venv/bin/activate  # Linux/macOS
# ou
.\.venv\Scripts\Activate.ps1  # Windows

# Lancer le serveur Flask
python server.py
```

L'application sera accessible sur : **http://localhost:5000**

### Mode Production (Docker)

```bash
# Construire l'image
docker build -t pv-materiel .

# Lancer le conteneur
docker run -d -p 80:5000 --name pv-materiel pv-materiel
```

---

## 📱 Utilisation

### Workflow de création d'un PV

1. **Remplir les informations générales** :
   - Chantier, client, machine, modèle, n° série
   - Dates et compteurs d'heures (Réception et/ou Retour)

2. **Contrôler le matériel** :
   - Pour chaque poste (Éclairage, Rétroviseurs, Carrosserie, etc.) :
     - Sélectionner l'état : **Bon** / **Défectueux** / **N/A**
     - Ajouter des photos si nécessaire
     - Rédiger des observations
   - Indiquer le niveau de carburant (slider 0-100%)
   - Signaler les fuites (Oui/Non) : Moteur, Hydraulique, Gasoil

3. **Signer électroniquement** :
   - Signature Loueur (Réception et/ou Retour)
   - Signature Locataire (Réception et/ou Retour)

4. **Générer et envoyer** :
   - **"Sauvegarder pour plus tard"** : Enregistrer en brouillon sur le serveur
   - **"Télécharger PDF"** : Générer et télécharger le PDF immédiatement
   - **"Valider et Envoyer par Email"** : Générer le PDF et l'envoyer automatiquement

### Fonctionnalités avancées

- **Sauvegarde automatique locale** : Toutes les 500ms dans le localStorage (expire après 24h)
- **Gestion des PV existants** : Charger, modifier, compléter des PV sauvegardés
- **Statuts des PV** : Nouveau, Brouillon, Envoyé, Téléchargé
- **Déselection des boutons radio** : Cliquer à nouveau pour déselectionner un état
- **Photos persistantes** : Les photos sont sauvegardées avec le PV et restaurées au chargement

---

## 🗂️ Structure du Projet

```
rent-a-car/
├── server.py                  # Serveur Flask principal (801 lignes)
│                              # - Routes : index, submit, download-pdf, config SMTP
│                              # - Génération PDF avec WeasyPrint
│                              # - Envoi email SMTP
│                              # - Gestion des PV sauvegardés (JSON)
│
├── requirements.txt           # Dépendances Python
│                              # - Flask 3.0.0
│                              # - WeasyPrint 60.1
│                              # - Gunicorn 21.2.0
│                              # - Pillow 10.1.0
│
├── templates/
│   ├── index.html             # Formulaire principal (responsive)
│   │                          # - Formulaire Réception/Retour
│   │                          # - Upload photos, signatures canvas
│   │                          # - Gestion localStorage (auto-save)
│   │
│   └── pdf_template.html      # Template PDF (Jinja2 + WeasyPrint)
│                              # - Mise en page A4 single-page
│                              # - Insertion photos et signatures
│                              # - Logos France Montage + QPE
│
├── static/
│   ├── script.js              # Logique JavaScript (1355 lignes)
│   │                          # - Gestion signatures (SignaturePad)
│   │                          # - Upload et gestion photos (Base64)
│   │                          # - Auto-save localStorage (24h expiry)
│   │                          # - Déselection radio buttons
│   │                          # - Gestion PV (load, save, create)
│   │
│   ├── style.css              # Styles CSS (1013 lignes)
│   │                          # - Charte graphique France Montage
│   │                          # - Responsive mobile-first
│   │                          # - Surcharges Bootstrap
│   │
│   ├── logo.png               # Logo France Montage (PDF)
│   ├── logo_inverse.png       # Logo France Montage (header)
│   └── qpe.png                # Logo QPE (PDF)
│
├── config/
│   └── smtp_config.json       # Configuration SMTP (généré par l'interface)
│
├── saved_pv/                  # PV sauvegardés (fichiers JSON)
│   └── <uuid>.json            # Format : {form_data, photos, status, timestamp}
│
├── deploy/                    # Scripts de déploiement
│   ├── quick-deploy.sh        # Déploiement rapide
│   ├── test-connexion.sh      # Test SSH
│   └── pv-materiel.service    # Service systemd
│
├── Dockerfile                 # Configuration Docker
├── gunicorn_config.py         # Configuration Gunicorn
├── README.md                  # Documentation (ce fichier)
├── GUIDE_UTILISATEUR.md       # Guide utilisateur final
└── DEPLOY.md                  # Guide de déploiement
```

---

## 🔧 Technologies Utilisées

### Backend
- **Flask 3.0.0** : Framework web Python
- **WeasyPrint 60.1** : Génération de PDF depuis HTML/CSS
- **Gunicorn 21.2.0** : Serveur WSGI pour production
- **Pillow 10.1.0** : Traitement et optimisation des images

### Frontend
- **Bootstrap 5.3.0** : Framework CSS responsive
- **SignaturePad 4.1.7** : Capture de signatures tactiles
- **Font Awesome 6** : Icônes
- **Vanilla JavaScript** : Gestion du formulaire et interactions

### Infrastructure
- **Nginx** : Reverse proxy et serveur web (production)
- **Systemd** : Gestion du service (pv-materiel.service)
- **Docker** : Conteneurisation (optionnel)

---

## 🔒 Sécurité

### Bonnes Pratiques Implémentées

- ✅ **Limite de taille des requêtes** : 16MB maximum (protection DoS)
- ✅ **Variables d'environnement** : Secrets jamais en dur dans le code
- ✅ **SMTP sécurisé** : Connexion TLS via STARTTLS (port 587)
- ✅ **Validation des données** : Sanitisation côté client et serveur
- ✅ **Optimisation des images** : Redimensionnement automatique des photos

### Recommandations Production

1. **HTTPS obligatoire** : Configurer un certificat SSL/TLS (Let's Encrypt)
2. **Secrets forts** : Générer une `SECRET_KEY` aléatoire
3. **Firewall** : Restreindre l'accès aux ports (80, 443 uniquement)
4. **Logs** : Monitorer les logs Nginx et Gunicorn
5. **Mises à jour** : Maintenir les dépendances à jour (`pip list --outdated`)

---

## 🐛 Dépannage

### WeasyPrint : Erreur de génération PDF

**Linux** :
```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
```

**Windows** :
- Télécharger GTK3 Runtime : [https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer](https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer)
- Ajouter `C:\Program Files\GTK3-Runtime Win64\bin` au PATH

### Les emails ne sont pas envoyés

1. Vérifier la configuration SMTP dans "⚙️ Configuration Email"
2. Pour Gmail : utiliser un **mot de passe d'application** (pas le mot de passe principal)
3. Vérifier les logs : `journalctl -u pv-materiel -f` (production)
4. Tester manuellement :
   ```python
   import smtplib
   server = smtplib.SMTP('smtp.gmail.com', 587)
   server.starttls()
   server.login('email@gmail.com', 'mot-de-passe-app')
   print("✅ Connexion réussie")
   ```

### Les photos ne s'affichent pas dans le PDF

- Vérifier que les photos sont bien uploadées (prévisualisation visible)
- Vérifier les logs serveur pour les erreurs de conversion Base64
- Limiter la taille des photos (< 5MB par photo recommandé)

### Problème de signatures sur mobile

- Vérifier que le canvas est bien visible (pas de dépassement)
- S'assurer que JavaScript est activé
- Tester avec Chrome ou Safari mobile (meilleure compatibilité)

---

## 📊 Performance

### Métriques Typiques

- **Génération PDF** : 2-5 secondes (selon le nombre de photos)
- **Taille PDF** : 200-800 KB (avec 2-4 photos et signatures)
- **Envoi email** : 1-3 secondes (selon la taille du PDF)
- **Temps de chargement page** : < 1 seconde

### Optimisations Implémentées

- Compression et redimensionnement automatique des signatures
- Génération PDF en mémoire (BytesIO, pas d'écriture disque temporaire)
- Ressources statiques (Bootstrap, Font Awesome) via CDN
- Auto-save localStorage (évite les requêtes serveur inutiles)

---

## 📚 Documentation

- **[GUIDE_UTILISATEUR.md](GUIDE_UTILISATEUR.md)** : Guide complet pour les utilisateurs finaux
- **[DEPLOY.md](DEPLOY.md)** : Instructions détaillées de déploiement sur serveur
- **[CHANGELOG_FMB.md](CHANGELOG_FMB.md)** : Historique des modifications et versions

---

## 🚀 Déploiement

Pour déployer l'application sur un serveur de production, consultez le guide détaillé : **[DEPLOY.md](DEPLOY.md)**

Scripts de déploiement disponibles :
```bash
./deploy/quick-deploy.sh      # Déploiement automatique (recommandé)
./deploy/test-connexion.sh    # Test de connexion SSH
```

---

## 📄 Licence

Projet développé pour **France Montage - Groupe Briand** dans le cadre de la digitalisation des procès-verbaux de matériel loué.

---

## 👥 Support & Contact

Pour toute question, assistance ou suggestion d'amélioration :

- **Déploiement** : Serveur 188.137.240.250
- **Application** : http://188.137.240.250
- **Documentation** : Voir les fichiers `GUIDE_UTILISATEUR.md` et `DEPLOY.md`

---

## 🎓 Crédits

**Développé par** : Charles (Skyxo)  
**Client** : France Montage - Groupe Briand  
**Date** : Novembre 2025

**Technologies open-source utilisées** :
- Flask (Pallets Projects)
- WeasyPrint (Kozea)
- SignaturePad (Szymon Nowak)
- Bootstrap (Twitter)
- Font Awesome (Fonticons)
