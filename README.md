# PV Matériel Loué - Centrale Lyon Conseil

## 🎯 Application de Gestion des Procès-Verbaux de Matériel Loué

Application web professionnelle développée pour Centrale Lyon Conseil permettant la numérisation complète du processus de gestion des locations de matériel. Cette solution transforme les procès-verbaux papier en documents PDF professionnels avec photos, signatures électroniques et envoi automatisé par email.

### ✨ Fonctionnalités Principales

- ✅ **Formulaire intelligent** : Saisie guidée pour réception et retour de matériel
- 📸 **Photos intégrées** : Upload de photos pour chaque poste d'inspection + observations
- ✍️ **Signatures électroniques** : Capture tactile des signatures (compatible mobile)
- 📄 **Génération PDF** : Documents professionnels avec photos et signatures
- 📧 **Envoi automatique** : Email avec PDF en pièce jointe aux destinataires
- 💾 **Gestion des brouillons** : Sauvegarde et reprise des PV en cours
- ⚙️ **Configuration web** : Paramètres SMTP configurables sans toucher au code
- 📱 **100% Responsive** : Interface optimisée pour tablettes et smartphones
- 🎨 **Charte graphique CLC** : Respect de l'identité visuelle École Centrale de Lyon

---

## 🚀 DÉPLOIEMENT EN PRODUCTION

### 🌐 Serveur : **188.137.240.250** (Zomro)

### Option 1 : Déploiement automatique rapide (Recommandé)

```bash
cd /home/charl/rent-a-car
./deploy/quick-deploy.sh
```

Ce script interactif vous guidera à travers toutes les étapes.

### Option 2 : Test de connexion d'abord

```bash
./deploy/test-connexion.sh
```

### Option 3 : Déploiement manuel

Consultez le guide complet : **[DEPLOY.md](DEPLOY.md)**

### Après le déploiement

1. **Accéder à l'application** : http://188.137.240.250
2. **Configurer l'email** : Cliquer sur "⚙️ Configuration Email"
3. **Tester l'envoi** : Utiliser le bouton "Tester la connexion"

---

## 💻 DÉVELOPPEMENT LOCAL

### Prérequis

#### Windows
```powershell
# Installer Python 3.11+ depuis python.org
python --version

# Installer les dépendances système pour WeasyPrint
# Télécharger GTK3 Runtime depuis https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv
sudo apt-get install -y libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
```

#### macOS
```bash
brew install python3
brew install pango gdk-pixbuf
```

### Installation des dépendances Python

```powershell
# Cloner le dépôt
git clone https://github.com/Skyxo/rent-a-car.git
cd rent-a-car

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Windows PowerShell :
.\venv\Scripts\Activate.ps1
# Linux/macOS :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt
```

---

## ⚙️ Configuration

### 1. Variables d'environnement

Copier le fichier d'exemple et le personnaliser :

```powershell
Copy-Item .env.example .env
```

Éditer `.env` avec vos informations :

```ini
SECRET_KEY=votre-cle-secrete-generee-aleatoirement
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
SENDER_EMAIL=votre-email@gmail.com
```

### 2. Configuration Gmail (recommandé)

Pour utiliser Gmail pour l'envoi d'emails :

