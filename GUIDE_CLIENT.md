# 📋 Guide Client - PV Matériel Loué
## Centrale Lyon Conseil

---

## 🌐 ACCÈS À L'APPLICATION

### URL de Production
**http://188.137.240.250**

L'application est accessible 24h/24, 7j/7 depuis n'importe quel navigateur web moderne.

### Compatibilité
- ✅ Google Chrome (Recommandé)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari (Mac/iOS)
- ✅ Navigateurs mobiles (Android/iOS)

---

## ⚙️ CONFIGURATION INITIALE

### Étape 1 : Configuration de l'email

1. Ouvrez l'application dans votre navigateur
2. Cliquez sur le bouton **"⚙️ Configuration Email"** en haut à droite
3. Remplissez les informations suivantes :

#### Pour Gmail (Recommandé)

**Serveur SMTP** : `smtp.gmail.com`  
**Port** : `587`  
**Email** : Votre adresse Gmail complète  
**Mot de passe** : **Mot de passe d'application** (PAS votre mot de passe habituel)  
**Nom expéditeur** : `Centrale Lyon Conseil`

#### Comment créer un mot de passe d'application Gmail ?

1. Allez sur https://myaccount.google.com/apppasswords
2. Connectez-vous avec votre compte Gmail
3. Sélectionnez "Autre" → Tapez "PV Matériel"
4. Cliquez sur "Générer"
5. **Copiez le mot de passe** (16 caractères)
6. Collez-le dans le champ "Mot de passe SMTP"

#### Pour autres fournisseurs (Office 365, OVH, etc.)

Contactez votre support technique pour obtenir :
- L'adresse du serveur SMTP
- Le port (généralement 587)
- Vos identifiants

### Étape 2 : Test de connexion

1. Cliquez sur **"Tester la connexion"**
2. Vérifiez que le message "✓ Connexion SMTP réussie !" s'affiche
3. Cliquez sur **"Enregistrer"**

✅ **Votre application est maintenant prête à l'emploi !**

---

## 📱 UTILISATION DE L'APPLICATION

### Créer un nouveau PV

1. Remplissez les **informations générales** :
   - Chantier
   - Date de réception / retour
   - N° matériel et type
   - Fournisseur
   - Responsable
   - Emails des destinataires

2. Complétez le **contrôle visuel** (Réception et Retour) :
   - Carrosserie
   - Éclairage
   - Pneumatiques
   - Etc.
   - **Ajoutez des photos** pour chaque élément si nécessaire

3. Vérifiez le **fonctionnement** :
   - Panier, flexibles, commandes, etc.
   - **Photos possibles** pour chaque point

4. Contrôlez les **fluides** :
   - Huile moteur/hydraulique
   - Fuites éventuelles
   - **Photos des fuites** si présentes

5. Ajoutez vos **observations** :
   - Observations réception
   - Observations retour
   - **Photos d'illustrations** possibles

6. **Signatures électroniques** :
   - Signez avec le doigt (tablette) ou la souris
   - Bouton "Effacer" pour recommencer

### Sauvegarder un brouillon

Si vous devez interrompre la saisie :
- Cliquez sur **"💾 Sauvegarder le brouillon"**
- Le PV sera sauvegardé et accessible dans la liste déroulante
- Vous pourrez le reprendre plus tard

### Reprendre un PV sauvegardé

1. Dans le menu **"Gestion des Procès-Verbaux"**
2. Sélectionnez le PV dans la liste déroulante
3. Cliquez sur **"Charger"**
4. Toutes les données sont restaurées (y compris photos et signatures)

### Envoyer le PV par email

1. Vérifiez que tous les champs obligatoires sont remplis
2. Cliquez sur **"📧 Envoyer le PV"**
3. Le PDF est généré et envoyé automatiquement aux destinataires
4. Vous recevez une confirmation à l'écran

---

## 📸 GESTION DES PHOTOS

### Upload de photos

- Cliquez sur **"Choisir un fichier"**
- Sélectionnez une photo depuis :
  - 📁 Votre ordinateur
  - 📱 L'appareil photo (mobile)
  - 📂 Votre galerie (mobile)

### Aperçu et suppression

- Un aperçu miniature s'affiche après l'upload
- Pour supprimer : cliquez sur le **"×"** rouge
- Pour remplacer : choisissez une nouvelle photo

### Optimisations automatiques

✅ Les photos sont automatiquement :
- Redimensionnées (800px max)
- Compressées (JPEG 85%)
- Intégrées dans le PDF

---

## 📄 LE PDF GÉNÉRÉ

### Contenu du document

Le PDF professionnel inclut :
- **En-tête** : Logo Centrale Lyon Conseil
- **Informations** : Chantier, dates, matériel, responsable
- **Tableaux** : État détaillé réception/retour
- **Photos** : Toutes les photos uploadées, organisées par section
- **Observations** : Vos commentaires avec photos
- **Signatures** : VISA réception et retour
- **Footer** : Date de génération

