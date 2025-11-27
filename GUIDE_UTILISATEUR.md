# Guide Utilisateur - PV de Contrôle Matériel

Ce guide explique comment utiliser l'application web de gestion des Procès-Verbaux de matériel loué.

## 1. Accès à l'application

L'application est accessible via un navigateur web (Chrome, Safari, Firefox) sur smartphone, tablette ou ordinateur.
Adresse : `http://188.137.240.250` (ou l'URL fournie par votre administrateur).

## 2. Création d'un nouveau PV

À l'ouverture, vous arrivez sur le formulaire de contrôle.

### Informations Générales
Remplissez les champs concernant le chantier et la machine :
- **Chantier** : Nom ou code du chantier
- **Client** : Nom du client
- **Machine** : Type de machine (ex: Nacelle, Chariot)
- **Modèle** : Modèle précis
- **N° Série** : Numéro de série de la machine

### État des Lieux (Réception / Retour)
Le formulaire est divisé en deux colonnes principales : **Réception** (départ) et **Retour**.

Pour chaque élément (Éclairage, Rétroviseurs, Carrosserie, etc.) :
1.  Indiquez l'état :
    *   **Bon** : En bon état
    *   **Défectueux** : Présente un défaut
    *   **N/A** : Non applicable
2.  **Photos** : Cliquez sur "Choisir un fichier" pour prendre une photo ou en sélectionner une depuis votre galerie.
3.  **Observations** : Ajoutez un commentaire si nécessaire.

### Niveaux et Fuites
- **Carburant** : Utilisez le curseur pour indiquer le niveau (0% à 100%).
- **Fuites** : Sélectionnez "Oui" ou "Non" pour Moteur, Hydraulique et Gasoil.

## 3. Signatures

En bas de page, les signatures sont obligatoires :
- **Visa Loueur** : Signature du responsable matériel.
- **Visa Locataire** : Signature du conducteur de travaux ou réceptionnaire.

Utilisez votre doigt ou un stylet pour signer dans le cadre prévu.

## 4. Sauvegarde et Envoi

### Sauvegarde Automatique
L'application sauvegarde automatiquement votre travail en cours sur votre appareil. Si vous fermez la page par erreur, vos données seront restaurées à la prochaine visite.

### Sauvegarder pour plus tard
Cliquez sur le bouton **"Sauvegarder pour plus tard"** pour enregistrer le PV sur le serveur. Vous pourrez le reprendre depuis un autre appareil via la liste "Charger un PV existant".

### Télécharger le PDF
Cliquez sur **"Télécharger PDF"** pour générer et télécharger immédiatement le rapport au format PDF.

### Envoyer par Email
1.  Renseignez l'adresse email du conducteur de travaux.
2.  Cliquez sur **"Valider et Envoyer par Email"**.
3.  Le PDF sera généré et envoyé automatiquement aux destinataires configurés.

## 5. Gestion des PV existants

En haut de page, la section "Charger un PV existant" permet de :
- Voir la liste des PV enregistrés (Brouillons, Envoyés, Téléchargés).
- Reprendre un PV pour le compléter (ex: faire le Retour après la Réception).
- Voir le statut de chaque PV (Nouveau, Brouillon, Envoyé).

## 6. Configuration de l'envoi d'email

Pour que l'envoi automatique par email fonctionne, le serveur doit être configuré avec un compte email valide (SMTP).

### Accéder à la configuration
1.  Sur la page d'accueil, cliquez sur le bouton **"⚙️ Configuration Email"** (situé en haut à droite ou dans le menu).
2.  Une fenêtre de configuration s'ouvre.

### Paramètres requis
Remplissez les champs suivants :
-   **Serveur SMTP** : Adresse du serveur d'envoi (ex: `smtp.gmail.com` pour Gmail, `smtp.office365.com` pour Outlook).
-   **Port SMTP** : Port de connexion (généralement `587` pour TLS).
-   **Email expéditeur** : L'adresse email qui enverra les messages.
-   **Mot de passe** : Le mot de passe du compte email.
-   **Nom expéditeur** : Le nom qui s'affichera comme expéditeur (ex: "Centrale Lyon Conseil").

### Cas particulier : Gmail
Si vous utilisez une adresse Gmail, vous ne pouvez pas utiliser votre mot de passe habituel. Vous devez générer un **Mot de passe d'application** :
1.  Activez la validation en deux étapes sur votre compte Google.
2.  Allez sur [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3.  Créez un nouveau mot de passe d'application (nommez-le "PV Matériel" par exemple).
4.  Copiez le code à 16 caractères généré.
5.  Collez ce code dans le champ **Mot de passe** de la configuration.

### Tester la configuration
Une fois les informations saisies, cliquez sur **"Tester la connexion"**. Si le test est réussi, cliquez sur **"Sauvegarder"**.