1. Accéder à [Google Account Security](https://myaccount.google.com/security)
2. Activer la **validation en deux étapes**
3. Générer un **mot de passe d'application** :
   - Aller dans "Mots de passe des applications"
   - Sélectionner "Autre (nom personnalisé)"
   - Nommer : "PV Matériel Loué"
   - Copier le mot de passe de 16 caractères
4. Utiliser ce mot de passe dans `SMTP_PASSWORD`

---

## 🏃 Lancement de l'application

### Mode Développement

```powershell
# Activer l'environnement virtuel
.\venv\Scripts\Activate.ps1

# Lancer le serveur Flask
python server.py
```

L'application sera accessible sur : **http://localhost:5000**

### Mode Production avec Docker

```bash
# Construire l'image Docker
docker build -t pv-materiel-loue .

# Lancer le conteneur
docker run -d \
  -p 5000:5000 \
  -e SECRET_KEY="votre-cle-secrete" \
  -e SMTP_USERNAME="votre-email@gmail.com" \
  -e SMTP_PASSWORD="votre-mot-de-passe" \
  --name pv-app \
  pv-materiel-loue
```

---

## 📱 Utilisation

### Workflow Standard

1. **Accéder au formulaire** : Ouvrir l'application dans un navigateur (optimisé mobile/tablette)

2. **Remplir les informations** :
   - Identification du chantier et du matériel
   - Dates et compteurs (Réception et/ou Retour)
   - État du matériel via les tableaux d'inspection
   - Niveau de fluides et fuites

3. **Signer électroniquement** :
   - Tracer la signature dans le canvas "VISA Réception" et/ou "VISA Retour"
   - Utiliser le bouton "Effacer" si nécessaire

4. **Générer et envoyer** :
   - Cliquer sur "Générer et Envoyer le PV"
   - Le PDF est généré automatiquement
   - Le document est envoyé par email au destinataire

### Fonctionnalités Avancées

- **Sauvegarde automatique** : Les données du formulaire sont sauvegardées localement (localStorage) pour éviter les pertes
- **Validation intelligente** : Contrôles de cohérence (compteur retour > réception)
- **Responsive Design** : Interface optimisée pour tablettes de chantier
- **Signatures haute résolution** : Gestion du devicePixelRatio pour écrans Retina

---

## 🗂️ Structure du Projet

```
rent-a-car/
├── server.py                 # Serveur Flask principal
├── requirements.txt          # Dépendances Python
├── Dockerfile               # Configuration Docker
├── .env.example             # Template de configuration
├── .gitignore              # Fichiers à ignorer par Git
├── README.md               # Ce fichier
├── templates/
│   ├── index.html          # Formulaire de saisie
│   └── pdf_template.html   # Template pour génération PDF
└── static/
    ├── style.css           # Styles conformes à la charte CLC
    └── script.js           # Logique JavaScript (signatures, validation)
```

---

## 🔒 Sécurité

### Bonnes Pratiques Implémentées

- ✅ **Protection CSRF** : Tokens de sécurité
- ✅ **Limitation de taille** : 16MB maximum pour les requêtes
- ✅ **Variables d'environnement** : Secrets jamais en dur dans le code
- ✅ **TLS/SSL** : Connexion SMTP sécurisée via STARTTLS
- ✅ **Validation des données** : Sanitisation côté client et serveur

### Recommandations Production

1. **HTTPS obligatoire** : Déployer derrière un reverse proxy (Nginx) avec certificat SSL
2. **Secrets forts** : Générer une `SECRET_KEY` avec `python -c "import secrets; print(secrets.token_hex(32))"`
3. **Firewall** : Restreindre l'accès aux ports non utilisés
4. **Logs** : Monitorer les logs pour détecter les tentatives d'intrusion
5. **Mises à jour** : Maintenir les dépendances à jour (`pip list --outdated`)

---

## 🐛 Dépannage

### WeasyPrint ne fonctionne pas

**Symptôme** : Erreur lors de la génération du PDF

**Solution Windows** :
```powershell
# Installer GTK3 Runtime
# Télécharger depuis : https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
# Ajouter C:\Program Files\GTK3-Runtime Win64\bin au PATH système
```

**Solution Linux** :
```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
```

### Les emails ne sont pas envoyés

1. Vérifier que les identifiants SMTP sont corrects dans `.env`
2. Pour Gmail, s'assurer d'utiliser un **mot de passe d'application**, pas le mot de passe principal
3. Vérifier les logs Flask pour le message d'erreur exact
4. Tester la connexion SMTP manuellement :

```python
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('votre-email@gmail.com', 'votre-mot-de-passe-app')
print("Connexion réussie !")
```

### Le logo ne s'affiche pas dans le PDF

- Vérifier la connexion Internet (le logo est chargé depuis centralelyonconseil.fr)
- Alternative : Télécharger le logo localement et modifier le chemin dans `pdf_template.html`

---

## 📊 Performance

### Optimisations Implémentées

- **Compression des signatures** : Redimensionnement et optimisation Pillow avant insertion dans le PDF
- **Génération en mémoire** : Utilisation de BytesIO pour éviter les écritures disque
- **CDN** : Bootstrap et Font Awesome chargés via CDN pour réduire la taille du projet
- **Caching navigateur** : Headers appropriés pour les ressources statiques

### Benchmarks Typiques

- Temps de génération PDF : 2-4 secondes
- Taille PDF moyenne : 200-500 KB (avec 2 signatures)
- Temps d'envoi email : 1-3 secondes

---

## 🛠️ Développement

### Ajouter une nouvelle fonctionnalité

1. Créer une branche :
   ```bash
   git checkout -b feature/nouvelle-fonctionnalite
   ```

2. Modifier le code en respectant la structure MVC

3. Tester localement

4. Commiter et pousser :
   ```bash
   git add .
   git commit -m "feat: description de la fonctionnalité"
   git push origin feature/nouvelle-fonctionnalite
   ```

### Tests

```bash
# Installer les dépendances de test
pip install pytest pytest-flask

# Lancer les tests (à implémenter)
pytest tests/
```

---

## 📄 Licence

Ce projet est développé pour Centrale Lyon Conseil dans le cadre d'une mission Junior Entreprise.

---

## 👥 Support

Pour toute question ou assistance :

- **Email** : contact@centralelyonconseil.fr
- **Site web** : [centralelyonconseil.fr](https://www.centralelyonconseil.fr)

---

## 🎓 Crédits

Développé conformément aux spécifications techniques détaillées pour la numérisation des procès-verbaux de matériel loué, en respectant l'identité visuelle de l'École Centrale de Lyon.

**Technologies utilisées** :
- Flask (Pallets Projects)
- WeasyPrint (Kozea)
- signature_pad (Szymon Nowak)
- Bootstrap (Twitter)