### Format et qualité

- Format : **A4 (PDF)**
- Qualité : **Haute définition**
- Photos : **Intégrées directement** (pas de liens externes)
- Nom du fichier : `PV_Materiel_[Chantier]_[Date].pdf`

---

## 📧 ENVOI PAR EMAIL

### Destinataires

1. **Email principal** : Destinataire obligatoire
2. **Email conducteur de travaux** : CC optionnel

Vous pouvez envoyer à plusieurs destinataires en séparant par des virgules dans le champ email.

### Contenu de l'email

**Objet** : `PV Matériel Loué - [Chantier] - [Date]`

**Corps** :
```
Bonjour,

Veuillez trouver ci-joint le Procès-Verbal de matériel loué 
pour le chantier : [Nom du chantier]

Date de réception : [Date]

Ce document a été généré automatiquement par l'application 
de gestion Centrale Lyon Conseil.

Cordialement,
Centrale Lyon Conseil
```

**Pièce jointe** : PDF complet avec photos et signatures

---

## 💡 CONSEILS D'UTILISATION

### ✅ Bonnes pratiques

- **Photos** : Prenez des photos nettes, bien éclairées
- **Signatures** : Signez de manière lisible (tablette recommandée)
- **Sauvegardes** : Sauvegardez régulièrement vos PV en cours
- **Observations** : Soyez précis et détaillé
- **Vérification** : Relisez avant d'envoyer

### 📱 Sur mobile/tablette

- **Portrait** : Interface optimisée, défilement vertical
- **Paysage** : Signatures et formulaires compacts
- **Photos** : Utilisez directement l'appareil photo
- **Signatures** : Le tactile fonctionne parfaitement

### 🔒 Sécurité

- ✅ Connexion sécurisée au serveur
- ✅ Données sauvegardées sur le serveur
- ✅ Mot de passe SMTP stocké de manière sécurisée
- ✅ Pas de données personnelles partagées

---

## 🆘 SUPPORT ET DÉPANNAGE

### Problèmes courants

#### ❌ "Configuration email non configurée"
→ Allez dans "⚙️ Configuration Email" et remplissez les paramètres SMTP

#### ❌ "Erreur d'authentification"
→ Vérifiez que vous utilisez un **mot de passe d'application**, pas votre mot de passe habituel

#### ❌ "Échec de l'envoi de l'email"
→ Testez la connexion SMTP et vérifiez les adresses email des destinataires

#### 📸 Les photos ne s'affichent pas
→ Utilisez des formats JPEG ou PNG, max 10 Mo par photo

#### ✍️ La signature ne fonctionne pas
→ Sur mobile, autorisez l'accès tactile. Sur PC, utilisez la souris.

### Contact support technique

Pour toute assistance :
- 📧 Email : [Votre email support]
- 📞 Téléphone : [Votre numéro]
- 🕐 Horaires : Lundi-Vendredi 9h-18h

---

## 📊 STATISTIQUES ET MONITORING

### Suivi de l'utilisation

Les administrateurs système peuvent consulter :
- Nombre de PV générés
- Emails envoyés
- Temps de génération PDF
- Utilisation des ressources

### Logs accessibles

Via le serveur :
```bash
ssh root@188.137.240.250
sudo journalctl -u pv-materiel -f
```

---

## 🔄 MISES À JOUR

### Fréquence

L'application est mise à jour régulièrement avec :
- 🐛 Corrections de bugs
- ✨ Nouvelles fonctionnalités
- 🔒 Améliorations de sécurité
- 🚀 Optimisations de performance

### Notifications

Les mises à jour sont transparentes et n'interrompent pas le service.

---

## 📞 INFORMATIONS DE CONTACT

**Développeur** : [Votre nom]  
**Email** : [Votre email]  
**Téléphone** : [Votre numéro]

**Centrale Lyon Conseil**  
École Centrale de Lyon  
36 Avenue Guy de Collongue  
69134 Écully Cedex  

---

## ✅ VALIDATION DU PROJET

### Checklist de validation

Avant de valider définitivement le projet, vérifiez :

- [ ] L'application est accessible sur http://188.137.240.250
- [ ] La configuration SMTP fonctionne (test réussi)
- [ ] Un PV de test a été créé et envoyé avec succès
- [ ] Les photos s'affichent correctement dans le PDF
- [ ] Les signatures sont nettes et visibles
- [ ] L'interface est responsive (testée sur mobile)
- [ ] Les brouillons se sauvegardent et se chargent correctement
- [ ] Les emails arrivent bien aux destinataires

### Feedback client

Après vos tests, merci de nous faire un retour sur :
1. ✅ Ce qui fonctionne bien
2. ⚠️ Les éventuels bugs rencontrés
3. 💡 Les améliorations souhaitées
4. 📝 Vos suggestions générales

---

**Version** : 1.0  
**Date** : 18 Novembre 2025  
**Statut** : ✅ Production Ready
