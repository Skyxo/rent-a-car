# Changelog - Rebranding France Montage Briand

## Version 2.0 - 19/11/2025

### Changements majeurs

#### 1. **Rebranding complet vers France Montage Briand**
- ✅ Remplacement de tous les éléments visuels "Centrale Lyon Conseil" par "France Montage Briand"
- ✅ Nouveau logo texte avec slogan "Montage - Location - Maintenance"
- ✅ Nouvelles couleurs d'entreprise :
  - Bleu principal : `#003d7a`
  - Orange accent : `#ff6b35`
- ✅ Mise à jour de tous les textes et messages

#### 2. **Simplification de l'envoi d'email**
- ✅ **Email unique** : Un seul champ pour l'email du conducteur de travaux
- ✅ Le PV est envoyé uniquement au conducteur de travaux (plus de destinataire secondaire)
- ✅ Champ obligatoire avec validation

#### 3. **Amélioration de l'ergonomie mobile**
- ✅ Correction du débordement des signatures VISA sur mobile
- ✅ Réduction du padding des conteneurs de signature (10px → 5px)
- ✅ Meilleure adaptation aux petits écrans

#### 4. **Désactivation de la confirmation de sortie**
- ✅ Plus de popup "Voulez-vous vraiment quitter ?" lors de la navigation
- ✅ L'utilisateur peut librement recharger/quitter la page sans interruption
- ✅ Améliore l'expérience utilisateur sur mobile

#### 5. **Affichage des valeurs non renseignées dans le PDF**
- ✅ Les cases non cochées affichent maintenant un tiret `-` au lieu de "Non"
- ✅ Applicable aux fuites (moteur, hydraulique, gasoil)
- ✅ Plus clair pour distinguer "Non renseigné" de "Non coché"

### Fichiers modifiés

#### Frontend
- `templates/index.html` : Nouveau header, suppression email_destinataire
- `static/style.css` : Nouvelles couleurs, styles FMB, correction signature mobile
- `static/script.js` : Désactivation beforeunload

#### Backend
- `server.py` : Validation email_conducteur unique, messages FMB, SMTP from_name
- `templates/pdf_template.html` : Nouveau template aux couleurs FMB, tirets pour valeurs vides

#### Configuration
- `deploy/pv-materiel.service` : Description mise à jour

### Déploiement
✅ Déployé sur http://188.137.240.250
✅ Service actif et fonctionnel
✅ Base de données compatible (pas de migration nécessaire)

### Notes techniques

**Couleurs France Montage Briand** :
```css
:root {
    --clc-navy: #003d7a;  /* Bleu FMB */
    --clc-red: #ff6b35;   /* Orange FMB */
}
```

**Logo texte** :
```html
<h1 class="fmb-title">FRANCE MONTAGE BRIAND</h1>
<p class="fmb-subtitle">Montage - Location - Maintenance</p>
```

### Compatibilité
- ✅ Aucun changement de structure de données
- ✅ Les PV existants restent valides
- ✅ Compatibilité ascendante totale
