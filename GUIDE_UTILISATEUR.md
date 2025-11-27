# Guide Utilisateur - PV de Contrôle Matériel

Ce guide explique comment utiliser l'application web de gestion des Procès-Verbaux de matériel loué.

## 1. Accès à l'application

L'application peut être accessible via un navigateur web (Chrome, Safari, Firefox) sur smartphone, tablette ou ordinateur.

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

### Interface moderne de gestion

En haut de page, la section **"Gestion des Procès-Verbaux"** vous permet de gérer tous vos PV existants avec une interface moderne et intuitive.

#### Affichage en cartes

Chaque PV est affiché sous forme de **carte visuelle** comprenant :
- **Titre** : Nom du chantier
- **Sous-titre** : Client, machine et date
- **Badge de statut** : 
  - 🆕 **Nouveau** : PV jamais envoyé ni téléchargé
  - 📝 **Brouillon** : PV sauvegardé mais non finalisé
  - ✅ **Envoyé** : PV envoyé par email
  - 📥 **Téléchargé** : PV téléchargé en PDF

#### Recherche et filtrage

**Barre de recherche** : 
- Tapez n'importe quel mot pour filtrer instantanément
- Recherche dans tous les champs : chantier, client, machine, modèle, n° série
- Les résultats s'affichent en temps réel pendant que vous tapez

**Filtre par statut** :
- Menu déroulant pour afficher uniquement certains types de PV
- Options : Tous, Brouillon, Envoyé, Téléchargé
- Combine avec la recherche pour un filtrage précis

#### Navigation optimisée

**Quand vous avez beaucoup de PV** :
- La liste devient **défilante** (scrollable) après quelques PV
- Un **indicateur visuel** (dégradé) apparaît en bas pour signaler qu'il y a plus de contenu
- Le **mode compact** s'active automatiquement avec 10+ PV pour optimiser l'espace
- L'interface reste fluide même avec 100+ PV

#### Actions disponibles

**Pour charger un PV** :
1. Cliquez sur la carte du PV souhaité (elle se surligne en bleu)
2. Cliquez sur le bouton **"📂 Charger"**
3. Le formulaire se remplit automatiquement avec toutes les données
4. Les photos et signatures sont restaurées
5. Le formulaire précédent est automatiquement nettoyé

**Pour supprimer un PV** :
1. Sélectionnez le PV en cliquant sur sa carte
2. Cliquez sur le bouton **"🗑️ Supprimer"**
3. Confirmez la suppression
4. Le PV est définitivement supprimé du serveur

**Pour créer un nouveau PV** :
1. Cliquez sur **"➕ Créer nouveau PV"**
2. Le formulaire est complètement réinitialisé :
   - Tous les champs sont vidés
   - Les barres de carburant reviennent à 0%
   - Les photos sont effacées
   - Les signatures sont nettoyées
3. Vous pouvez commencer un nouveau PV sur une base vierge

### Afficher/Masquer la liste

Le bouton **"👁️ Afficher/Masquer"** permet de :
- Replier la section de gestion pour gagner de la place
- Rouvrir la section quand vous avez besoin de charger un PV
- L'état (ouvert/fermé) est mémorisé automatiquement

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

---

## 7. Astuces et bonnes pratiques

### Utilisation quotidienne

**Avant de partir sur chantier** :
- Vérifiez que la configuration email est correcte
- Testez l'application sur votre appareil (tablette/smartphone)
- Assurez-vous d'avoir une connexion internet (3G/4G/WiFi)

**Sur le chantier** :
- Prenez des photos de bonne qualité (bien cadrées, bien éclairées)
- Utilisez la fonction "Sauvegarder pour plus tard" si vous devez interrompre
- La sauvegarde automatique protège vos données même si vous fermez l'app par erreur

**Gestion efficace des PV** :
- Utilisez la recherche pour retrouver rapidement un PV ancien
- Filtrez par statut pour voir uniquement les brouillons à compléter
- Complétez les PV de réception avec le retour pour avoir l'historique complet

### Recherche avancée

**Exemples de recherches utiles** :
- Tapez un nom de client pour voir tous ses PV
- Tapez un numéro de série pour retrouver l'historique d'une machine
- Tapez une date partielle (ex: "2025-11") pour voir les PV du mois
- Combinez avec le filtre statut pour des recherches précises

### Optimisation mobile

**Sur tablette ou smartphone** :
- L'interface s'adapte automatiquement à la taille d'écran
- Les cartes de PV s'affichent en une seule colonne sur mobile
- Utilisez le mode paysage pour plus de confort sur le formulaire
- Les signatures fonctionnent au doigt ou au stylet

### Dépannage rapide

**Les photos ne s'affichent pas** :
- Vérifiez que le navigateur autorise l'accès à la caméra/galerie
- Essayez de réduire la taille de vos photos (< 5 MB recommandé)
- Rechargez la page si nécessaire

**La recherche ne fonctionne pas** :
- Vérifiez que vous avez bien des PV sauvegardés
- Effacez le champ de recherche pour réafficher tous les PV
- Vérifiez le filtre de statut (doit être sur "Tous" pour tout voir)

**Le formulaire garde les anciennes données** :
- Utilisez le bouton "Créer nouveau PV" pour tout réinitialiser
- La sauvegarde automatique se réactive après quelques secondes

**L'email n'est pas envoyé** :
- Vérifiez votre connexion internet
- Vérifiez la configuration SMTP (bouton ⚙️)
- Pour Gmail, vérifiez que vous utilisez bien un mot de passe d'application
- Consultez l'administrateur si le problème persiste
