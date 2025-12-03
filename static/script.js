/**
 * Script JavaScript pour l'application PV Matériel Loué
 * France Montage Briand
 * 
 * Fonctionnalités :
 * - Gestion des signatures électroniques avec SignaturePad
 * - Validation du formulaire
 * - Persistence des données via localStorage
 * - Gestion du devicePixelRatio pour écrans haute densité
 */

// Variables globales pour les pads de signature
let signaturePadReception = null;
let signaturePadRetour = null;
let currentPVId = null;
let pvStatus = 'new'; // 'new', 'draft', 'sent'

// Variables pour l'auto-sauvegarde
let autoSaveTimer = null;
let lastAutoSave = null;
let isAutoSaving = false;
let hasUnsavedChanges = false;
const AUTO_SAVE_DELAY = 1000; // 1 seconde pour les champs texte

// Champs avec historique
const HISTORY_FIELDS = ['chantier', 'email_conducteur', 'email_entreprise', 'materiel_numero', 'materiel_type', 'fournisseur', 'responsable'];

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    initializeSignaturePads();
    initializeFormPersistence();
    initializeFormValidation();
    initializePhotoUploads();
    initializePVManagement();
    initializePVSearch();
    loadSavedPVList();
    initializeRadioDeselect();
    initializePVTypeToggle();
    initializeSelect2Fields();
    initializeStickyHeader();
    initializeEmailEntreprise();
    initScrollNavigation();
    initializeScrollButtons(); // Initialiser les boutons de navigation
    checkVGPAlerts(); // Vérifier les alertes VGP au chargement
    
    // Ajouter la classe au body pour le padding de l'indicateur
    document.body.classList.add('has-pv-indicator');
    
    // Définir la hauteur de l'indicateur en variable CSS
    updateIndicatorHeight();
    
    // Restaurer le PV actuel après rafraîchissement (Ctrl+Shift+R)
    restoreCurrentPV();
});

/**
 * Met à jour la hauteur de l'indicateur en variable CSS
 */
function updateIndicatorHeight() {
    const indicator = document.getElementById('currentPVIndicator');
    if (indicator) {
        const height = indicator.offsetHeight;
        document.documentElement.style.setProperty('--pv-indicator-height', height + 'px');
    }
}

/**
 * Restaure le PV actuel après un rafraîchissement de page
 */
async function restoreCurrentPV() {
    const savedPVId = localStorage.getItem('currentPVId');
    const savedVersion = localStorage.getItem('currentPVVersion');
    
    if (savedPVId) {
        // Attendre un peu que la liste des PV soit chargée
        setTimeout(async () => {
            await loadPVById(savedPVId, true);
            
            // Si une version spécifique était consultée, la recharger
            if (savedVersion && savedVersion !== '1') {
                setTimeout(async () => {
                    await loadPVVersion(savedPVId, parseInt(savedVersion));
                }, 300);
            }
        }, 500);
    }
}

/**
 * Permet de désélectionner les boutons radio en cliquant dessus une seconde fois
 */
function initializeRadioDeselect() {
    const radioButtons = document.querySelectorAll('input[type="radio"]:not([name="pv_type"])');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('click', function(e) {
            // Si le bouton est déjà sélectionné, le désélectionner
            if (this.dataset.checked === 'true') {
                this.checked = false;
                this.dataset.checked = 'false';
                // Déclencher l'événement change pour la sauvegarde auto
                this.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                // Marquer tous les radios du même groupe comme non cochés
                document.querySelectorAll(`input[name="${this.name}"]`).forEach(r => {
                    r.dataset.checked = 'false';
                });
                // Marquer celui-ci comme coché
                this.dataset.checked = 'true';
            }
        });
        
        // Initialiser l'état
        if (radio.checked) {
            radio.dataset.checked = 'true';
        }
    });
}

/**
 * Bascule l'affichage des colonnes Réception/Retour selon le type de PV
 */
function togglePVColumns(type) {
    // Mettre à jour les badges de titre de section
    const badges = [
        'pv_type_badge_dates',
        'pv_type_badge_exterieur',
        'pv_type_badge_fonctionnement',
        'pv_type_badge_fluides',
        'pv_type_badge_observations',
        'pv_type_badge_signatures'
    ];
    
    const label = type === 'reception' ? 'RÉCEPTION' : 'RETOUR';
    const bgColor = type === 'reception' ? 'bg-success' : 'bg-info';
    
    badges.forEach(badgeId => {
        const badge = document.getElementById(badgeId);
        if (badge) {
            badge.textContent = label;
            badge.className = `badge ${bgColor} ms-2`;
            badge.style.display = 'inline-block';
        }
    });
    
    // Gérer l'affichage des colonnes avec les classes CSS
    if (type === 'reception') {
        // Afficher colonnes Réception, masquer colonnes Retour
        document.querySelectorAll('.reception-column').forEach(el => {
            el.style.display = '';
        });
        document.querySelectorAll('.retour-column').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        // Masquer colonnes Réception, afficher colonnes Retour
        document.querySelectorAll('.reception-column').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.retour-column').forEach(el => {
            el.style.display = '';
        });
    }
    
    // Gérer les sections Date/Compteur et Signatures
    const receptionSections = document.querySelectorAll('[class*="reception"], .col-md-6:has(#date_reception)');
    const retourSections = document.querySelectorAll('[class*="retour"], .col-md-6:has(#date_retour)');
    
    // Section Dates et Compteurs
    const dateReceptionCol = document.querySelector('.col-md-6:has(#date_reception)');
    const dateRetourCol = document.querySelector('.col-md-6:has(#date_retour)');
    
    if (type === 'reception') {
        if (dateReceptionCol) dateReceptionCol.style.display = '';
        if (dateRetourCol) dateRetourCol.style.display = 'none';
    } else {
        if (dateReceptionCol) dateReceptionCol.style.display = 'none';
        if (dateRetourCol) dateRetourCol.style.display = '';
    }
    
    // Section Fluides et Observations - utiliser les classes pv-reception-col et pv-retour-col
    const receptionCols = document.querySelectorAll('.pv-reception-col');
    const retourCols = document.querySelectorAll('.pv-retour-col');
    
    if (type === 'reception') {
        receptionCols.forEach(col => col.style.display = '');
        retourCols.forEach(col => col.style.display = 'none');
    } else {
        receptionCols.forEach(col => col.style.display = 'none');
        retourCols.forEach(col => col.style.display = '');
    }
    
    // Section Signatures
    const signatureReceptionCol = document.querySelector('.col-md-6:has(#signatureReception)');
    const signatureRetourCol = document.querySelector('.col-md-6:has(#signatureRetour)');
    
    if (type === 'reception') {
        if (signatureReceptionCol) signatureReceptionCol.style.display = '';
        if (signatureRetourCol) signatureRetourCol.style.display = 'none';
        
        // Redimensionner le canvas de réception après affichage
        setTimeout(() => {
            const canvasReception = document.getElementById('signatureReception');
            if (canvasReception && signaturePadReception) {
                resizeCanvas(canvasReception, signaturePadReception);
            }
        }, 50);
    } else {
        if (signatureReceptionCol) signatureReceptionCol.style.display = 'none';
        if (signatureRetourCol) signatureRetourCol.style.display = '';
        
        // Redimensionner le canvas de retour après affichage
        setTimeout(() => {
            const canvasRetour = document.getElementById('signatureRetour');
            if (canvasRetour && signaturePadRetour) {
                resizeCanvas(canvasRetour, signaturePadRetour);
            }
        }, 50);
    }
}

/**
 * Gère l'affichage conditionnel des colonnes Réception/Retour selon le type de PV
 */
function initializePVTypeToggle() {
    const pvTypeStickyReception = document.getElementById('pv_type_sticky_reception');
    const pvTypeStickyRetour = document.getElementById('pv_type_sticky_retour');
    
    // Écouteurs d'événements pour les boutons sticky
    if (pvTypeStickyReception) {
        pvTypeStickyReception.addEventListener('change', function() {
            if (this.checked) {
                togglePVColumns('reception');
            }
        });
    }
    
    if (pvTypeStickyRetour) {
        pvTypeStickyRetour.addEventListener('change', function() {
            if (this.checked) {
                togglePVColumns('retour');
            }
        });
    }
    
    // Initialiser l'affichage au chargement (Réception par défaut)
    togglePVColumns('reception');
}

/**
 * Initialise le comportement sticky de l'en-tête Type de PV
 */
function initializeStickyHeader() {
    const header = document.getElementById('stickyPVTypeHeader');
    const placeholder = document.getElementById('stickyPlaceholder');
    const pvIndicator = document.getElementById('currentPVIndicator');
    const pvTypeCompact = document.getElementById('pvTypeCompact');
    
    if (!header || !placeholder) return;
    
    // Utiliser scroll event pour une détection précise
    function checkSticky() {
        const headerRect = header.getBoundingClientRect();
        const headerHeight = header.offsetHeight;
        const indicatorHeight = pvIndicator ? pvIndicator.offsetHeight : 0;
        
        // Le header devient sticky quand son haut atteint la hauteur de l'indicateur
        if (headerRect.top <= indicatorHeight && !header.classList.contains('is-sticky')) {
            // Activer le sticky - mais on le cache car on utilise le compact
            placeholder.style.height = headerHeight + 'px';
            placeholder.style.display = 'block';
            header.classList.add('is-sticky');
            header.style.display = 'none'; // Cacher le sticky original
            
            // Afficher le sélecteur compact dans l'indicateur
            if (pvTypeCompact) {
                pvTypeCompact.style.display = 'flex';
            }
        }
        // Désactiver le sticky uniquement quand le placeholder revient en vue
        else if (header.classList.contains('is-sticky')) {
            const placeholderRect = placeholder.getBoundingClientRect();
            // Vérifier si on a remonté jusqu'au placeholder
            if (placeholderRect.top >= indicatorHeight) {
                header.classList.remove('is-sticky');
                placeholder.style.display = 'none';
                header.style.display = ''; // Réafficher le sticky original
                
                // Masquer le sélecteur compact
                if (pvTypeCompact) {
                    pvTypeCompact.style.display = 'none';
                }
            }
        }
    }
    
    // Écouter le scroll avec throttle pour performance
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                checkSticky();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
    
    // Vérification initiale
    checkSticky();
    
    // Synchroniser les deux sélecteurs de type PV
    syncPVTypeSelectors();
}

/**
 * Synchronise les trois sélecteurs de type PV (normal, sticky, compact)
 */
function syncPVTypeSelectors() {
    const normalReception = document.getElementById('pv_type_reception');
    const normalRetour = document.getElementById('pv_type_retour');
    const stickyReception = document.getElementById('pv_type_sticky_reception');
    const stickyRetour = document.getElementById('pv_type_sticky_retour');
    const compactReception = document.getElementById('pv_type_compact_reception');
    const compactRetour = document.getElementById('pv_type_compact_retour');
    
    const allRadios = [normalReception, normalRetour, stickyReception, stickyRetour, compactReception, compactRetour];
    
    function syncAll(source) {
        const isReception = source.value === 'reception';
        const pvType = isReception ? 'reception' : 'retour';
        
        // Synchroniser tous les sélecteurs
        if (normalReception && normalRetour) {
            normalReception.checked = isReception;
            normalRetour.checked = !isReception;
        }
        if (stickyReception && stickyRetour) {
            stickyReception.checked = isReception;
            stickyRetour.checked = !isReception;
        }
        if (compactReception && compactRetour) {
            compactReception.checked = isReception;
            compactRetour.checked = !isReception;
        }
        
        // Mettre à jour l'interface (colonnes, badges, etc.)
        togglePVColumns(pvType);
        
        // Mettre à jour l'indicateur de statut
        updatePVStatusBadge();
    }
    
    // Écouter les clics sur les labels (pas les inputs)
    allRadios.forEach(radio => {
        if (radio) {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            if (label) {
                label.addEventListener('click', function(e) {
                    // Si le bouton est déjà sélectionné, empêcher le clic
                    if (radio.checked) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    // Sinon, laisser le comportement normal se produire
                    // Le change sera déclenché automatiquement
                });
            }
            
            // Écouter les changements pour synchroniser
            radio.addEventListener('change', function() {
                if (this.checked) {
                    syncAll(this);
                }
            });
        }
    });
}

/**
 * Initialise les canvas de signature avec gestion des écrans haute densité
 */
function initializeSignaturePads() {
    const canvasReception = document.getElementById('signatureReception');
    const canvasRetour = document.getElementById('signatureRetour');
    
    if (canvasReception) {
        signaturePadReception = new SignaturePad(canvasReception, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 0.5,
            maxWidth: 2.5,
            velocityFilterWeight: 0.7,
            throttle: 0,
            minDistance: 0
        });
        
        resizeCanvas(canvasReception, signaturePadReception);
        
        // Auto-sauvegarde après signature
        signaturePadReception.addEventListener('endStroke', () => {
            scheduleAutoSave();
        });
        
        // Forcer le rendu immédiat sur touch
        canvasReception.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    
    if (canvasRetour) {
        signaturePadRetour = new SignaturePad(canvasRetour, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 0.5,
            maxWidth: 2.5,
            velocityFilterWeight: 0.7,
            throttle: 0,
            minDistance: 0
        });
        
        resizeCanvas(canvasRetour, signaturePadRetour);
        
        // Auto-sauvegarde après signature
        signaturePadRetour.addEventListener('endStroke', () => {
            scheduleAutoSave();
        });
        
        // Forcer le rendu immédiat sur touch
        canvasRetour.addEventListener('touchstart', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    
    // Redimensionner les canvas lors du resize de la fenêtre (debounced)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (canvasReception && signaturePadReception) {
                resizeCanvas(canvasReception, signaturePadReception);
            }
            if (canvasRetour && signaturePadRetour) {
                resizeCanvas(canvasRetour, signaturePadRetour);
            }
        }, 100);
    });
}

/**
 * Redimensionne un canvas en tenant compte du devicePixelRatio
 * Critique pour éviter le flou sur les écrans Retina
 * 
 * @param {HTMLCanvasElement} canvas - L'élément canvas
 * @param {SignaturePad} signaturePad - L'instance SignaturePad
 */
function resizeCanvas(canvas, signaturePad) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    
    // Forcer le canvas à prendre 100% de la largeur du parent
    const parent = canvas.parentElement;
    const parentWidth = parent.clientWidth;
    
    // Sauvegarder les données actuelles si elles existent
    const data = signaturePad.isEmpty() ? null : signaturePad.toData();
    
    // Définir d'abord les dimensions CSS
    canvas.style.width = '100%';
    canvas.style.height = '150px';
    
    // Ensuite définir les dimensions du canvas en tenant compte du ratio
    canvas.width = parentWidth * ratio;
    canvas.height = 150 * ratio;
    
    // Mettre à l'échelle le contexte pour le devicePixelRatio
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    
    // Restaurer les données
    if (data) {
        signaturePad.fromData(data);
    } else {
        signaturePad.clear();
    }
    
    // Force un repaint
    signaturePad.clear();
    if (data) {
        signaturePad.fromData(data);
    }
}

/**
 * Efface la signature d'un canvas spécifique
 * 
 * @param {string} type - 'Reception' ou 'Retour'
 */
function clearSignature(type) {
    if (type === 'Reception' && signaturePadReception) {
        signaturePadReception.clear();
        document.getElementById('signature_reception_data').value = '';
        saveFormData();
        scheduleAutoSave();
    } else if (type === 'Retour' && signaturePadRetour) {
        signaturePadRetour.clear();
        document.getElementById('signature_retour_data').value = '';
        saveFormData();
        scheduleAutoSave();
    }
}

/**
 * Initialise la persistence des données du formulaire via localStorage
 */
function initializeFormPersistence() {
    const form = document.getElementById('pvForm');
    
    // Charger les données sauvegardées au démarrage
    loadFormData();
    
    // Sauvegarder à chaque modification (localStorage)
    form.addEventListener('change', saveFormData);
    form.addEventListener('input', debounce(saveFormData, 500));
    
    // Auto-sauvegarde IMMÉDIATE sur le serveur pour les changements (select, radio, checkbox)
    form.addEventListener('change', function(e) {
        // Sauvegarder immédiatement sans délai pour les changements de choix
        performAutoSave();
        // Mettre à jour l'indicateur si c'est un champ clé
        if (['client', 'chantier', 'materiel_type', 'materiel_numero', 'date_reception', 'date_retour', 'pv_type'].includes(e.target.id || e.target.name)) {
            updatePVStatusBadge();
        }
    });
    
    // Auto-sauvegarde avec délai pour les inputs texte (pour ne pas surcharger)
    form.addEventListener('input', debounce(function(e) {
        scheduleAutoSave();
        // Mettre à jour l'indicateur pour les champs clés
        if (['client', 'chantier', 'materiel_type', 'materiel_numero'].includes(e.target.id)) {
            updatePVStatusBadge();
        }
    }, 1000));
}

/**
 * Planifie une auto-sauvegarde sur le serveur
 */
function scheduleAutoSave() {
    // Annuler le timer précédent s'il existe
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // Planifier une nouvelle sauvegarde après le délai
    autoSaveTimer = setTimeout(async () => {
        await performAutoSave();
    }, AUTO_SAVE_DELAY);
}

/**
 * Effectue la sauvegarde automatique sur le serveur
 */
async function performAutoSave() {
    // Éviter les sauvegardes simultanées
    if (isAutoSaving) {
        return;
    }
    
    // Vérifier qu'il y a un chantier (minimum requis)
    const chantier = document.getElementById('chantier').value;
    if (!chantier || chantier.trim() === '') {
        return;
    }
    
    isAutoSaving = true;
    
    try {
        const result = await savePVDraft(true); // true = silent
        if (result) {
            lastAutoSave = new Date();
            
            // Afficher discrètement un indicateur visuel
            showAutoSaveIndicator();
        }
    } catch (error) {
        console.error('❌ Erreur auto-sauvegarde:', error);
    } finally {
        isAutoSaving = false;
    }
}

/**
 * Affiche un indicateur discret de sauvegarde automatique
 */
function showAutoSaveIndicator() {
    const badge = document.getElementById('pvStatusBadge');
    if (badge) {
        const originalHTML = badge.innerHTML;
        badge.innerHTML = '<i class="fas fa-check-circle me-1"></i>Sauvegardé';
        badge.classList.add('bg-success');
        badge.classList.remove('bg-warning', 'bg-info', 'bg-secondary');
        
        // Réinitialiser le flag de changements non sauvegardés
        hasUnsavedChanges = false;
        
        setTimeout(() => {
            updatePVStatusBadge();
        }, 2000);
    }
}

/**
 * Démarre la sauvegarde périodique automatique
 */
/**
 * Sauvegarde l'état du formulaire dans localStorage
 */
function saveFormData() {
    const formData = gatherFormData();
    
    // Marquer qu'il y a des changements non sauvegardés
    hasUnsavedChanges = true;
    
    // Ajouter les signatures
    if (signaturePadReception && !signaturePadReception.isEmpty()) {
        formData.signature_reception = signaturePadReception.toDataURL('image/png');
    }
    
    if (signaturePadRetour && !signaturePadRetour.isEmpty()) {
        formData.signature_retour = signaturePadRetour.toDataURL('image/png');
    }
    
    // Ajouter un timestamp pour savoir quand c'était
    formData._autoSaveTimestamp = new Date().toISOString();
    
    try {
        localStorage.setItem('pvMaterielFormData', JSON.stringify(formData));
    } catch (e) {
        // Silencieux si erreur localStorage
    }
}

/**
 * Charge l'état du formulaire depuis localStorage
 */
function loadFormData() {
    try {
        const savedData = localStorage.getItem('pvMaterielFormData');
        if (!savedData) return;
        
        const formData = JSON.parse(savedData);
        
        // Vérifier s'il y a des données sauvegardées récemment (moins de 24h)
        if (formData._autoSaveTimestamp) {
            const saveTime = new Date(formData._autoSaveTimestamp);
            const now = new Date();
            const hoursDiff = (now - saveTime) / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                localStorage.removeItem('pvMaterielFormData');
                return;
            }
            
            // Afficher une notification pour informer l'utilisateur
            const saveDate = saveTime.toLocaleString('fr-FR');
            if (confirm(`Des données non sauvegardées ont été trouvées (${saveDate}).\nVoulez-vous les restaurer ?`)) {
                populateForm(formData);
                showNotification('success', 'Données restaurées depuis la sauvegarde automatique');
            } else {
                localStorage.removeItem('pvMaterielFormData');
            }
        }
    } catch (e) {
        // Silencieux si erreur localStorage
    }
}

/**
 * Initialise la validation du formulaire
 */
function initializeFormValidation() {
    const form = document.getElementById('pvForm');
    
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Valider les signatures
        const hasReceptionData = !signaturePadReception.isEmpty();
        const hasRetourData = !signaturePadRetour.isEmpty();
        
        if (!hasReceptionData && !hasRetourData) {
            alert('⚠️ Veuillez signer au moins une section (Réception ou Retour).');
            return false;
        }
        
        // Valider la conformité réglementaire (obligatoire)
        const conformiteReceptionChecked = document.querySelector('input[name="conformite_reception"]:checked');
        const conformiteRetourChecked = document.querySelector('input[name="conformite_retour"]:checked');
        
        if (hasReceptionData && !conformiteReceptionChecked) {
            alert('⚠️ La conformité réglementaire à la réception est obligatoire.');
            // Scroller vers le champ
            document.querySelector('input[name="conformite_reception"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        
        if (hasRetourData && !conformiteRetourChecked) {
            alert('⚠️ La conformité réglementaire au retour est obligatoire.');
            // Scroller vers le champ
            document.querySelector('input[name="conformite_retour"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        
        // Valider les compteurs d'heures
        const compteurReception = parseFloat(document.getElementById('compteur_reception').value);
        const compteurRetour = parseFloat(document.getElementById('compteur_retour').value);
        
        if (compteurReception && compteurRetour && compteurRetour < compteurReception) {
            if (!confirm('⚠️ Le compteur de retour est inférieur au compteur de réception. Voulez-vous continuer ?')) {
                return false;
            }
        }
        
        // Convertir les signatures en Base64 et injecter dans les champs cachés
        if (hasReceptionData) {
            const signatureDataReception = signaturePadReception.toDataURL('image/png');
            document.getElementById('signature_reception_data').value = signatureDataReception;
        }
        
        if (hasRetourData) {
            const signatureDataRetour = signaturePadRetour.toDataURL('image/png');
            document.getElementById('signature_retour_data').value = signatureDataRetour;
        }
        
        // Afficher un indicateur de chargement
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération en cours...';
        
        // Soumettre le formulaire
        form.submit();
        
        // Effacer les données sauvegardées après soumission réussie
        setTimeout(() => {
            localStorage.removeItem('pvMaterielFormData');
        }, 1000);
        
        // Restaurer le bouton après 5 secondes (au cas où)
        setTimeout(() => {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }, 5000);
        
        return true;
    });
}

/**
 * Fonction utilitaire de debounce pour éviter les appels trop fréquents
 * 
 * @param {Function} func - La fonction à debouncer
 * @param {number} wait - Le délai en millisecondes
 * @returns {Function} La fonction debouncée
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Confirmation avant de quitter la page - DÉSACTIVÉ
 * L'utilisateur peut librement quitter/recharger sans confirmation
 */
// window.addEventListener('beforeunload', function(event) {
//     // Fonctionnalité désactivée à la demande
// });

/**
 * Détection de la rotation de l'écran (mobile/tablette)
 * Redimensionne les canvas pour éviter les déformations
 */
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    
    mediaQuery.addEventListener('change', function(e) {
        setTimeout(() => {
            if (signaturePadReception) {
                resizeCanvas(
                    document.getElementById('signatureReception'),
                    signaturePadReception
                );
            }
            if (signaturePadRetour) {
                resizeCanvas(
                    document.getElementById('signatureRetour'),
                    signaturePadRetour
                );
            }
        }, 300); // Délai pour laisser le navigateur finir la rotation
    });
}

/**
 * Auto-scroll vers les erreurs de validation
 */
document.addEventListener('invalid', function(event) {
    event.target.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}, true);

/**
 * Initialise la gestion des uploads de photos
 * Ajoute la prévisualisation et l'encodage en base64
 */
function initializePhotoUploads() {
    const photoInputs = document.querySelectorAll('.photo-upload');
    
    photoInputs.forEach(input => {
        input.addEventListener('change', function(event) {
            handlePhotoUpload(event.target);
        });
    });
}

/**
 * Ajoute un nouveau slot pour une photo supplémentaire
 */
function addPhotoSlot(containerId, fieldName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Compter le nombre de photos existantes
    const existingPhotos = container.querySelectorAll('.photo-item').length;
    const newIndex = existingPhotos + 1;
    
    // Créer le nouvel élément
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    photoItem.innerHTML = `
        <input type="file" class="form-control form-control-sm photo-upload" 
               name="photo_${fieldName}_${newIndex}" 
               accept="image/*" 
               data-preview="preview_${fieldName}_${newIndex}"
               data-container="${containerId}"
               data-field="${fieldName}">
        <div class="photo-preview" id="preview_${fieldName}_${newIndex}"></div>
    `;
    
    container.appendChild(photoItem);
    
    // Attacher l'événement au nouvel input
    const newInput = photoItem.querySelector('.photo-upload');
    newInput.addEventListener('change', function(event) {
        handlePhotoUpload(event.target);
    });
}

/**
 * Gère l'upload d'une photo : prévisualisation et encodage base64
 * 
 * @param {HTMLInputElement} input - L'input file qui a changé
 */
function handlePhotoUpload(input) {
    const files = input.files;
    if (!files || files.length === 0) return;
    
    const containerId = input.dataset.container;
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Traiter chaque fichier sélectionné
    Array.from(files).forEach((file, index) => {
        // Vérifier que c'est bien une image
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image valide (JPG, PNG, etc.)');
            return;
        }
        
        // Vérifier la taille (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            alert('L\'image est trop volumineuse. Taille maximum : 5MB');
            return;
        }
        
        // Créer un FileReader pour lire l'image
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Créer un élément image pour l'optimisation
            const img = new Image();
            img.onload = function() {
                // Optimiser l'image (redimensionner si trop grande)
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let width = img.width;
                let height = img.height;
                const maxDimension = 800; // Dimension max pour optimiser
                
                // Redimensionner si nécessaire
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir en base64 avec compression
                const base64Data = canvas.toDataURL('image/jpeg', 0.85);
                
                // Générer un nom unique pour éviter les conflits
                const timestamp = Date.now();
                const randomSuffix = Math.floor(Math.random() * 1000);
                const uniqueName = `photo_${input.dataset.field}_${timestamp}_${randomSuffix}`;
                
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                photoItem.innerHTML = `
                    <input type="hidden" name="${uniqueName}" value="${base64Data}">
                    <div class="photo-preview">
                        <img src="${base64Data}" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; border-radius: 4px;">
                        <button type="button" class="remove-photo-btn" onclick="removePhotoItem(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                // Insérer avant l'input file
                container.insertBefore(photoItem, input);
                
                // Mettre à jour l'aperçu dans la colonne Élément
                const fieldName = input.dataset.field?.replace('_reception', '').replace('_retour', '');
                const pvType = input.dataset.field?.includes('_reception') ? 'reception' : 'retour';
                if (fieldName) {
                    updatePhotoPreview(fieldName, pvType);
                }
                
                // Auto-sauvegarde après ajout de photo
                scheduleAutoSave();
            };
            
            img.onerror = function() {
                alert('Erreur lors du chargement de l\'image');
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            alert('Erreur lors de la lecture du fichier');
        };
        
        reader.readAsDataURL(file);
    });
    
    // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers à nouveau
    input.value = '';
}

/**
 * Supprime un élément photo
 */
function removePhotoItem(button) {
    const photoItem = button.closest('.photo-item');
    if (photoItem) {
        // Extraire le fieldName avant de supprimer
        const container = photoItem.closest('.multi-photo-container');
        const containerId = container?.id;
        let fieldName, pvType;
        
        if (containerId) {
            const match = containerId.match(/photos_(\w+)_(reception|retour)/);
            if (match) {
                fieldName = match[1];
                pvType = match[2];
            }
        }
        
        photoItem.remove();
        
        // Mettre à jour l'aperçu dans la colonne Élément
        if (fieldName) {
            updatePhotoPreview(fieldName, pvType);
        }
        
        // Auto-sauvegarde après suppression de photo
        scheduleAutoSave();
    }
}

/**
 * Supprime une photo uploadée
 * 
 * @param {string} previewId - L'ID du conteneur de prévisualisation
 * @param {HTMLElement} button - Le bouton de suppression cliqué
 */
function removePhoto(previewId, button) {
    const previewContainer = document.getElementById(previewId);
    if (!previewContainer) return;
    
    // Trouver le photo-item parent
    const photoItem = previewContainer.closest('.photo-item');
    if (!photoItem) return;
    
    // Vérifier s'il reste plus d'une photo
    const container = photoItem.parentElement;
    const photoItems = container.querySelectorAll('.photo-item');
    
    if (photoItems.length > 1) {
        // Supprimer le photo-item entier
        photoItem.remove();
    } else {
        // C'est la dernière photo, juste la vider
        const inputFile = photoItem.querySelector('.photo-upload');
        if (inputFile) {
            inputFile.value = '';
        }
        
        // Trouver et supprimer l'input hidden
        const hiddenInput = photoItem.querySelector('input[type="hidden"]');
        if (hiddenInput) {
            hiddenInput.remove();
        }
        
        // Vider la prévisualisation
        previewContainer.innerHTML = '';
    }
}

/**
 * Initialise la gestion des PV sauvegardés
 */
function initializePVManagement() {
    // Bouton Télécharger PDF (bas de page)
    const downloadPVBtn = document.getElementById('downloadPVBtn');
    if (downloadPVBtn) {
        downloadPVBtn.addEventListener('click', downloadPVAsPDF);
    }
    
    // Bouton Télécharger PDF (haut de page)
    const downloadPVBtnTop = document.getElementById('downloadPVBtnTop');
    if (downloadPVBtnTop) {
        downloadPVBtnTop.addEventListener('click', downloadPVAsPDF);
    }
    
    // Bouton Envoyer Email (haut de page)
    const sendEmailBtnTop = document.getElementById('sendEmailBtnTop');
    if (sendEmailBtnTop) {
        sendEmailBtnTop.addEventListener('click', function() {
            // Soumettre le formulaire
            document.getElementById('pvForm').submit();
        });
    }
    
    // Bouton Nouveau PV
    const newPVBtn = document.getElementById('newPVBtn');
    if (newPVBtn) {
        newPVBtn.addEventListener('click', createNewPV);
    }
    
    // Intercepter la soumission du formulaire
    const pvForm = document.getElementById('pvForm');
    if (pvForm) {
        pvForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Vérifier les champs obligatoires
            const chantier = document.getElementById('chantier').value;
            const emailDest = document.getElementById('email_destinataire').value;
            
            if (!chantier || !emailDest) {
                alert('Le chantier et l\'email destinataire sont obligatoires pour envoyer le PV.');
                return false;
            }
            
            // Sauvegarder le PV d'abord
            const saveResult = await savePVDraft(true); // true = silencieux
            if (!saveResult) {
                alert('Impossible de sauvegarder le PV avant envoi');
                return false;
            }
            
            // Créer un nouveau FormData avec les signatures
            const formData = new FormData(pvForm);
            
            // Ajouter les signatures au FormData
            if (signaturePadReception && !signaturePadReception.isEmpty()) {
                const signatureBlob = await fetch(signaturePadReception.toDataURL('image/png')).then(r => r.blob());
                formData.set('signature_reception', signatureBlob, 'signature_reception.png');
            }
            
            if (signaturePadRetour && !signaturePadRetour.isEmpty()) {
                const signatureBlob = await fetch(signaturePadRetour.toDataURL('image/png')).then(r => r.blob());
                formData.set('signature_retour', signatureBlob, 'signature_retour.png');
            }
            
            // Soumettre avec fetch au lieu de submit() pour garder le contrôle
            try {
                const response = await fetch(pvForm.action, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.redirected) {
                    // Redirection réussie - recharger la page pour voir le message flash
                    window.location.href = response.url;
                } else if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        showNotification('success', data.message || 'PV envoyé par email avec succès');
                    } else {
                        // Réponse HTML - recharger pour voir le message flash
                        window.location.reload();
                    }
                    // Recharger la liste des PV
                    await loadSavedPVList();
                } else {
                    try {
                        const data = await response.json();
                        showNotification('danger', data.message || 'Erreur lors de l\'envoi du PV');
                    } catch {
                        showNotification('danger', 'Erreur lors de l\'envoi du PV');
                    }
                }
            } catch (error) {
                console.error('Erreur:', error);
                showNotification('danger', 'Erreur lors de l\'envoi du PV');
            }
        });
    }
}

// Stocker tous les PV pour le filtrage dynamique
let allPVData = [];

/**
 * Charge la liste des PV sauvegardés et les affiche sous forme de cartes
 */
async function loadSavedPVList() {
    try {
        const response = await fetch('/list-pv');
        const data = await response.json();
        
        if (data.success) {
            // Stocker les données pour le filtrage dynamique
            allPVData = data.pv_list;
            
            const select = document.getElementById('savedPVSelect');
            const container = document.getElementById('pvListContainer');
            const countBadge = document.getElementById('pvCountBadge');
            const searchSection = document.getElementById('pvSearchSection');
            
            // Sauvegarder l'état du collapse avant de recharger
            const wasCollapsed = searchSection && searchSection.classList.contains('collapsed');
            
            if (!select || !container) return;
            
            // Réinitialiser le select (pour compatibilité)
            select.innerHTML = '<option value="">-- Sélectionnez un PV --</option>';
            
            // Mettre à jour le compteur
            if (countBadge) {
                countBadge.textContent = data.pv_list.length;
            }
            
            // Si aucun PV, afficher le message vide
            if (data.pv_list.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="fas fa-folder-open fa-3x mb-3 opacity-50"></i>
                        <p>Aucun PV sauvegardé</p>
                        <small>Créez votre premier PV en remplissant le formulaire ci-dessous</small>
                    </div>
                `;
                return;
            }
            
            // Créer les cartes PV
            container.innerHTML = '';
            data.pv_list.forEach(pv => {
                const date = new Date(pv.updated_at);
                const dateStr = date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const timeStr = date.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                // Déterminer si le PV a été envoyé et quand
                let lastSentBadge = '';
                if (pv.last_sent_date) {
                    const sentDate = new Date(pv.last_sent_date);
                    const sentDateStr = sentDate.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    const sentTimeStr = sentDate.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    lastSentBadge = `<span class="pv-card-status sent">
                        <i class="fas fa-paper-plane"></i> Envoyé le ${sentDateStr} à ${sentTimeStr}
                    </span>`;
                } else {
                    lastSentBadge = `<span class="pv-card-status draft">
                        <i class="fas fa-clock"></i> Pas encore envoyé
                    </span>`;
                }
                
                // Déterminer l'état de complétion
                const completionStatus = pv.completion_status || 'empty';
                let completionBadge = '';
                
                if (completionStatus === 'complete') {
                    completionBadge = '<span class="completion-badge complete"><i class="fas fa-check-double"></i> Complet</span>';
                } else if (completionStatus === 'reception_only') {
                    completionBadge = '<span class="completion-badge reception"><i class="fas fa-sign-in-alt"></i> Réception</span>';
                } else if (completionStatus === 'retour_only') {
                    completionBadge = '<span class="completion-badge retour"><i class="fas fa-sign-out-alt"></i> Retour</span>';
                } else {
                    completionBadge = '<span class="completion-badge empty"><i class="fas fa-times-circle"></i> Non signé</span>';
                }
                
                // Badge du nombre de versions
                const versionCount = pv.version_courante || 1;
                const versionBadge = `<span class="version-badge" title="${versionCount} version${versionCount > 1 ? 's' : ''}">
                    <i class="fas fa-code-branch"></i> v${versionCount}
                </span>`;
                
                // Créer la carte
                const card = document.createElement('div');
                card.className = 'pv-card';
                card.dataset.pvId = pv.id;
                
                // Ajouter les données pour la recherche
                card.dataset.chantier = (pv.chantier || '').toLowerCase();
                const emailConducteurStr = Array.isArray(pv.email_conducteur) ? pv.email_conducteur.join(' ') : (pv.email_conducteur || '');
                card.dataset.emailConducteur = emailConducteurStr.toLowerCase();
                card.dataset.responsable = (pv.responsable || '').toLowerCase();
                card.dataset.fournisseur = (pv.fournisseur || '').toLowerCase();
                card.dataset.materielNumero = (pv.materiel_numero || '').toLowerCase();
                card.dataset.materielType = (pv.materiel_type || '').toLowerCase();
                card.dataset.completionStatus = completionStatus;
                card.dataset.dateReception = pv.date_reception || '';
                card.dataset.dateRetour = pv.date_retour || '';
                card.dataset.lastSentDate = pv.last_sent_date || '';
                
                // Créer un texte de recherche complet avec tous les formats de dates possibles
                let searchText = [
                    pv.chantier || '',
                    Array.isArray(pv.email_conducteur) ? pv.email_conducteur.join(' ') : (pv.email_conducteur || ''),
                    pv.responsable || '',
                    pv.fournisseur || '',
                    pv.materiel_numero || '',
                    pv.materiel_type || ''
                ].join(' ').toLowerCase();
                
                // Ajouter les dates dans différents formats pour la recherche
                if (pv.date_reception) {
                    // Format original (YYYY-MM-DD)
                    searchText += ' ' + pv.date_reception;
                    // Format avec / (YYYY/MM/DD)
                    searchText += ' ' + pv.date_reception.replace(/-/g, '/');
                    // Format DD-MM-YYYY
                    const drParts = pv.date_reception.split('-');
                    if (drParts.length === 3) {
                        searchText += ' ' + drParts[2] + '-' + drParts[1] + '-' + drParts[0];
                        searchText += ' ' + drParts[2] + '/' + drParts[1] + '/' + drParts[0];
                    }
                }
                
                if (pv.date_retour) {
                    // Format original (YYYY-MM-DD)
                    searchText += ' ' + pv.date_retour;
                    // Format avec / (YYYY/MM/DD)
                    searchText += ' ' + pv.date_retour.replace(/-/g, '/');
                    // Format DD-MM-YYYY
                    const drParts = pv.date_retour.split('-');
                    if (drParts.length === 3) {
                        searchText += ' ' + drParts[2] + '-' + drParts[1] + '-' + drParts[0];
                        searchText += ' ' + drParts[2] + '/' + drParts[1] + '/' + drParts[0];
                    }
                }
                
                card.dataset.searchText = searchText;
                
                // Marquer comme sélectionné si c'est le PV actuel
                if (currentPVId === pv.id) {
                    card.classList.add('selected');
                }
                
                // Construire les informations détaillées
                let detailsHTML = '';
                
                // Email conducteur (toujours affiché si présent)
                if (pv.email_conducteur) {
                    const emails = Array.isArray(pv.email_conducteur) ? pv.email_conducteur : [pv.email_conducteur];
                    const emailText = emails.filter(e => e).join(', ');
                    if (emailText) {
                        detailsHTML += `
                            <div class="pv-card-detail">
                                <i class="fas fa-envelope"></i>
                                <span>${emailText}</span>
                            </div>
                        `;
                    }
                }
                
                // Responsable chantier
                if (pv.responsable) {
                    detailsHTML += `
                        <div class="pv-card-detail">
                            <i class="fas fa-user-tie"></i>
                            <span>Resp.: ${pv.responsable}</span>
                        </div>
                    `;
                }
                
                // Matériel
                if (pv.materiel_numero || pv.materiel_type) {
                    const materielInfo = [pv.materiel_type, pv.materiel_numero].filter(Boolean).join(' - ');
                    detailsHTML += `
                        <div class="pv-card-detail">
                            <i class="fas fa-tools"></i>
                            <span>Mat.: ${materielInfo}</span>
                        </div>
                    `;
                }
                
                // Fournisseur
                if (pv.fournisseur) {
                    detailsHTML += `
                        <div class="pv-card-detail">
                            <i class="fas fa-truck"></i>
                            <span>Fourn.: ${pv.fournisseur}</span>
                        </div>
                    `;
                }
                
                // Date de réception
                if (pv.date_reception) {
                    detailsHTML += `
                        <div class="pv-card-detail">
                            <i class="fas fa-calendar-check"></i>
                            <span>Réception: ${pv.date_reception}</span>
                        </div>
                    `;
                }
                
                // Date de retour
                if (pv.date_retour) {
                    detailsHTML += `
                        <div class="pv-card-detail">
                            <i class="fas fa-calendar-minus"></i>
                            <span>Retour: ${pv.date_retour}</span>
                        </div>
                    `;
                }
                
                card.innerHTML = `
                    <div class="pv-card-header">
                        <h6 class="pv-card-title">
                            <i class="fas fa-file-alt me-2 text-primary"></i>
                            ${pv.chantier || 'Sans nom'}
                        </h6>
                        <div class="pv-card-badges">
                            ${versionBadge}
                            ${completionBadge}
                            ${lastSentBadge}
                        </div>
                    </div>
                    <div class="pv-card-meta">
                        <span>
                            <i class="far fa-calendar"></i>
                            ${dateStr}
                        </span>
                        <span>
                            <i class="far fa-clock"></i>
                            ${timeStr}
                        </span>
                    </div>
                    ${detailsHTML ? `<div class="pv-card-details">${detailsHTML}</div>` : ''}
                    <div class="pv-card-actions">
                        <button type="button" class="btn btn-sm pv-btn-download download-pv-btn" data-pv-id="${pv.id}">
                            <i class="fas fa-download"></i> Télécharger
                        </button>
                        <button type="button" class="btn btn-sm pv-btn-send send-pv-btn" data-pv-id="${pv.id}">
                            <i class="fas fa-paper-plane"></i> Envoyer
                        </button>
                        <button type="button" class="btn btn-sm pv-btn-delete delete-pv-btn" data-pv-id="${pv.id}">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                `;
                
                container.appendChild(card);
                
                // Ajouter au select (pour compatibilité)
                const option = document.createElement('option');
                option.value = pv.id;
                option.textContent = `${pv.chantier} - ${dateStr} ${timeStr}`;
                select.appendChild(option);
            });
            
            // Attacher les événements
            attachPVCardEvents();
            
            // Peupler les dropdowns de filtre
            populateFilterDropdowns(data.pv_list);
            
            // Mettre à jour les propositions Select2 des champs du formulaire
            updateSelect2FieldsFromDB();
            
            // Appliquer les filtres après que le DOM soit mis à jour
            requestAnimationFrame(() => {
                filterPVCards();
            });
            
            // Vérifier si la liste est scrollable
            checkScrollableList();
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la liste des PV:', error);
    }
}

/**
 * Vérifie si la liste est scrollable et ajoute la classe appropriée
 */
function checkScrollableList() {
    const container = document.getElementById('pvListContainer');
    if (!container) return;
    
    // Compter les cartes visibles
    const visibleCards = container.querySelectorAll('.pv-card:not(.hidden)');
    const cardCount = visibleCards.length;
    
    // Vérifier si le contenu dépasse la hauteur max
    if (container.scrollHeight > container.clientHeight) {
        container.classList.add('has-scroll');
    } else {
        container.classList.remove('has-scroll');
    }
    
    // Activer le mode compact si plus de 10 PV
    if (cardCount > 10) {
        container.classList.add('compact');
    } else {
        container.classList.remove('compact');
    }
    
    // Vérifier si vide
    if (cardCount === 0 && !container.querySelector('.text-center')) {
        container.classList.add('empty');
    } else {
        container.classList.remove('empty');
    }
}

/**
 * Attache les événements aux cartes PV
 */
function attachPVCardEvents() {
    // Événement de clic sur les boutons "Supprimer"
    document.querySelectorAll('.delete-pv-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const pvId = this.dataset.pvId;
            deletePVById(pvId);
        });
    });
    
    // Événement de clic sur les boutons "Télécharger"
    document.querySelectorAll('.download-pv-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const pvId = this.dataset.pvId;
            await downloadPVById(pvId);
        });
    });
    
    // Événement de clic sur les boutons "Envoyer"
    document.querySelectorAll('.send-pv-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const pvId = this.dataset.pvId;
            await sendPVById(pvId);
        });
    });
    
    // Événement de clic sur les cartes (charge le PV directement)
    document.querySelectorAll('.pv-card').forEach(card => {
        card.addEventListener('click', async function(e) {
            // Ne pas traiter si on a cliqué sur un bouton
            if (e.target.closest('.pv-card-actions')) return;
            
            // Charger le PV directement
            const pvId = this.dataset.pvId;
            if (pvId) {
                await loadPVById(pvId);
            }
        });
        
        // Ajouter un style cursor pointer pour indiquer que c'est cliquable
        card.style.cursor = 'pointer';
    });
}

/**
 * Initialise la recherche et le filtrage des PV
 */
// Tableau pour stocker les filtres de recherche cumulés
let activeSearchFilters = [];

// Mappings pour convertir les labels affichés en valeurs internes
const filterMappings = {
    lastSent: {
        "Aujourd'hui": "today",
        "Cette semaine": "week",
        "Ce mois": "month",
        "Jamais envoyé": "never"
    },
    completion: {
        "Complet (Réception + Retour)": "complete",
        "Réception seulement": "reception_only",
        "Retour seulement": "retour_only",
        "Non signé": "empty"
    },
    dateReception: {
        "Aujourd'hui": "today",
        "Hier": "yesterday",
        "Cette semaine": "week",
        "Semaine dernière": "lastWeek",
        "Ce mois": "month",
        "Mois dernier": "lastMonth",
        "Date précise...": "custom"
    },
    dateRetour: {
        "Aujourd'hui": "today",
        "Hier": "yesterday",
        "Cette semaine": "week",
        "Semaine dernière": "lastWeek",
        "Ce mois": "month",
        "Mois dernier": "lastMonth",
        "Date précise...": "custom"
    }
};

// Fonction pour obtenir la valeur interne à partir du label
function getFilterValue(filterType, displayValue) {
    if (!displayValue || displayValue.trim() === '') return '';
    
    // Enlever le compteur entre parenthèses si présent
    const cleanValue = displayValue.replace(/\s*\(\d+\)\s*$/, '').trim();
    
    const mapping = filterMappings[filterType];
    return mapping && mapping[cleanValue] ? mapping[cleanValue] : cleanValue;
}

// Fonction pour obtenir le label à partir de la valeur interne
function getFilterLabel(filterType, internalValue) {
    if (!internalValue) return '';
    const mapping = filterMappings[filterType];
    if (!mapping) return internalValue;
    for (const [label, value] of Object.entries(mapping)) {
        if (value === internalValue) return label;
    }
    return internalValue;
}

function initializePVSearch() {
    const searchInput = document.getElementById('pvSearchInput');
    const filterLastSent = document.getElementById('pvFilterLastSent');
    const filterCompletion = document.getElementById('pvFilterCompletion');
    const filterChantier = document.getElementById('pvFilterChantier');
    const filterMaterielType = document.getElementById('pvFilterMaterielType');
    const filterResponsable = document.getElementById('pvFilterResponsable');
    const filterFournisseur = document.getElementById('pvFilterFournisseur');
    const filterEmailConducteur = document.getElementById('pvFilterEmailConducteur');
    const filterDateReception = document.getElementById('pvFilterDateReception');
    const filterDateReceptionCustom = document.getElementById('pvFilterDateReceptionCustom');
    const filterDateRetour = document.getElementById('pvFilterDateRetour');
    const filterDateRetourCustom = document.getElementById('pvFilterDateRetourCustom');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    const filtersSection = document.getElementById('pvFiltersSection');
    const toggleBtn = document.getElementById('togglePVListBtn');
    const searchSection = document.getElementById('pvSearchSection');
    const listContainer = document.getElementById('pvListContainer');
    
    // Initialiser Select2 sur tous les filtres
    $('.select2-filter').select2({
        theme: 'bootstrap-5',
        placeholder: 'Sélectionnez...',
        allowClear: true,
        width: '100%'
    });
    
    if (searchInput) {
        // Filtrer en temps réel pendant la saisie
        searchInput.addEventListener('input', filterPVCards);
        
        // Ajouter un filtre cumulatif avec la touche Entrée
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = this.value.trim();
                if (searchTerm && !activeSearchFilters.includes(searchTerm.toLowerCase())) {
                    activeSearchFilters.push(searchTerm.toLowerCase());
                    this.value = '';
                    updateActiveFiltersBadges();
                    filterPVCards();
                }
            }
        });
    }
    
    if (filterLastSent) {
        $(filterLastSent).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterCompletion) {
        $(filterCompletion).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterChantier) {
        $(filterChantier).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterMaterielType) {
        $(filterMaterielType).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterResponsable) {
        $(filterResponsable).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterFournisseur) {
        $(filterFournisseur).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterEmailConducteur) {
        $(filterEmailConducteur).on('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterDateReception) {
        filterDateReception.addEventListener('change', function() {
            const val = this.value;
            // Afficher/masquer le champ de date personnalisée
            if (filterDateReceptionCustom) {
                if (val === 'custom') {
                    filterDateReceptionCustom.classList.remove('d-none');
                } else {
                    filterDateReceptionCustom.classList.add('d-none');
                    filterDateReceptionCustom.value = '';
                }
            }
            if (val !== 'custom') {
                filterPVCards();
                populateFilterDropdowns();
            }
        });
    }
    
    if (filterDateReceptionCustom) {
        filterDateReceptionCustom.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterDateRetour) {
        filterDateRetour.addEventListener('change', function() {
            const val = this.value;
            // Afficher/masquer le champ de date personnalisée
            if (filterDateRetourCustom) {
                if (val === 'custom') {
                    filterDateRetourCustom.classList.remove('d-none');
                } else {
                    filterDateRetourCustom.classList.add('d-none');
                    filterDateRetourCustom.value = '';
                }
            }
            if (val !== 'custom') {
                filterPVCards();
                populateFilterDropdowns();
            }
        });
    }
    
    if (filterDateRetourCustom) {
        filterDateRetourCustom.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Réinitialiser tous les filtres
            activeSearchFilters = [];
            updateActiveFiltersBadges();
            if (searchInput) searchInput.value = '';
            if (filterLastSent) $(filterLastSent).val('').trigger('change');
            if (filterCompletion) $(filterCompletion).val('').trigger('change');
            if (filterChantier) $(filterChantier).val('').trigger('change');
            if (filterMaterielType) $(filterMaterielType).val('').trigger('change');
            if (filterResponsable) $(filterResponsable).val('').trigger('change');
            if (filterFournisseur) $(filterFournisseur).val('').trigger('change');
            if (filterEmailConducteur) $(filterEmailConducteur).val('').trigger('change');
            if (filterDateReception) $(filterDateReception).val('').trigger('change');
            if (filterDateReceptionCustom) {
                filterDateReceptionCustom.value = '';
                filterDateReceptionCustom.classList.add('d-none');
            }
            if (filterDateRetour) $(filterDateRetour).val('').trigger('change');
            if (filterDateRetourCustom) {
                filterDateRetourCustom.value = '';
                filterDateRetourCustom.classList.add('d-none');
            }
            
            // Relancer le filtrage
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (toggleFiltersBtn && filtersSection) {
        toggleFiltersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isHidden = filtersSection.style.display === 'none';
            
            if (isHidden) {
                // Afficher les filtres
                filtersSection.style.display = 'block';
                this.innerHTML = '<i class="fas fa-times me-2"></i>Masquer';
            } else {
                // Masquer les filtres
                filtersSection.style.display = 'none';
                this.innerHTML = '<i class="fas fa-filter me-2"></i>Filtrer';
            }
        });
    }
    
    if (toggleBtn && searchSection && listContainer) {
        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isCollapsed = listContainer.style.display === 'none';
            
            if (isCollapsed) {
                // Afficher
                searchSection.style.display = 'block';
                listContainer.style.display = 'block';
                this.innerHTML = '<i class="fas fa-chevron-up"></i>';
            } else {
                // Masquer
                searchSection.style.display = 'none';
                listContainer.style.display = 'none';
                this.innerHTML = '<i class="fas fa-chevron-down"></i>';
            }
        });
    }
}

/**
 * Filtre les cartes PV selon la recherche et le statut
 */
function filterPVCards() {
    const searchInput = document.getElementById('pvSearchInput');
    const filterLastSent = document.getElementById('pvFilterLastSent');
    const filterCompletion = document.getElementById('pvFilterCompletion');
    const filterChantier = document.getElementById('pvFilterChantier');
    const filterMaterielType = document.getElementById('pvFilterMaterielType');
    const filterResponsable = document.getElementById('pvFilterResponsable');
    const filterFournisseur = document.getElementById('pvFilterFournisseur');
    const filterEmailConducteur = document.getElementById('pvFilterEmailConducteur');
    const filterDateReception = document.getElementById('pvFilterDateReception');
    const filterDateReceptionCustom = document.getElementById('pvFilterDateReceptionCustom');
    const filterDateRetour = document.getElementById('pvFilterDateRetour');
    const filterDateRetourCustom = document.getElementById('pvFilterDateRetourCustom');
    const cards = document.querySelectorAll('.pv-card');
    
    if (!searchInput || !filterLastSent) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const lastSentFilter = filterLastSent.value;
    const completionFilter = filterCompletion ? filterCompletion.value : '';
    
    // Nettoyer les valeurs des filtres en enlevant les compteurs (X)
    const cleanFilterValue = (value) => value ? value.replace(/\s*\(\d+\)\s*$/, '').trim() : '';
    
    const chantierFilter = filterChantier ? cleanFilterValue(filterChantier.value) : '';
    const materielTypeFilter = filterMaterielType ? cleanFilterValue(filterMaterielType.value) : '';
    const responsableFilter = filterResponsable ? cleanFilterValue(filterResponsable.value) : '';
    const fournisseurFilter = filterFournisseur ? cleanFilterValue(filterFournisseur.value) : '';
    
    // Email conducteur peut être multiple (array)
    const emailConducteurFilter = filterEmailConducteur ? 
        (Array.isArray(filterEmailConducteur.value) ? filterEmailConducteur.value : [filterEmailConducteur.value]).filter(v => v) : [];
    
    const dateReceptionFilter = filterDateReception ? filterDateReception.value : '';
    const dateRetourFilter = filterDateRetour ? filterDateRetour.value : '';
    
    // Calculer les dates de référence
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Lundi
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        // Récupérer le texte de recherche complet qui contient tous les formats
        const searchableText = card.dataset.searchText || '';
        
        // Vérifier la recherche textuelle - cumul des filtres
        let matchesSearch = true;
        
        // Si on a des filtres cumulés, tous doivent correspondre
        if (activeSearchFilters.length > 0) {
            matchesSearch = activeSearchFilters.every(filter => searchableText.includes(filter));
        }
        
        // Si on a aussi du texte dans la barre de recherche, il doit correspondre en plus
        if (searchTerm && matchesSearch) {
            matchesSearch = searchableText.includes(searchTerm);
        }
        
        // Vérifier le filtre de date d'envoi
        let matchesLastSent = true;
        if (lastSentFilter) {
            const lastSentDate = card.dataset.lastSentDate;
            if (lastSentFilter === 'never') {
                matchesLastSent = !lastSentDate || lastSentDate === '';
            } else if (lastSentDate) {
                const sentDate = new Date(lastSentDate);
                if (lastSentFilter === 'today') {
                    matchesLastSent = sentDate >= today;
                } else if (lastSentFilter === 'week') {
                    matchesLastSent = sentDate >= weekStart;
                } else if (lastSentFilter === 'month') {
                    matchesLastSent = sentDate >= monthStart;
                }
            } else {
                matchesLastSent = false;
            }
        }
        
        // Vérifier le filtre de complétion
        const matchesCompletion = !completionFilter || (card.dataset.completionStatus || 'empty') === completionFilter;
        
        // Vérifier le filtre chantier
        const matchesChantier = !chantierFilter || (card.dataset.chantier || '').toLowerCase() === chantierFilter.toLowerCase();
        
        // Vérifier le filtre type matériel
        const matchesMaterielType = !materielTypeFilter || (card.dataset.materielType || '').toLowerCase() === materielTypeFilter.toLowerCase();
        
        // Vérifier le filtre responsable
        const matchesResponsable = !responsableFilter || (card.dataset.responsable || '').toLowerCase() === responsableFilter.toLowerCase();
        
        // Vérifier le filtre fournisseur
        const matchesFournisseur = !fournisseurFilter || (card.dataset.fournisseur || '').toLowerCase() === fournisseurFilter.toLowerCase();
        
        // Vérifier le filtre email conducteur (peut contenir plusieurs emails séparés par des espaces)
        const matchesEmailConducteur = emailConducteurFilter.length === 0 || (() => {
            const emailList = (card.dataset.emailConducteur || '').toLowerCase().split(' ');
            // Vérifier si au moins un des emails filtrés est présent dans la carte
            return emailConducteurFilter.some(filterEmail => 
                emailList.some(cardEmail => cardEmail.trim() === filterEmail.toLowerCase())
            );
        })();
        
        // Vérifier le filtre date réception
        let matchesDateReception = true;
        if (dateReceptionFilter) {
            const cardDateReception = card.dataset.dateReception;
            if (dateReceptionFilter === 'custom') {
                // Utiliser la date personnalisée
                const customDate = filterDateReceptionCustom?.value;
                matchesDateReception = customDate && cardDateReception === customDate;
            } else if (cardDateReception) {
                const receptionDate = new Date(cardDateReception);
                if (dateReceptionFilter === 'today') {
                    matchesDateReception = receptionDate >= today && receptionDate < new Date(today.getTime() + 86400000);
                } else if (dateReceptionFilter === 'yesterday') {
                    matchesDateReception = receptionDate >= yesterday && receptionDate < today;
                } else if (dateReceptionFilter === 'week') {
                    matchesDateReception = receptionDate >= weekStart;
                } else if (dateReceptionFilter === 'lastWeek') {
                    matchesDateReception = receptionDate >= lastWeekStart && receptionDate <= lastWeekEnd;
                } else if (dateReceptionFilter === 'month') {
                    matchesDateReception = receptionDate >= monthStart;
                } else if (dateReceptionFilter === 'lastMonth') {
                    matchesDateReception = receptionDate >= lastMonthStart && receptionDate <= lastMonthEnd;
                }
            } else {
                matchesDateReception = false;
            }
        }
        
        // Vérifier le filtre date retour
        let matchesDateRetour = true;
        if (dateRetourFilter) {
            const cardDateRetour = card.dataset.dateRetour;
            if (dateRetourFilter === 'custom') {
                // Utiliser la date personnalisée
                const customDate = filterDateRetourCustom?.value;
                matchesDateRetour = customDate && cardDateRetour === customDate;
            } else if (cardDateRetour) {
                const retourDate = new Date(cardDateRetour);
                if (dateRetourFilter === 'today') {
                    matchesDateRetour = retourDate >= today && retourDate < new Date(today.getTime() + 86400000);
                } else if (dateRetourFilter === 'yesterday') {
                    matchesDateRetour = retourDate >= yesterday && retourDate < today;
                } else if (dateRetourFilter === 'week') {
                    matchesDateRetour = retourDate >= weekStart;
                } else if (dateRetourFilter === 'lastWeek') {
                    matchesDateRetour = retourDate >= lastWeekStart && retourDate <= lastWeekEnd;
                } else if (dateRetourFilter === 'month') {
                    matchesDateRetour = retourDate >= monthStart;
                } else if (dateRetourFilter === 'lastMonth') {
                    matchesDateRetour = retourDate >= lastMonthStart && retourDate <= lastMonthEnd;
                }
            } else {
                matchesDateRetour = false;
            }
        }
        
        // Afficher ou masquer la carte
        if (matchesSearch && matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType && 
            matchesResponsable && matchesFournisseur && matchesEmailConducteur && matchesDateReception && matchesDateRetour) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });
    
    updateFilterCount(visibleCount);
    updateActiveFiltersBadges();
    checkScrollableList();
}

/**
 * Met à jour les puces de filtres actifs
 */
function updateActiveFiltersBadges() {
    const container = document.getElementById('activeFiltersContainer');
    const badgesContainer = document.getElementById('activeFiltersBadges');
    
    if (!container || !badgesContainer) return;
    
    const activeFilters = [];
    
    // Vérifier chaque filtre
    const searchInput = document.getElementById('pvSearchInput');
    const filterLastSent = document.getElementById('pvFilterLastSent');
    const filterCompletion = document.getElementById('pvFilterCompletion');
    const filterChantier = document.getElementById('pvFilterChantier');
    const filterMaterielType = document.getElementById('pvFilterMaterielType');
    const filterResponsable = document.getElementById('pvFilterResponsable');
    const filterFournisseur = document.getElementById('pvFilterFournisseur');
    const filterEmailConducteur = document.getElementById('pvFilterEmailConducteur');
    const filterDateReception = document.getElementById('pvFilterDateReception');
    const filterDateRetour = document.getElementById('pvFilterDateRetour');
    
    // Filtres de recherche cumulés
    activeSearchFilters.forEach((filter, index) => {
        activeFilters.push({
            label: 'Recherche',
            value: filter,
            icon: 'fa-search',
            filterId: 'cumulative-' + index,
            isCumulative: true
        });
    });
    
    // Recherche textuelle en cours
    if (searchInput?.value) {
        activeFilters.push({
            label: 'Recherche',
            value: searchInput.value,
            icon: 'fa-search',
            filterId: 'search'
        });
    }
    
    // Dernier envoi
    if (filterLastSent?.value) {
        const lastSentTexts = {
            'today': 'Aujourd\'hui',
            'week': 'Cette semaine',
            'month': 'Ce mois',
            'never': 'Jamais envoyé'
        };
        activeFilters.push({
            label: 'Dernier envoi',
            value: lastSentTexts[filterLastSent.value] || filterLastSent.value,
            icon: 'fa-paper-plane',
            filterId: 'lastSent'
        });
    }
    
    // Complétion
    if (filterCompletion?.value) {
        const completionTexts = {
            'complete': 'Complet',
            'reception_only': 'Réception',
            'retour_only': 'Retour',
            'empty': 'Non signé'
        };
        activeFilters.push({
            label: 'Complétion',
            value: completionTexts[filterCompletion.value] || filterCompletion.value,
            icon: 'fa-tasks',
            filterId: 'completion'
        });
    }
    
    // Chantier
    if (filterChantier?.value) {
        activeFilters.push({
            label: 'Chantier',
            value: filterChantier.value,
            icon: 'fa-hard-hat',
            filterId: 'chantier'
        });
    }
    
    // Type matériel
    if (filterMaterielType?.value) {
        activeFilters.push({
            label: 'Type matériel',
            value: filterMaterielType.value,
            icon: 'fa-tools',
            filterId: 'materielType'
        });
    }
    
    // Responsable
    if (filterResponsable?.value) {
        activeFilters.push({
            label: 'Responsable',
            value: filterResponsable.value,
            icon: 'fa-user-tie',
            filterId: 'responsable'
        });
    }
    
    // Fournisseur
    if (filterFournisseur?.value) {
        activeFilters.push({
            label: 'Fournisseur',
            value: filterFournisseur.value,
            icon: 'fa-building',
            filterId: 'fournisseur'
        });
    }
    
    // Email conducteur
    if (filterEmailConducteur?.value) {
        activeFilters.push({
            label: 'Email',
            value: filterEmailConducteur.value,
            icon: 'fa-envelope',
            filterId: 'emailConducteur'
        });
    }
    
    // Date réception
    if (filterDateReception?.value) {
        const filterDateReceptionCustom = document.getElementById('pvFilterDateReceptionCustom');
        const periodTexts = {
            'today': 'Aujourd\'hui',
            'yesterday': 'Hier',
            'week': 'Cette semaine',
            'lastWeek': 'Semaine dernière',
            'month': 'Ce mois',
            'lastMonth': 'Mois dernier',
            'custom': filterDateReceptionCustom?.value || 'Date précise'
        };
        activeFilters.push({
            label: 'Date réception',
            value: periodTexts[filterDateReception.value] || filterDateReception.value,
            icon: 'fa-calendar-check',
            filterId: 'dateReception'
        });
    }
    
    // Date retour
    if (filterDateRetour?.value) {
        const filterDateRetourCustom = document.getElementById('pvFilterDateRetourCustom');
        const periodTexts = {
            'today': 'Aujourd\'hui',
            'yesterday': 'Hier',
            'week': 'Cette semaine',
            'lastWeek': 'Semaine dernière',
            'month': 'Ce mois',
            'lastMonth': 'Mois dernier',
            'custom': filterDateRetourCustom?.value || 'Date précise'
        };
        activeFilters.push({
            label: 'Date retour',
            value: periodTexts[filterDateRetour.value] || filterDateRetour.value,
            icon: 'fa-calendar-minus',
            filterId: 'dateRetour'
        });
    }
    
    // Afficher ou masquer le conteneur
    if (activeFilters.length > 0) {
        container.style.display = 'block';
        
        // Créer les badges
        badgesContainer.innerHTML = activeFilters.map(filter => {
            const bgColor = filter.isCumulative ? 'bg-success' : 'bg-primary';
            const title = filter.isCumulative ? 'Filtre cumulatif - cliquer pour retirer' : 'Retirer ce filtre';
            return `
                <span class="badge ${bgColor} d-flex align-items-center gap-2" style="font-size: 0.875rem; padding: 0.5rem 0.75rem;">
                    <i class="fas ${filter.icon}"></i>
                    <span>${filter.value}</span>
                    <button type="button" class="btn-close btn-close-white" 
                            style="font-size: 0.6rem; padding: 0; margin-left: 0.25rem;"
                            onclick="clearFilter('${filter.filterId}')"
                            title="${title}"></button>
                </span>
            `;
        }).join('');
    } else {
        container.style.display = 'none';
    }
}

/**
 * Efface un filtre spécifique
 */
function clearFilter(filterId) {
    let element;
    
    // Gérer les filtres cumulatifs
    if (filterId.startsWith('cumulative-')) {
        const index = parseInt(filterId.replace('cumulative-', ''));
        activeSearchFilters.splice(index, 1);
        filterPVCards();
        return;
    }
    
    switch(filterId) {
        case 'search':
            element = document.getElementById('pvSearchInput');
            if (element) element.value = '';
            break;
        case 'lastSent':
            element = document.getElementById('pvFilterLastSent');
            if (element) {
                element.value = '';
            }
            break;
        case 'completion':
            element = document.getElementById('pvFilterCompletion');
            if (element) {
                element.value = '';
            }
            break;
        case 'chantier':
            element = document.getElementById('pvFilterChantier');
            if (element) {
                $(element).val('').trigger('change');
            }
            break;
        case 'materielType':
            element = document.getElementById('pvFilterMaterielType');
            if (element) {
                $(element).val('').trigger('change');
            }
            break;
        case 'responsable':
            element = document.getElementById('pvFilterResponsable');
            if (element) {
                $(element).val('').trigger('change');
            }
            break;
        case 'fournisseur':
            element = document.getElementById('pvFilterFournisseur');
            if (element) {
                $(element).val('').trigger('change');
            }
            break;
        case 'emailConducteur':
            element = document.getElementById('pvFilterEmailConducteur');
            if (element) {
                $(element).val('').trigger('change');
            }
            break;
        case 'dateReception':
            element = document.getElementById('pvFilterDateReception');
            const customReception = document.getElementById('pvFilterDateReceptionCustom');
            if (element) element.value = '';
            if (customReception) {
                customReception.value = '';
                customReception.classList.add('d-none');
            }
            break;
        case 'dateRetour':
            element = document.getElementById('pvFilterDateRetour');
            const customRetour = document.getElementById('pvFilterDateRetourCustom');
            if (element) element.value = '';
            if (customRetour) {
                customRetour.value = '';
                customRetour.classList.add('d-none');
            }
            break;
    }
    
    // Re-filtrer et repeupler les dropdowns
    filterPVCards();
    populateFilterDropdowns();
}

/**
 * Peuple les dropdowns de filtre avec les valeurs uniques
 */
function populateFilterDropdowns(pvs) {
    // Sauvegarder les valeurs actuellement sélectionnées
    const currentFilters = {
        lastSent: document.getElementById('pvFilterLastSent')?.value || '',
        completion: document.getElementById('pvFilterCompletion')?.value || '',
        chantier: document.getElementById('pvFilterChantier')?.value.trim() || '',
        materielType: document.getElementById('pvFilterMaterielType')?.value.trim() || '',
        responsable: document.getElementById('pvFilterResponsable')?.value.trim() || '',
        fournisseur: document.getElementById('pvFilterFournisseur')?.value.trim() || '',
        emailConducteur: (() => {
            const filterEl = document.getElementById('pvFilterEmailConducteur');
            if (!filterEl) return [];
            const val = filterEl.value;
            return Array.isArray(val) ? val.map(v => v.trim()).filter(v => v) : [];
        })(),
        dateReception: document.getElementById('pvFilterDateReception')?.value || '',
        dateRetour: document.getElementById('pvFilterDateRetour')?.value || ''
    };
    
    // Fonction helper pour vérifier si un PV correspond au filtre email conducteur (multiple)
    const checkEmailConducteurMatch = (pv) => {
        if (currentFilters.emailConducteur.length === 0) return true;
        
        const pvEmails = [];
        if (Array.isArray(pv.email_conducteur)) {
            pvEmails.push(...pv.email_conducteur.map(e => e.trim().toLowerCase()).filter(e => e));
        } else if (pv.email_conducteur && typeof pv.email_conducteur === 'string') {
            pvEmails.push(...pv.email_conducteur.split(',').map(e => e.trim().toLowerCase()).filter(e => e));
        }
        
        return currentFilters.emailConducteur.some(filterEmail => 
            pvEmails.includes(filterEmail.toLowerCase())
        );
    };
    
    // Calculer les dates de référence
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Filtrer les PV selon les filtres actifs
    let filteredPVs = allPVData.filter(pv => {
        // Vérifier le filtre de date d'envoi
        let matchesLastSent = true;
        if (currentFilters.lastSent) {
            const lastSentDate = pv.last_sent_date;
            if (currentFilters.lastSent === 'never') {
                matchesLastSent = !lastSentDate || lastSentDate === '';
            } else if (lastSentDate) {
                const sentDate = new Date(lastSentDate);
                if (currentFilters.lastSent === 'today') {
                    matchesLastSent = sentDate >= today;
                } else if (currentFilters.lastSent === 'week') {
                    matchesLastSent = sentDate >= weekStart;
                } else if (currentFilters.lastSent === 'month') {
                    matchesLastSent = sentDate >= monthStart;
                }
            } else {
                matchesLastSent = false;
            }
        }
        
        const matchesCompletion = !currentFilters.completion || 
            (pv.completion_status || 'empty') === currentFilters.completion;
        const matchesChantier = !currentFilters.chantier || 
            (pv.chantier || '').trim().toLowerCase() === currentFilters.chantier.toLowerCase();
        const matchesMaterielType = !currentFilters.materielType || 
            (pv.materiel_type || '').trim().toLowerCase() === currentFilters.materielType.toLowerCase();
        const matchesResponsable = !currentFilters.responsable || 
            (pv.responsable || '').trim().toLowerCase() === currentFilters.responsable.toLowerCase();
        const matchesFournisseur = !currentFilters.fournisseur || 
            (pv.fournisseur || '').trim().toLowerCase() === currentFilters.fournisseur.toLowerCase();
        
        // Gérer le filtre email conducteur multiple
        const matchesEmailConducteur = checkEmailConducteurMatch(pv);
        
        // Vérifier le filtre date réception avec périodes
        let matchesDateReception = true;
        if (currentFilters.dateReception) {
            const dateReception = pv.date_reception;
            if (currentFilters.dateReception === 'custom') {
                const customDate = document.getElementById('pvFilterDateReceptionCustom')?.value;
                matchesDateReception = customDate && dateReception === customDate;
            } else if (dateReception) {
                const recDate = new Date(dateReception);
                if (currentFilters.dateReception === 'today') {
                    matchesDateReception = recDate >= today && recDate < new Date(today.getTime() + 86400000);
                } else if (currentFilters.dateReception === 'yesterday') {
                    matchesDateReception = recDate >= yesterday && recDate < today;
                } else if (currentFilters.dateReception === 'week') {
                    matchesDateReception = recDate >= weekStart;
                } else if (currentFilters.dateReception === 'lastWeek') {
                    matchesDateReception = recDate >= lastWeekStart && recDate <= lastWeekEnd;
                } else if (currentFilters.dateReception === 'month') {
                    matchesDateReception = recDate >= monthStart;
                } else if (currentFilters.dateReception === 'lastMonth') {
                    matchesDateReception = recDate >= lastMonthStart && recDate <= lastMonthEnd;
                }
            } else {
                matchesDateReception = false;
            }
        }
        
        // Vérifier le filtre date retour avec périodes
        let matchesDateRetour = true;
        if (currentFilters.dateRetour) {
            const dateRetour = pv.date_retour;
            if (currentFilters.dateRetour === 'custom') {
                const customDate = document.getElementById('pvFilterDateRetourCustom')?.value;
                matchesDateRetour = customDate && dateRetour === customDate;
            } else if (dateRetour) {
                const retDate = new Date(dateRetour);
                if (currentFilters.dateRetour === 'today') {
                    matchesDateRetour = retDate >= today && retDate < new Date(today.getTime() + 86400000);
                } else if (currentFilters.dateRetour === 'yesterday') {
                    matchesDateRetour = retDate >= yesterday && retDate < today;
                } else if (currentFilters.dateRetour === 'week') {
                    matchesDateRetour = retDate >= weekStart;
                } else if (currentFilters.dateRetour === 'lastWeek') {
                    matchesDateRetour = retDate >= lastWeekStart && retDate <= lastWeekEnd;
                } else if (currentFilters.dateRetour === 'month') {
                    matchesDateRetour = retDate >= monthStart;
                } else if (currentFilters.dateRetour === 'lastMonth') {
                    matchesDateRetour = retDate >= lastMonthStart && retDate <= lastMonthEnd;
                }
            } else {
                matchesDateRetour = false;
            }
        }
        
        return matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType &&
            matchesResponsable && matchesFournisseur && matchesEmailConducteur &&
            matchesDateReception && matchesDateRetour;
    });
    
    // Maps pour compter les PV par valeur en tenant compte de TOUS les filtres actifs
    const chantierCount = new Map();
    const materielTypeCount = new Map();
    const responsableCount = new Map();
    const fournisseurCount = new Map();
    const emailConducteurCount = new Map();
    
    // Pour chaque valeur possible, compter combien de PV correspondent à cette valeur + TOUS les filtres actifs
    allPVData.forEach(pv => {
        // Construire le texte de recherche pour ce PV
        let searchText = [
            pv.chantier,
            pv.materiel_numero,
            pv.materiel_type,
            pv.fournisseur,
            pv.responsable,
            pv.email_entreprise
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (Array.isArray(pv.email_conducteur)) {
            searchText += ' ' + pv.email_conducteur.filter(Boolean).join(' ').toLowerCase();
        } else if (pv.email_conducteur) {
            searchText += ' ' + pv.email_conducteur.toLowerCase();
        }
        
        if (pv.date_reception) {
            searchText += ' ' + pv.date_reception;
            searchText += ' ' + pv.date_reception.replace(/-/g, '/');
            const drParts = pv.date_reception.split('-');
            if (drParts.length === 3) {
                searchText += ' ' + drParts[2] + '-' + drParts[1] + '-' + drParts[0];
                searchText += ' ' + drParts[2] + '/' + drParts[1] + '/' + drParts[0];
            }
        }
        
        if (pv.date_retour) {
            searchText += ' ' + pv.date_retour;
            searchText += ' ' + pv.date_retour.replace(/-/g, '/');
            const drParts = pv.date_retour.split('-');
            if (drParts.length === 3) {
                searchText += ' ' + drParts[2] + '-' + drParts[1] + '-' + drParts[0];
                searchText += ' ' + drParts[2] + '/' + drParts[1] + '/' + drParts[0];
            }
        }
        
        // Vérifier les filtres de recherche cumulatifs
        const matchesSearchFilters = activeSearchFilters.length === 0 || 
            activeSearchFilters.every(filter => searchText.includes(filter));
        
        if (!matchesSearchFilters) return; // Skip ce PV s'il ne correspond pas aux filtres de recherche
        
        // Vérifier tous les filtres SAUF celui qu'on est en train de peupler
        const matchesLastSent = !currentFilters.lastSent || (() => {
            const lastSentDate = pv.last_sent_date;
            if (currentFilters.lastSent === 'never') {
                return !lastSentDate || lastSentDate === '';
            } else if (lastSentDate) {
                const sentDate = new Date(lastSentDate);
                if (currentFilters.lastSent === 'today') {
                    return sentDate >= today;
                } else if (currentFilters.lastSent === 'week') {
                    return sentDate >= weekStart;
                } else if (currentFilters.lastSent === 'month') {
                    return sentDate >= monthStart;
                }
            }
            return false;
        })();
        
        const matchesCompletion = !currentFilters.completion || 
            (pv.completion_status || 'empty') === currentFilters.completion;
        
        const matchesDateReception = !currentFilters.dateReception || (() => {
            const dateReception = pv.date_reception;
            if (currentFilters.dateReception === 'custom') {
                const customDate = document.getElementById('pvFilterDateReceptionCustom')?.value;
                return customDate && dateReception === customDate;
            } else if (dateReception) {
                const recDate = new Date(dateReception);
                if (currentFilters.dateReception === 'today') {
                    return recDate >= today && recDate < new Date(today.getTime() + 86400000);
                } else if (currentFilters.dateReception === 'yesterday') {
                    return recDate >= yesterday && recDate < today;
                } else if (currentFilters.dateReception === 'week') {
                    return recDate >= weekStart;
                } else if (currentFilters.dateReception === 'lastWeek') {
                    return recDate >= lastWeekStart && recDate <= lastWeekEnd;
                } else if (currentFilters.dateReception === 'month') {
                    return recDate >= monthStart;
                } else if (currentFilters.dateReception === 'lastMonth') {
                    return recDate >= lastMonthStart && recDate <= lastMonthEnd;
                }
            }
            return false;
        })();
        
        const matchesDateRetour = !currentFilters.dateRetour || (() => {
            const dateRetour = pv.date_retour;
            if (currentFilters.dateRetour === 'custom') {
                const customDate = document.getElementById('pvFilterDateRetourCustom')?.value;
                return customDate && dateRetour === customDate;
            } else if (dateRetour) {
                const retDate = new Date(dateRetour);
                if (currentFilters.dateRetour === 'today') {
                    return retDate >= today && retDate < new Date(today.getTime() + 86400000);
                } else if (currentFilters.dateRetour === 'yesterday') {
                    return retDate >= yesterday && retDate < today;
                } else if (currentFilters.dateRetour === 'week') {
                    return retDate >= weekStart;
                } else if (currentFilters.dateRetour === 'lastWeek') {
                    return retDate >= lastWeekStart && retDate <= lastWeekEnd;
                } else if (currentFilters.dateRetour === 'month') {
                    return retDate >= monthStart;
                } else if (currentFilters.dateRetour === 'lastMonth') {
                    return retDate >= lastMonthStart && retDate <= lastMonthEnd;
                }
            }
            return false;
        })();
        
        // Pour chantier : vérifier TOUS les filtres (y compris chantier lui-même)
        if (pv.chantier && pv.chantier.trim()) {
            const val = pv.chantier.trim();
            const matchesChantier = val.toLowerCase() === pv.chantier.trim().toLowerCase();
        const matchesMaterielType = !currentFilters.materielType || 
            (pv.materiel_type || '').trim().toLowerCase() === currentFilters.materielType.toLowerCase();
        const matchesResponsable = !currentFilters.responsable || 
            (pv.responsable || '').trim().toLowerCase() === currentFilters.responsable.toLowerCase();
        const matchesFournisseur = !currentFilters.fournisseur || 
            (pv.fournisseur || '').trim().toLowerCase() === currentFilters.fournisseur.toLowerCase();
        const matchesEmailConducteur = checkEmailConducteurMatch(pv);            if (matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType && 
                matchesResponsable && matchesFournisseur && matchesEmailConducteur &&
                matchesDateReception && matchesDateRetour) {
                chantierCount.set(val, (chantierCount.get(val) || 0) + 1);
            }
        }
        
        // Pour materielType : vérifier TOUS les filtres (y compris materielType lui-même)
        if (pv.materiel_type && pv.materiel_type.trim()) {
            const val = pv.materiel_type.trim();
            const matchesMaterielType = val.toLowerCase() === pv.materiel_type.trim().toLowerCase();
            const matchesChantier = !currentFilters.chantier || 
                (pv.chantier || '').trim().toLowerCase() === currentFilters.chantier.toLowerCase();
            const matchesResponsable = !currentFilters.responsable || 
                (pv.responsable || '').trim().toLowerCase() === currentFilters.responsable.toLowerCase();
            const matchesFournisseur = !currentFilters.fournisseur || 
                (pv.fournisseur || '').trim().toLowerCase() === currentFilters.fournisseur.toLowerCase();
            const matchesEmailConducteur = checkEmailConducteurMatch(pv);
            
            if (matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType &&
                matchesResponsable && matchesFournisseur && matchesEmailConducteur &&
                matchesDateReception && matchesDateRetour) {
                materielTypeCount.set(val, (materielTypeCount.get(val) || 0) + 1);
            }
        }
        
        // Pour responsable : vérifier TOUS les filtres (y compris responsable lui-même)
        if (pv.responsable && pv.responsable.trim()) {
            const val = pv.responsable.trim();
            const matchesResponsable = val.toLowerCase() === pv.responsable.trim().toLowerCase();
            const matchesChantier = !currentFilters.chantier || 
                (pv.chantier || '').trim().toLowerCase() === currentFilters.chantier.toLowerCase();
            const matchesMaterielType = !currentFilters.materielType || 
                (pv.materiel_type || '').trim().toLowerCase() === currentFilters.materielType.toLowerCase();
            const matchesFournisseur = !currentFilters.fournisseur || 
                (pv.fournisseur || '').trim().toLowerCase() === currentFilters.fournisseur.toLowerCase();
            const matchesEmailConducteur = checkEmailConducteurMatch(pv);
            
            if (matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType && 
                matchesFournisseur && matchesEmailConducteur &&
                matchesDateReception && matchesDateRetour) {
                responsableCount.set(val, (responsableCount.get(val) || 0) + 1);
            }
        }
        
        // Pour fournisseur : vérifier TOUS les filtres (y compris fournisseur lui-même)
        if (pv.fournisseur && pv.fournisseur.trim()) {
            const val = pv.fournisseur.trim();
            const matchesFournisseur = val.toLowerCase() === pv.fournisseur.trim().toLowerCase();
            const matchesChantier = !currentFilters.chantier || 
                (pv.chantier || '').trim().toLowerCase() === currentFilters.chantier.toLowerCase();
            const matchesMaterielType = !currentFilters.materielType || 
                (pv.materiel_type || '').trim().toLowerCase() === currentFilters.materielType.toLowerCase();
            const matchesResponsable = !currentFilters.responsable || 
                (pv.responsable || '').trim().toLowerCase() === currentFilters.responsable.toLowerCase();
            const matchesEmailConducteur = checkEmailConducteurMatch(pv);
            
            if (matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType && 
                matchesResponsable && matchesFournisseur && matchesEmailConducteur &&
                matchesDateReception && matchesDateRetour) {
                fournisseurCount.set(val, (fournisseurCount.get(val) || 0) + 1);
            }
        }
        
        // Pour emailConducteur : vérifier TOUS les filtres (y compris emailConducteur lui-même)
        if (pv.email_conducteur) {
            const emails = Array.isArray(pv.email_conducteur) ? pv.email_conducteur : [pv.email_conducteur];
            emails.forEach(email => {
                if (email && typeof email === 'string' && email.trim()) {
                    const val = email.trim();
                    const matchesEmailConducteur = val.toLowerCase() === email.trim().toLowerCase();
                    const matchesChantier = !currentFilters.chantier || 
                        (pv.chantier || '').trim().toLowerCase() === currentFilters.chantier.toLowerCase();
                    const matchesMaterielType = !currentFilters.materielType || 
                        (pv.materiel_type || '').trim().toLowerCase() === currentFilters.materielType.toLowerCase();
                    const matchesResponsable = !currentFilters.responsable || 
                        (pv.responsable || '').trim().toLowerCase() === currentFilters.responsable.toLowerCase();
                    const matchesFournisseur = !currentFilters.fournisseur || 
                        (pv.fournisseur || '').trim().toLowerCase() === currentFilters.fournisseur.toLowerCase();
                    
                    if (matchesLastSent && matchesCompletion && matchesChantier && matchesMaterielType && 
                        matchesResponsable && matchesFournisseur && matchesEmailConducteur &&
                        matchesDateReception && matchesDateRetour) {
                        emailConducteurCount.set(val, (emailConducteurCount.get(val) || 0) + 1);
                    }
                }
            });
        }
    });
    
    // Construire les sets à partir des counts (pour avoir les valeurs uniques)
    const chantierSet = new Set(chantierCount.keys());
    const materielTypeSet = new Set(materielTypeCount.keys());
    const responsableSet = new Set(responsableCount.keys());
    const fournisseurSet = new Set(fournisseurCount.keys());
    const emailConducteurSet = new Set(emailConducteurCount.keys());
    
    // Calculer les compteurs pour les autres filtres (complétion, dates, etc.)
    const completionCount = new Map();
    const lastSentCount = new Map();
    const dateReceptionCount = new Map();
    const dateRetourCount = new Map();
    
    allPVData.forEach(pv => {
        // Construire le texte de recherche pour ce PV
        let searchText = [
            pv.chantier,
            pv.materiel_numero,
            pv.materiel_type,
            pv.fournisseur,
            pv.responsable,
            pv.email_entreprise
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (Array.isArray(pv.email_conducteur)) {
            searchText += ' ' + pv.email_conducteur.filter(Boolean).join(' ').toLowerCase();
        } else if (pv.email_conducteur) {
            searchText += ' ' + pv.email_conducteur.toLowerCase();
        }
        
        if (pv.date_reception) {
            searchText += ' ' + pv.date_reception;
            searchText += ' ' + pv.date_reception.replace(/-/g, '/');
        }
        
        if (pv.date_retour) {
            searchText += ' ' + pv.date_retour;
            searchText += ' ' + pv.date_retour.replace(/-/g, '/');
        }
        
        // Vérifier les filtres de recherche cumulatifs
        const matchesSearchFilters = activeSearchFilters.length === 0 || 
            activeSearchFilters.every(filter => searchText.includes(filter));
        
        if (!matchesSearchFilters) return;
        
        // Vérifier tous les autres filtres actifs
        const matchesChantier = !currentFilters.chantier || 
            (pv.chantier || '').trim() === currentFilters.chantier;
        const matchesMaterielType = !currentFilters.materielType || 
            (pv.materiel_type || '').trim() === currentFilters.materielType;
        const matchesResponsable = !currentFilters.responsable || 
            (pv.responsable || '').trim() === currentFilters.responsable;
        const matchesFournisseur = !currentFilters.fournisseur || 
            (pv.fournisseur || '').trim() === currentFilters.fournisseur;
        const matchesEmailConducteur = checkEmailConducteurMatch(pv);
        
        // Compter pour complétion (exclure filtre complétion)
        if (matchesChantier && matchesMaterielType && matchesResponsable && 
            matchesFournisseur && matchesEmailConducteur) {
            const status = pv.completion_status || 'empty';
            completionCount.set(status, (completionCount.get(status) || 0) + 1);
        }
        
        // Compter pour lastSent (exclure filtre lastSent et complétion)
        if (matchesChantier && matchesMaterielType && matchesResponsable && 
            matchesFournisseur && matchesEmailConducteur && 
            (!currentFilters.completion || (pv.completion_status || 'empty') === currentFilters.completion)) {
            const lastSentDate = pv.last_sent_date;
            if (!lastSentDate) {
                lastSentCount.set('never', (lastSentCount.get('never') || 0) + 1);
            } else {
                const sentDate = new Date(lastSentDate);
                if (sentDate >= today) {
                    lastSentCount.set('today', (lastSentCount.get('today') || 0) + 1);
                }
                if (sentDate >= weekStart) {
                    lastSentCount.set('week', (lastSentCount.get('week') || 0) + 1);
                }
                if (sentDate >= monthStart) {
                    lastSentCount.set('month', (lastSentCount.get('month') || 0) + 1);
                }
            }
        }
        
        // Compter pour date réception (exclure filtre date réception)
        if (matchesChantier && matchesMaterielType && matchesResponsable && 
            matchesFournisseur && matchesEmailConducteur &&
            (!currentFilters.completion || (pv.completion_status || 'empty') === currentFilters.completion) &&
            (!currentFilters.lastSent || (() => {
                const lastSentDate = pv.last_sent_date;
                if (currentFilters.lastSent === 'never') return !lastSentDate;
                if (!lastSentDate) return false;
                const sentDate = new Date(lastSentDate);
                if (currentFilters.lastSent === 'today') return sentDate >= today;
                if (currentFilters.lastSent === 'week') return sentDate >= weekStart;
                if (currentFilters.lastSent === 'month') return sentDate >= monthStart;
                return false;
            })())) {
            const dateReception = pv.date_reception;
            if (dateReception) {
                const recDate = new Date(dateReception);
                if (recDate >= today && recDate < new Date(today.getTime() + 86400000)) {
                    dateReceptionCount.set('today', (dateReceptionCount.get('today') || 0) + 1);
                }
                if (recDate >= yesterday && recDate < today) {
                    dateReceptionCount.set('yesterday', (dateReceptionCount.get('yesterday') || 0) + 1);
                }
                if (recDate >= weekStart) {
                    dateReceptionCount.set('week', (dateReceptionCount.get('week') || 0) + 1);
                }
                if (recDate >= lastWeekStart && recDate <= lastWeekEnd) {
                    dateReceptionCount.set('lastWeek', (dateReceptionCount.get('lastWeek') || 0) + 1);
                }
                if (recDate >= monthStart) {
                    dateReceptionCount.set('month', (dateReceptionCount.get('month') || 0) + 1);
                }
                if (recDate >= lastMonthStart && recDate <= lastMonthEnd) {
                    dateReceptionCount.set('lastMonth', (dateReceptionCount.get('lastMonth') || 0) + 1);
                }
            }
        }
        
        // Compter pour date retour (exclure filtre date retour)
        if (matchesChantier && matchesMaterielType && matchesResponsable && 
            matchesFournisseur && matchesEmailConducteur &&
            (!currentFilters.completion || (pv.completion_status || 'empty') === currentFilters.completion) &&
            (!currentFilters.lastSent || (() => {
                const lastSentDate = pv.last_sent_date;
                if (currentFilters.lastSent === 'never') return !lastSentDate;
                if (!lastSentDate) return false;
                const sentDate = new Date(lastSentDate);
                if (currentFilters.lastSent === 'today') return sentDate >= today;
                if (currentFilters.lastSent === 'week') return sentDate >= weekStart;
                if (currentFilters.lastSent === 'month') return sentDate >= monthStart;
                return false;
            })())) {
            const dateRetour = pv.date_retour;
            if (dateRetour) {
                const retDate = new Date(dateRetour);
                if (retDate >= today && retDate < new Date(today.getTime() + 86400000)) {
                    dateRetourCount.set('today', (dateRetourCount.get('today') || 0) + 1);
                }
                if (retDate >= yesterday && retDate < today) {
                    dateRetourCount.set('yesterday', (dateRetourCount.get('yesterday') || 0) + 1);
                }
                if (retDate >= weekStart) {
                    dateRetourCount.set('week', (dateRetourCount.get('week') || 0) + 1);
                }
                if (retDate >= lastWeekStart && retDate <= lastWeekEnd) {
                    dateRetourCount.set('lastWeek', (dateRetourCount.get('lastWeek') || 0) + 1);
                }
                if (retDate >= monthStart) {
                    dateRetourCount.set('month', (dateRetourCount.get('month') || 0) + 1);
                }
                if (retDate >= lastMonthStart && retDate <= lastMonthEnd) {
                    dateRetourCount.set('lastMonth', (dateRetourCount.get('lastMonth') || 0) + 1);
                }
            }
        }
    });
    
    // Peupler le select dernier envoi
    const lastSentSelect = document.getElementById('pvFilterLastSent');
    if (lastSentSelect) {
        const currentValue = lastSentSelect.value;
        lastSentSelect.innerHTML = `
            <option value="">Toutes dates</option>
            <option value="today">Aujourd'hui (${lastSentCount.get('today') || 0})</option>
            <option value="week">Cette semaine (${lastSentCount.get('week') || 0})</option>
            <option value="month">Ce mois (${lastSentCount.get('month') || 0})</option>
            <option value="never">Jamais envoyé (${lastSentCount.get('never') || 0})</option>
        `;
        if (currentValue) lastSentSelect.value = currentValue;
    }
    
    // Peupler le select complétion
    const completionSelect = document.getElementById('pvFilterCompletion');
    if (completionSelect) {
        const currentValue = completionSelect.value;
        completionSelect.innerHTML = `
            <option value="">Tous états</option>
            <option value="complete">Complet (Réception + Retour) (${completionCount.get('complete') || 0})</option>
            <option value="reception_only">Réception seulement (${completionCount.get('reception_only') || 0})</option>
            <option value="retour_only">Retour seulement (${completionCount.get('retour_only') || 0})</option>
            <option value="empty">Non signé (${completionCount.get('empty') || 0})</option>
        `;
        if (currentValue) completionSelect.value = currentValue;
    }
    
    // Peupler le select date réception
    const dateReceptionSelect = document.getElementById('pvFilterDateReception');
    if (dateReceptionSelect) {
        const currentValue = dateReceptionSelect.value;
        dateReceptionSelect.innerHTML = `
            <option value="">Toutes dates</option>
            <option value="today">Aujourd'hui (${dateReceptionCount.get('today') || 0})</option>
            <option value="yesterday">Hier (${dateReceptionCount.get('yesterday') || 0})</option>
            <option value="week">Cette semaine (${dateReceptionCount.get('week') || 0})</option>
            <option value="lastWeek">Semaine dernière (${dateReceptionCount.get('lastWeek') || 0})</option>
            <option value="month">Ce mois (${dateReceptionCount.get('month') || 0})</option>
            <option value="lastMonth">Mois dernier (${dateReceptionCount.get('lastMonth') || 0})</option>
            <option value="custom">Date précise...</option>
        `;
        if (currentValue) dateReceptionSelect.value = currentValue;
    }
    
    // Peupler le select date retour
    const dateRetourSelect = document.getElementById('pvFilterDateRetour');
    if (dateRetourSelect) {
        const currentValue = dateRetourSelect.value;
        dateRetourSelect.innerHTML = `
            <option value="">Toutes dates</option>
            <option value="today">Aujourd'hui (${dateRetourCount.get('today') || 0})</option>
            <option value="yesterday">Hier (${dateRetourCount.get('yesterday') || 0})</option>
            <option value="week">Cette semaine (${dateRetourCount.get('week') || 0})</option>
            <option value="lastWeek">Semaine dernière (${dateRetourCount.get('lastWeek') || 0})</option>
            <option value="month">Ce mois (${dateRetourCount.get('month') || 0})</option>
            <option value="lastMonth">Mois dernier (${dateRetourCount.get('lastMonth') || 0})</option>
            <option value="custom">Date précise...</option>
        `;
        if (currentValue) dateRetourSelect.value = currentValue;
    }
    
    // Peupler le select chantier
    const chantierSelect = document.getElementById('pvFilterChantier');
    if (chantierSelect) {
        const currentValue = chantierSelect.value;
        chantierSelect.innerHTML = '<option value="">Tous chantiers</option>';
        Array.from(chantierSet).sort().forEach(chantier => {
            const option = document.createElement('option');
            option.value = chantier;
            const count = chantierCount.get(chantier) || 0;
            option.textContent = `${chantier} (${count})`;
            chantierSelect.appendChild(option);
        });
        if (currentValue && chantierSet.has(currentValue)) {
            chantierSelect.value = currentValue;
        }
    }
    
    // Peupler le select type matériel
    const materielTypeSelect = document.getElementById('pvFilterMaterielType');
    if (materielTypeSelect) {
        const currentValue = materielTypeSelect.value;
        materielTypeSelect.innerHTML = '<option value="">Tous types</option>';
        Array.from(materielTypeSet).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            const count = materielTypeCount.get(type) || 0;
            option.textContent = `${type} (${count})`;
            materielTypeSelect.appendChild(option);
        });
        if (currentValue && materielTypeSet.has(currentValue)) {
            materielTypeSelect.value = currentValue;
        }
    }
    
    // Peupler le select responsable
    const responsableSelect = document.getElementById('pvFilterResponsable');
    if (responsableSelect) {
        const currentValue = responsableSelect.value;
        responsableSelect.innerHTML = '<option value="">Tous responsables</option>';
        Array.from(responsableSet).sort().forEach(resp => {
            const option = document.createElement('option');
            option.value = resp;
            const count = responsableCount.get(resp) || 0;
            option.textContent = `${resp} (${count})`;
            responsableSelect.appendChild(option);
        });
        if (currentValue && responsableSet.has(currentValue)) {
            responsableSelect.value = currentValue;
        }
    }
    
    // Peupler le select fournisseur
    const fournisseurSelect = document.getElementById('pvFilterFournisseur');
    if (fournisseurSelect) {
        const currentValue = fournisseurSelect.value;
        fournisseurSelect.innerHTML = '<option value="">Tous fournisseurs</option>';
        Array.from(fournisseurSet).sort().forEach(fourn => {
            const option = document.createElement('option');
            option.value = fourn;
            const count = fournisseurCount.get(fourn) || 0;
            option.textContent = `${fourn} (${count})`;
            fournisseurSelect.appendChild(option);
        });
        if (currentValue && fournisseurSet.has(currentValue)) {
            fournisseurSelect.value = currentValue;
        }
    }
    
    // Peupler le select email conducteur
    const emailConducteurSelect = document.getElementById('pvFilterEmailConducteur');
    if (emailConducteurSelect) {
        const currentValue = emailConducteurSelect.value;
        emailConducteurSelect.innerHTML = '<option value="">Tous emails conducteur</option>';
        Array.from(emailConducteurSet).sort().forEach(email => {
            const option = document.createElement('option');
            option.value = email;
            const count = emailConducteurCount.get(email) || 0;
            option.textContent = `${email} (${count})`;
            emailConducteurSelect.appendChild(option);
        });
        if (currentValue && emailConducteurSet.has(currentValue)) {
            emailConducteurSelect.value = currentValue;
        }
    }
}

/**
 * Met à jour le compteur de PV filtrés
 */
function updateFilterCount(count) {
    const filterCount = document.getElementById('pvFilterCount');
    if (!filterCount) return;
    
    if (count === undefined) {
        const cards = document.querySelectorAll('.pv-card:not(.hidden)');
        count = cards.length;
    }
    
    filterCount.textContent = count;
}

/**
 * Charge un PV par son ID
 * @param {string} pvId - L'ID du PV à charger
 * @param {boolean} silent - Si true, ne pas afficher de notification
 */
/**
 * Réinitialise complètement le formulaire PV
 */
function resetForm() {
    // Nettoyer le formulaire
    document.getElementById('pvForm').reset();
    
    // Effacer les signatures
    if (signaturePadReception) signaturePadReception.clear();
    if (signaturePadRetour) signaturePadRetour.clear();
    
    // Nettoyer toutes les photos
    const photoContainers = document.querySelectorAll('.multi-photo-container');
    photoContainers.forEach(container => {
        const photoItems = container.querySelectorAll('.photo-item');
        photoItems.forEach(item => item.remove());
    });
    
    // Réinitialiser les sliders de carburant à 0
    const carburantReception = document.getElementById('carburant_reception');
    const carburantRetour = document.getElementById('carburant_retour');
    if (carburantReception) {
        carburantReception.value = '0';
        const valueDisplay = document.getElementById('carburant_reception_value');
        if (valueDisplay) valueDisplay.textContent = '0%';
    }
    if (carburantRetour) {
        carburantRetour.value = '0';
        const valueDisplay = document.getElementById('carburant_retour_value');
        if (valueDisplay) valueDisplay.textContent = '0%';
    }
}

/**
 * Charge un PV existant par son ID
 */
async function loadPVById(pvId, silent = false) {
    if (!pvId) return;
    
    try {
        // Nettoyer complètement le formulaire avant de charger les nouvelles données
        resetForm();
        
        const response = await fetch(`/load-pv/${pvId}`);
        const data = await response.json();
        
        if (data.success) {
            const pvData = data.pv_data;
            currentPVId = pvData.id;
            pvStatus = pvData.status || 'draft';
            
            // Sauvegarder l'ID du PV actuel dans localStorage pour le restaurer après rafraîchissement
            localStorage.setItem('currentPVId', currentPVId);
            
            // Stocker les données du PV pour y accéder dans updatePVStatusBadge
            window.currentPVData = pvData;
            
            // Remplir le formulaire avec les nouvelles données
            populateForm(pvData.form_data);
            
            // Charger les données VGP
            const vgpDateInput = document.getElementById('vgp_date');
            if (vgpDateInput && pvData.vgp_date) {
                vgpDateInput.value = pvData.vgp_date;
            }
            
            // Afficher le lien du document VGP si présent
            const vgpDocLink = document.getElementById('vgp_document_link');
            const vgpDocCurrent = document.getElementById('vgp_document_current');
            if (vgpDocLink && vgpDocCurrent && pvData.vgp_document_path) {
                vgpDocLink.href = `/vgp-document/${pvData.id}`;
                vgpDocCurrent.style.display = 'block';
            } else if (vgpDocCurrent) {
                vgpDocCurrent.style.display = 'none';
            }
            
            // Mettre à jour l'indicateur VGP
            updateVGPIndicator();
            
            // Effacer la sauvegarde automatique car on charge un PV sauvegardé
            localStorage.removeItem('pvMaterielFormData');
            
            // Mettre à jour le statut
            document.getElementById('pvId').value = currentPVId;
            updatePVStatusBadge();
            
            if (!silent) {
                showNotification('success', `PV "${pvData.chantier}" chargé avec succès`);
            }
            
            // Charger les versions disponibles pour ce PV
            await loadPVVersions(pvData.id);
            
            // Mettre à jour la sélection visuelle
            await loadSavedPVList();
        } else {
            showNotification('danger', data.message);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du PV:', error);
        showNotification('danger', 'Erreur lors du chargement du PV');
    }
}

/**
 * Supprime un PV par son ID
 */
async function deletePVById(pvId) {
    if (!pvId) return;
    
    // Trouver le nom du PV
    const card = document.querySelector(`.pv-card[data-pv-id="${pvId}"]`);
    const pvName = card ? card.querySelector('.pv-card-title').textContent.trim() : 'ce PV';
    
    // Utiliser le modal avec mot de passe au lieu de confirm()
    requestDeletePV(pvId, `<strong>Chantier :</strong> ${pvName}`);
}

/**
 * Télécharge un PV par son ID
 */
async function downloadPVById(pvId) {
    if (!pvId) return;
    
    try {
        // Charger le PV d'abord (silencieusement)
        await loadPVById(pvId, true);
        
        // Attendre un peu pour s'assurer que le formulaire est bien rempli
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Télécharger le PDF
        await downloadPVAsPDF();
    } catch (error) {
        console.error('Erreur lors du téléchargement du PV:', error);
        showNotification('danger', 'Erreur lors du téléchargement du PV');
    }
}

/**
 * Envoie un PV par email par son ID
 */
async function sendPVById(pvId) {
    if (!pvId) return;
    
    try {
        // Charger le PV d'abord (silencieusement)
        await loadPVById(pvId, true);
        
        // Attendre un peu pour s'assurer que le formulaire est bien rempli
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Soumettre le formulaire pour envoyer l'email
        const pvForm = document.getElementById('pvForm');
        if (pvForm) {
            // Créer un FormData avec les données actuelles
            const formData = new FormData(pvForm);
            
            // Ajouter les signatures si elles existent
            if (signaturePadReception && !signaturePadReception.isEmpty()) {
                const signatureBlob = await fetch(signaturePadReception.toDataURL('image/png')).then(r => r.blob());
                formData.set('signature_reception', signatureBlob, 'signature_reception.png');
            }
            
            if (signaturePadRetour && !signaturePadRetour.isEmpty()) {
                const signatureBlob = await fetch(signaturePadRetour.toDataURL('image/png')).then(r => r.blob());
                formData.set('signature_retour', signatureBlob, 'signature_retour.png');
            }
            
            // Validation
            const chantier = formData.get('chantier');
            const emailConducteurs = formData.getAll('email_conducteur').filter(e => e.trim());
            const hasReceptionSignature = signaturePadReception && !signaturePadReception.isEmpty();
            const hasRetourSignature = signaturePadRetour && !signaturePadRetour.isEmpty();
            
            if (!chantier || emailConducteurs.length === 0) {
                showNotification('warning', 'Veuillez remplir le chantier et au moins un email destinataire avant d\'envoyer');
                return;
            }
            
            if (!hasReceptionSignature && !hasRetourSignature) {
                showNotification('warning', 'Veuillez signer au moins une section (Réception ou Retour) avant d\'envoyer');
                return;
            }
            
            // Envoyer
            const response = await fetch(pvForm.action, {
                method: 'POST',
                body: formData
            });
            
            if (response.redirected) {
                window.location.href = response.url;
            } else if (response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    showNotification('success', data.message || 'PV envoyé par email avec succès');
                } else {
                    window.location.reload();
                }
                await loadSavedPVList();
            } else {
                try {
                    const data = await response.json();
                    showNotification('danger', data.message || 'Erreur lors de l\'envoi du PV');
                } catch {
                    showNotification('danger', 'Erreur lors de l\'envoi du PV');
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi du PV:', error);
        showNotification('danger', 'Erreur lors de l\'envoi du PV');
    }
}

/**
 * Sauvegarde le PV en cours comme brouillon
 * @param {Event|boolean} eventOrSilent - L'événement click ou un booléen silent
 * @returns {Promise<boolean>} - true si succès, false sinon
 */
async function savePVDraft(eventOrSilent) {
    // Déterminer si c'est un événement ou un booléen
    const silent = typeof eventOrSilent === 'boolean' ? eventOrSilent : false;
    
    try {
        const btn = document.getElementById('saveDraftBtn');
        if (btn && !silent) {
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';
        }
        
        // Récupérer toutes les données du formulaire
        const formData = gatherFormData();
        
        // Ajouter l'ID actuel si existant
        if (currentPVId) {
            formData.pv_id = currentPVId;
        }
        
        const response = await fetch('/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentPVId = data.pv_id;
            document.getElementById('pvId').value = currentPVId;
            pvStatus = 'draft';
            
            updatePVStatusBadge();
            
            // Uploader le document VGP s'il y en a un
            const vgpDocInput = document.getElementById('vgp_document');
            if (vgpDocInput && vgpDocInput.files.length > 0) {
                await uploadVGPDocument(currentPVId, vgpDocInput.files[0]);
                // Réinitialiser l'input pour permettre un nouvel upload
                vgpDocInput.value = '';
            }
            
            // Effacer la sauvegarde automatique locale car les données sont maintenant sauvegardées
            localStorage.removeItem('pvMaterielFormData');
            
            // Afficher message de succès seulement si pas en mode silent
            if (!silent) {
                showNotification('success', data.message);
            }
            
            // Recharger la liste
            await loadSavedPVList();
            
            // Vérifier les alertes VGP
            await checkVGPAlerts();
            
            // Sélectionner le PV dans la liste
            const select = document.getElementById('savedPVSelect');
            if (select) {
                select.value = currentPVId;
            }
            
            if (btn && !silent) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder le PV';
            }
            
            return true;
        } else {
            if (!silent) {
                showNotification('danger', data.message);
            }
            
            if (btn && !silent) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder le PV';
            }
            
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        if (!silent) {
            showNotification('danger', 'Erreur lors de la sauvegarde du PV');
        }
        
        const btn = document.getElementById('saveDraftBtn');
        if (btn && !silent) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder le PV';
        }
        
        return false;
    }
}

/**
 * Télécharge le PV au format PDF
 */
async function downloadPVAsPDF(event) {
    try {
        // Sauvegarder le PV d'abord
        const saveResult = await savePVDraft(true); // true = silencieux, pas de notification
        if (!saveResult) {
            showNotification('warning', 'Impossible de sauvegarder le PV avant téléchargement');
            return;
        }
        
        // Déterminer quel bouton a été cliqué
        const btn = event ? event.target.closest('button') : document.getElementById('downloadPVBtn');
        
        if (!btn) {
            console.error('Bouton non trouvé');
            return;
        }
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
        
        // Récupérer les données du formulaire
        const form = document.getElementById('pvForm');
        const formData = new FormData(form);
        
        // Ajouter les signatures au FormData
        if (signaturePadReception && !signaturePadReception.isEmpty()) {
            const signatureBlob = await fetch(signaturePadReception.toDataURL('image/png')).then(r => r.blob());
            formData.set('signature_reception', signatureBlob, 'signature_reception.png');
        }
        
        if (signaturePadRetour && !signaturePadRetour.isEmpty()) {
            const signatureBlob = await fetch(signaturePadRetour.toDataURL('image/png')).then(r => r.blob());
            formData.set('signature_retour', signatureBlob, 'signature_retour.png');
        }
        
        // Validation du champ obligatoire
        const chantier = formData.get('chantier');
        if (!chantier) {
            showNotification('warning', 'Le chantier est obligatoire pour générer le PDF');
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }
        
        const response = await fetch('/download-pdf', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Convertir base64 en blob
            const binaryString = atob(data.pdf_data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });
            
            // Créer un lien de téléchargement
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Mettre à jour l'ID du PV et le statut
            if (data.pv_id) {
                currentPVId = data.pv_id;
                document.getElementById('pvId').value = currentPVId;
                pvStatus = 'draft';
                updatePVStatusBadge();
                
                // Recharger la liste des PV
                await loadSavedPVList();
                
                // Sélectionner le PV dans la liste
                const select = document.getElementById('savedPVSelect');
                if (select) {
                    select.value = currentPVId;
                }
            }
            
            showNotification('success', 'PDF téléchargé et sauvegardé avec succès');
        } else {
            showNotification('danger', data.message || 'Erreur lors de la génération du PDF');
        }
        
        btn.disabled = false;
        btn.innerHTML = originalText;
    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        showNotification('danger', 'Erreur lors du téléchargement du PDF');
        
        // Restaurer le bouton
        const btnBottom = document.getElementById('downloadPVBtn');
        if (btnBottom) {
            btnBottom.disabled = false;
            btnBottom.innerHTML = '<i class="fas fa-download"></i> Télécharger le PDF<br><small class="d-block mt-1">Générer et télécharger le PDF</small>';
        }
    }
}

/**
 * Récupère toutes les données du formulaire
 */
function gatherFormData() {
    const form = document.getElementById('pvForm');
    const formData = {};
    
    // Récupérer tous les champs input, select, textarea
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.name && input.type !== 'file') {
            // Ignorer les champs cachés de signature (ils seront remplis après depuis les canvas)
            if (input.name === 'signature_reception' || input.name === 'signature_retour') {
                return;
            }
            
            // Pour les inputs hidden qui contiennent des photos (format: photo_xxx_timestamp_random)
            // Les sauvegarder directement avec leur nom complet
            if (input.type === 'hidden' && input.name.startsWith('photo_') && input.value.startsWith('data:image/')) {
                formData[input.name] = input.value;
                return;
            }
            
            if (input.type === 'radio') {
                if (input.checked) {
                    formData[input.name] = input.value;
                }
            } else if (input.type === 'checkbox') {
                formData[input.name] = input.checked ? input.value : '';
            } else if (input.multiple && input.tagName === 'SELECT') {
                // Pour les selects multiples, récupérer toutes les valeurs sélectionnées
                const selectedOptions = Array.from(input.selectedOptions).map(opt => opt.value);
                formData[input.name] = selectedOptions;
            } else {
                formData[input.name] = input.value;
            }
        }
    });
    
    // Sauvegarder les signatures depuis les canvas (priorité sur les champs cachés)
    if (signaturePadReception && !signaturePadReception.isEmpty()) {
        formData.signature_reception = signaturePadReception.toDataURL('image/png');
    }
    
    if (signaturePadRetour && !signaturePadRetour.isEmpty()) {
        formData.signature_retour = signaturePadRetour.toDataURL('image/png');
    }
    
    // Ajouter les métadonnées
    if (!formData.created_at) {
        formData.created_at = new Date().toISOString();
    }
    
    return formData;
}

/**
 * Remplit le formulaire avec les données
 */
function populateForm(formData) {
    const form = document.getElementById('pvForm');
    
    // Nettoyer seulement les photo-items existants (pas les boutons d'upload)
    const photoContainers = form.querySelectorAll('.multi-photo-container');
    photoContainers.forEach(container => {
        const photoItems = container.querySelectorAll('.photo-item');
        photoItems.forEach(item => item.remove());
    });
    
    Object.keys(formData).forEach(key => {
        const value = formData[key];
        
        // Ignorer les champs de signature pour traitement spécial
        // NE PAS ignorer les photos ici, elles seront traitées plus bas
        if (key === 'signature_reception' || key === 'signature_retour') {
            return;
        }
        
        // Ignorer les champs photo_ qui seront traités dans la section photos
        if (key.startsWith('photo_')) {
            return;
        }
        
        // Vérifier si c'est un champ Select2
        if (HISTORY_FIELDS.includes(key)) {
            // Utiliser jQuery pour définir la valeur dans Select2
            const $element = $(`#${key}`);
            if ($element.length) {
                // Gérer les selects multiples
                if ($element.prop('multiple')) {
                    const values = Array.isArray(value) ? value : [value];
                    // Créer les options si elles n'existent pas
                    values.forEach(val => {
                        if (val && $element.find(`option[value="${val}"]`).length === 0) {
                            const newOption = new Option(val, val, true, true);
                            $element.append(newOption);
                        }
                    });
                    // Définir les valeurs et déclencher le changement
                    $element.val(values).trigger('change');
                } else {
                    // Select simple
                    if ($element.find(`option[value="${value}"]`).length === 0 && value) {
                        const newOption = new Option(value, value, true, true);
                        $element.append(newOption);
                    }
                    $element.val(value).trigger('change');
                }
            }
            return;
        }
        
        // Trouver l'élément
        let element = form.querySelector(`[name="${key}"]`);
        
        if (element) {
            if (element.type === 'radio') {
                const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
                if (radio) radio.checked = true;
            } else if (element.type === 'checkbox') {
                element.checked = !!value;
            } else if (element.tagName === 'SELECT') {
                element.value = value;
            } else if (element.type === 'range') {
                // Traitement spécial pour les sliders (niveau carburant)
                element.value = value;
                // Mettre à jour l'affichage de la valeur
                const valueDisplay = document.getElementById(`${key}_value`);
                if (valueDisplay) {
                    valueDisplay.textContent = value + '%';
                }
            } else {
                element.value = value;
            }
        }
    });
    
    // Restaurer les photos - parcourir toutes les clés photo_* dans formData
    const allPhotoKeys = Object.keys(formData).filter(key => 
        key.startsWith('photo_') && 
        formData[key] && 
        typeof formData[key] === 'string' && 
        formData[key].startsWith('data:image/')
    );
    
    // Regrouper les photos par conteneur
    const photosByContainer = {};
    allPhotoKeys.forEach(photoKey => {
        let fieldName;
        
        // Nouveau format: photo_carrosserie_reception_123456_789
        const matchNew = photoKey.match(/^photo_(.+?)_\d+_\d+$/);
        if (matchNew) {
            fieldName = matchNew[1];
        } else {
            // Ancien format: photo_carrosserie_reception (sans timestamp)
            // Extraire tout ce qui suit "photo_"
            fieldName = photoKey.substring(6); // Enlever "photo_"
        }
        
        if (fieldName) {
            if (!photosByContainer[fieldName]) {
                photosByContainer[fieldName] = [];
            }
            photosByContainer[fieldName].push(photoKey);
        }
    });
    
    // Insérer les photos dans leurs conteneurs respectifs
    Object.keys(photosByContainer).forEach(fieldName => {
        const containerId = `photos_${fieldName}`;
        const multiPhotoContainer = document.getElementById(containerId);
        
        if (multiPhotoContainer) {
            const photoKeys = photosByContainer[fieldName].sort();
            
            photoKeys.forEach(photoKey => {
                const photoData = formData[photoKey];
                
                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';
                photoItem.innerHTML = `
                    <input type="hidden" name="${photoKey}" value="${photoData}">
                    <div class="photo-preview">
                        <img src="${photoData}" alt="Photo" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; border-radius: 4px;">
                        <button type="button" class="remove-photo-btn" onclick="removePhotoItem(this)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                
                // Insérer avant l'input file
                const fileInput = multiPhotoContainer.querySelector('input[type="file"]');
                if (fileInput) {
                    multiPhotoContainer.insertBefore(photoItem, fileInput);
                } else {
                    multiPhotoContainer.appendChild(photoItem);
                }
            });
        }
    });
    
    // Restaurer les signatures
    if (formData.signature_reception && signaturePadReception) {
        try {
            signaturePadReception.fromDataURL(formData.signature_reception);
            document.getElementById('signature_reception_data').value = formData.signature_reception;
        } catch (error) {
            console.error('Erreur lors de la restauration de la signature réception:', error);
        }
    }
    
    if (formData.signature_retour && signaturePadRetour) {
        try {
            signaturePadRetour.fromDataURL(formData.signature_retour);
            document.getElementById('signature_retour_data').value = formData.signature_retour;
        } catch (error) {
            console.error('Erreur lors de la restauration de la signature retour:', error);
        }
    }
}

/**
 * Crée un nouveau PV vierge
 */
function createNewPV() {
    if (currentPVId && pvStatus === 'draft') {
        if (!confirm('Les modifications non sauvegardées seront perdues. Continuer ?')) {
            return;
        }
    }
    
    // Réinitialiser le formulaire
    document.getElementById('pvForm').reset();
    
    // Réinitialiser tous les champs Select2
    $('#chantier').val('').trigger('change');
    $('#email_conducteur').val('').trigger('change');
    $('#materiel_numero').val('').trigger('change');
    $('#materiel_type').val('').trigger('change');
    $('#fournisseur').val('').trigger('change');
    $('#responsable').val('').trigger('change');
    
    // Effacer les signatures
    if (signaturePadReception) signaturePadReception.clear();
    if (signaturePadRetour) signaturePadRetour.clear();
    
    // Nettoyer toutes les photos
    const photoContainers = document.querySelectorAll('.multi-photo-container');
    photoContainers.forEach(container => {
        const photoItems = container.querySelectorAll('.photo-item');
        photoItems.forEach(item => item.remove());
    });
    
    // Réinitialiser les sliders de carburant à 0
    const carburantReception = document.getElementById('carburant_reception');
    const carburantRetour = document.getElementById('carburant_retour');
    if (carburantReception) {
        carburantReception.value = '0';
        const valueDisplay = document.getElementById('carburant_reception_value');
        if (valueDisplay) valueDisplay.textContent = '0%';
    }
    if (carburantRetour) {
        carburantRetour.value = '0';
        const valueDisplay = document.getElementById('carburant_retour_value');
        if (valueDisplay) valueDisplay.textContent = '0%';
    }
    
    // Effacer la sauvegarde automatique
    localStorage.removeItem('pvMaterielFormData');
    
    // Réinitialiser les variables
    currentPVId = null;
    pvStatus = 'new';
    document.getElementById('pvId').value = '';
    
    // Restaurer l'email entreprise depuis l'historique avec Select2
    const history = getFieldHistory('email_entreprise');
    if (history.length > 0) {
        $('#email_entreprise').val(history[0]).trigger('change');
    }
    
    // Réinitialiser le select
    const select = document.getElementById('savedPVSelect');
    if (select) {
        select.value = '';
    }
    
    updatePVStatusBadge();
    
    showNotification('info', 'Nouveau PV créé');
}

/**
 * Met à jour l'indicateur de PV actuel avec les détails
 */
function updatePVStatusBadge() {
    const indicator = document.getElementById('currentPVIndicator');
    if (!indicator) return;
    
    const statusDiv = indicator.querySelector('.pv-indicator-status');
    const detailsDiv = indicator.querySelector('.pv-indicator-details');
    const iconDiv = indicator.querySelector('.pv-indicator-icon i');
    
    if (pvStatus === 'new') {
        indicator.className = 'current-pv-indicator alert alert-info d-flex align-items-center';
        iconDiv.className = 'fas fa-file-alt fs-3';
        statusDiv.innerHTML = '<strong><i class="fas fa-plus-circle me-2"></i>Nouveau PV en cours</strong>';
        detailsDiv.innerHTML = '<span class="text-muted small">Le formulaire est vide et prêt à être rempli</span>';
    } else if (pvStatus === 'draft') {
        indicator.className = 'current-pv-indicator alert alert-warning d-flex align-items-center';
        iconDiv.className = 'fas fa-edit fs-3';
        
        // Récupérer les informations du formulaire
        const chantier = document.getElementById('chantier')?.value || '';
        const emailConducteur = document.getElementById('email_conducteur')?.value || '';
        const emailEntreprise = document.getElementById('email_entreprise')?.value || '';
        const materielType = document.getElementById('materiel_type')?.value || '';
        const materielNumero = document.getElementById('materiel_numero')?.value || '';
        const pvType = document.querySelector('input[name="pv_type"]:checked')?.value || 'reception';
        
        // Vérifier les signatures pour le type de PV actuel
        const signatureReception = signaturePadReception && !signaturePadReception.isEmpty();
        const signatureRetour = signaturePadRetour && !signaturePadRetour.isEmpty();
        
        // ===== CHAMPS CRITIQUES (bloquants) =====
        let missingCritical = [];
        if (!chantier) missingCritical.push('Chantier');
        if (!emailConducteur) missingCritical.push('Email destinataire');
        if (!emailEntreprise) missingCritical.push('Email entreprise');
        if (!materielType) missingCritical.push('Type matériel');
        if (!materielNumero) missingCritical.push('N° matériel');
        
        // Vérifier la signature selon le type de PV
        if (pvType === 'reception' && !signatureReception) {
            missingCritical.push('Signature réception');
        }
        if (pvType === 'retour' && !signatureRetour) {
            missingCritical.push('Signature retour');
        }
        
        // ===== CHAMPS RECOMMANDÉS (inspection) =====
        let missingInspection = [];
        const suffix = pvType === 'reception' ? '_reception' : '_retour';
        
        // Vérifier l'inspection visuelle
        const carrosserie = document.querySelector(`input[name="carrosserie${suffix}"]:checked`);
        const eclairage = document.querySelector(`input[name="eclairage${suffix}"]:checked`);
        const pneumatiques = document.querySelector(`input[name="pneumatiques${suffix}"]:checked`);
        const panier = document.querySelector(`input[name="panier${suffix}"]:checked`);
        const flexibles = document.querySelector(`input[name="flexibles${suffix}"]:checked`);
        
        if (!carrosserie) missingInspection.push('Carrosserie');
        if (!eclairage) missingInspection.push('Éclairage');
        if (!pneumatiques) missingInspection.push('Pneumatiques');
        if (!panier) missingInspection.push('Panier');
        if (!flexibles) missingInspection.push('Flexibles');
        
        // Vérifier les fluides (carburant et fuites)
        const carburant = document.getElementById(`carburant${suffix}`)?.value;
        const fuiteMoteur = document.querySelector(`input[name="fuite_moteur${suffix}"]:checked`);
        const fuiteHydraulique = document.querySelector(`input[name="fuite_hydraulique${suffix}"]:checked`);
        const fuiteGasoil = document.querySelector(`input[name="fuite_gasoil${suffix}"]:checked`);
        
        if (!carburant || carburant === '0') missingInspection.push('Carburant');
        if (!fuiteMoteur) missingInspection.push('Fuite moteur');
        if (!fuiteHydraulique) missingInspection.push('Fuite hydraulique');
        if (!fuiteGasoil) missingInspection.push('Fuite gasoil');
        
        // Récupérer la date d'envoi depuis les données chargées
        const lastSentDate = currentPVId ? (window.currentPVData?.last_sent_date || null) : null;
        
        const typeLabel = pvType === 'reception' ? 'Réception' : 'Retour';
        const chantierDisplay = chantier || 'Non renseigné';
        
        // ===== BADGE CRITIQUE (bloquant) =====
        let criticalBadge = '';
        if (missingCritical.length === 0) {
            criticalBadge = '<span class="badge bg-success ms-2"><i class="fas fa-check-double me-1"></i>Prêt à envoyer</span>';
        } else {
            const missingText = missingCritical.join(', ');
            const badgeClass = missingCritical.length <= 2 ? 'bg-warning text-dark' : 'bg-danger';
            criticalBadge = `<span class="badge ${badgeClass} ms-2"><i class="fas fa-exclamation-triangle me-1"></i>Manquant: ${missingText}</span>`;
        }
        
        // ===== BADGE SIGNATURE =====
        let signatureBadge = '';
        if (missingCritical.length === 0) { // Afficher seulement si les champs critiques sont OK
            if (pvType === 'reception') {
                signatureBadge = signatureReception ? 
                    '<span class="badge bg-success ms-2"><i class="fas fa-check-circle me-1"></i>Signé</span>' : '';
            } else {
                signatureBadge = signatureRetour ? 
                    '<span class="badge bg-success ms-2"><i class="fas fa-check-circle me-1"></i>Signé</span>' : '';
            }
        }
        
        statusDiv.innerHTML = `<strong><i class="fas fa-file-signature me-2"></i>PV ${typeLabel} - ${chantierDisplay}</strong>`;
        detailsDiv.innerHTML = `
            <div class="d-flex align-items-center gap-1 flex-wrap">
                ${criticalBadge}
                ${signatureBadge}
            </div>
        `;
    }
}

/**
 * Formate une date ISO en format français
 */
function formatDateFr(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formate une date ISO en format français avec heure
 */
function formatDateTimeFr(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Affiche une notification
 */
/**
 * Affiche une notification avec barre de progression
 */
function showNotification(type, message, duration = 5000) {
    // Créer le conteneur de notification fixe s'il n'existe pas
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Icône selon le type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'danger':
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'info':
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
            <button type="button" class="notification-close" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="notification-progress">
            <div class="notification-progress-bar"></div>
        </div>
    `;
    
    // Ajouter au conteneur
    container.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Bouton de fermeture
    const closeBtn = notification.querySelector('.notification-close');
    const progressBar = notification.querySelector('.notification-progress-bar');
    
    let startTime = Date.now();
    let animationFrame;
    
    // Fonction pour fermer la notification
    const closeNotification = () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
            // Supprimer le conteneur s'il est vide
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeNotification);
    
    // Animation de la barre de progression
    const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        progressBar.style.width = (100 - progress * 100) + '%';
        
        if (progress < 1) {
            animationFrame = requestAnimationFrame(animateProgress);
        } else {
            closeNotification();
        }
    };
    
    animateProgress();
}


// ========================================
// GESTION DE LA CONFIGURATION SMTP
// ========================================

/**
 * Charge la configuration SMTP au chargement de la page
 */
document.addEventListener('DOMContentLoaded', function() {
    // Charger la configuration SMTP existante
    loadSmtpConfig();
    
    // Gestionnaires d'événements pour le modal SMTP
    const saveSmtpBtn = document.getElementById('saveSmtpBtn');
    const testSmtpBtn = document.getElementById('testSmtpBtn');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const showAdvancedBtn = document.getElementById('showAdvancedSettings');
    
    if (saveSmtpBtn) {
        saveSmtpBtn.addEventListener('click', saveSmtpConfig);
    }
    
    if (testSmtpBtn) {
        testSmtpBtn.addEventListener('click', testSmtpConfig);
    }
    
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('smtp_password');
            const icon = this.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }
    
    // Afficher/masquer les paramètres avancés
    if (showAdvancedBtn) {
        showAdvancedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const advancedSettings = document.getElementById('advancedSettings');
            if (advancedSettings.style.display === 'none') {
                advancedSettings.style.display = 'block';
                this.innerHTML = '<i class="fas fa-cog"></i> Masquer les paramètres avancés';
                
                // Copier les valeurs des champs cachés vers les champs visibles
                document.getElementById('smtp_server_advanced').value = document.getElementById('smtp_server').value;
                document.getElementById('smtp_port_advanced').value = document.getElementById('smtp_port').value;
            } else {
                advancedSettings.style.display = 'none';
                this.innerHTML = '<i class="fas fa-cog"></i> Afficher les paramètres avancés (serveur/port)';
            }
        });
    }
});

/**
 * Charge la configuration SMTP depuis le serveur
 */
async function loadSmtpConfig() {
    try {
        const response = await fetch('/config/smtp');
        const config = await response.json();
        
        if (config) {
            document.getElementById('smtp_server').value = config.smtp_server || 'smtp.gmail.com';
            document.getElementById('smtp_port').value = config.smtp_port || 587;
            document.getElementById('smtp_username').value = config.smtp_username || '';
            document.getElementById('smtp_from_name').value = config.smtp_from_name || 'France Montage';
            
            // Indiquer si un mot de passe est déjà configuré
            if (config.has_password) {
                document.getElementById('passwordStatus').innerHTML = 
                    '<i class="fas fa-check-circle text-success"></i> Mot de passe configuré';
                document.getElementById('smtp_password').placeholder = 'Laisser vide pour conserver le mot de passe actuel';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration SMTP:', error);
    }
}

/**
 * Sauvegarde la configuration SMTP
 */
async function saveSmtpConfig() {
    const form = document.getElementById('smtpConfigForm');
    const alertDiv = document.getElementById('smtpConfigAlert');
    const saveBtn = document.getElementById('saveSmtpBtn');
    
    // Validation
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }
    
    // Si les paramètres avancés sont affichés, copier leurs valeurs dans les champs cachés
    const advancedSettings = document.getElementById('advancedSettings');
    if (advancedSettings && advancedSettings.style.display !== 'none') {
        const serverAdvanced = document.getElementById('smtp_server_advanced').value;
        const portAdvanced = document.getElementById('smtp_port_advanced').value;
        if (serverAdvanced) document.getElementById('smtp_server').value = serverAdvanced;
        if (portAdvanced) document.getElementById('smtp_port').value = portAdvanced;
    }
    
    // Désactiver le bouton pendant la sauvegarde
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    
    try {
        const formData = {
            smtp_server: document.getElementById('smtp_server').value,
            smtp_port: parseInt(document.getElementById('smtp_port').value),
            smtp_username: document.getElementById('smtp_username').value,
            smtp_password: document.getElementById('smtp_password').value.replace(/\s/g, ''), // Supprimer tous les espaces
            smtp_from_name: document.getElementById('smtp_from_name').value
        };
        
        const response = await fetch('/config/smtp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alertDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> ${result.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            
            // Recharger la config pour afficher le statut du mot de passe
            setTimeout(() => {
                loadSmtpConfig();
            }, 500);
        } else {
            alertDiv.innerHTML = `
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-circle"></i> ${result.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    } catch (error) {
        alertDiv.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle"></i> Erreur lors de la sauvegarde: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    } finally {
        // Réactiver le bouton
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
    }
}

/**
 * Teste la connexion SMTP
 */
async function testSmtpConfig() {
    const alertDiv = document.getElementById('smtpConfigAlert');
    const testBtn = document.getElementById('testSmtpBtn');
    
    // Récupérer les valeurs du formulaire
    const smtpServer = document.getElementById('smtp_server_advanced')?.value || document.getElementById('smtp_server').value;
    const smtpPort = document.getElementById('smtp_port_advanced')?.value || document.getElementById('smtp_port').value;
    const smtpUsername = document.getElementById('smtp_username').value;
    const smtpPassword = document.getElementById('smtp_password').value;
    
    // Vérifier que les champs sont remplis
    if (!smtpUsername || !smtpPassword) {
        alertDiv.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-triangle"></i> Veuillez remplir l'email et le mot de passe avant de tester.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        return;
    }
    
    // Désactiver le bouton pendant le test
    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test en cours...';
    
    try {
        const response = await fetch('/config/smtp/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                smtp_server: smtpServer,
                smtp_port: smtpPort,
                smtp_username: smtpUsername,
                smtp_password: smtpPassword
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alertDiv.innerHTML = `
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <i class="fas fa-check-circle"></i> ${result.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        } else {
            alertDiv.innerHTML = `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-triangle"></i> ${result.message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
        }
    } catch (error) {
        alertDiv.innerHTML = `
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="fas fa-exclamation-circle"></i> Erreur lors du test: ${error.message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
    } finally {
        // Réactiver le bouton
        testBtn.disabled = false;
        testBtn.innerHTML = '<i class="fas fa-flask"></i> Tester la connexion';
    }
}

/**
 * ========================================
 * GESTION DES CHAMPS SELECT2
 * ========================================
 */

/**
 * Initialise les champs Select2 avec les données de l'historique et de la base de données
 */
function initializeSelect2Fields() {
    // Extraire les valeurs uniques depuis les PV de la base de données
    const fieldData = {
        'chantier': [],
        'email_conducteur': [],
        'email_entreprise': [],
        'materiel_numero': [],
        'materiel_type': [],
        'fournisseur': [],
        'responsable': []
    };
    
    // Remplir avec les données des PV existants
    if (allPVData && allPVData.length > 0) {
        allPVData.forEach(pv => {
            // Chantier
            if (pv.chantier && pv.chantier.trim()) {
                fieldData['chantier'].push(pv.chantier.trim());
            }
            
            // Email conducteur (peut être string ou array)
            if (pv.email_conducteur) {
                if (Array.isArray(pv.email_conducteur)) {
                    pv.email_conducteur.forEach(email => {
                        if (email && email.trim()) fieldData['email_conducteur'].push(email.trim());
                    });
                } else if (typeof pv.email_conducteur === 'string') {
                    // Peut contenir plusieurs emails séparés par virgule
                    pv.email_conducteur.split(',').forEach(email => {
                        if (email && email.trim()) fieldData['email_conducteur'].push(email.trim());
                    });
                }
            }
            
            // Email entreprise
            if (pv.email_entreprise && pv.email_entreprise.trim()) {
                fieldData['email_entreprise'].push(pv.email_entreprise.trim());
            }
            
            // Matériel numéro
            if (pv.materiel_numero && pv.materiel_numero.trim()) {
                fieldData['materiel_numero'].push(pv.materiel_numero.trim());
            }
            
            // Matériel type
            if (pv.materiel_type && pv.materiel_type.trim()) {
                fieldData['materiel_type'].push(pv.materiel_type.trim());
            }
            
            // Fournisseur
            if (pv.fournisseur && pv.fournisseur.trim()) {
                fieldData['fournisseur'].push(pv.fournisseur.trim());
            }
            
            // Responsable
            if (pv.responsable && pv.responsable.trim()) {
                fieldData['responsable'].push(pv.responsable.trim());
            }
        });
        
        // Supprimer les doublons et trier
        Object.keys(fieldData).forEach(key => {
            fieldData[key] = [...new Set(fieldData[key])].sort((a, b) => 
                a.toLowerCase().localeCompare(b.toLowerCase())
            );
        });
    }
    
    // Initialiser chaque champ Select2
    HISTORY_FIELDS.forEach(fieldId => {
        const $field = $(`#${fieldId}`);
        if ($field.length === 0) return;
        
        // Charger les données de l'historique localStorage
        const historyData = getFieldHistory(fieldId);
        
        // Combiner les données de la DB avec l'historique (sans doublons)
        const dbData = fieldData[fieldId] || [];
        const allData = [...new Set([...dbData, ...historyData])];
        
        // Ajouter les options au select
        allData.forEach(value => {
            if (value && value.trim()) {
                $field.append(new Option(value, value, false, false));
            }
        });
        
        // Initialiser le champ
        initSingleSelect2Field($field, fieldId, fieldData);
        
        // Charger la valeur par défaut pour email_entreprise
        if (fieldId === 'email_entreprise' && historyData.length > 0) {
            $field.val(historyData[0]).trigger('change');
        }
    });
}

/**
 * Met à jour les options Select2 depuis la base de données sans réinitialiser les valeurs
 */
function updateSelect2FieldsFromDB() {
    // Extraire les valeurs uniques depuis les PV de la base de données
    const fieldData = {
        'chantier': [],
        'email_conducteur': [],
        'email_entreprise': [],
        'materiel_numero': [],
        'materiel_type': [],
        'fournisseur': [],
        'responsable': []
    };
    
    // Remplir avec les données des PV existants
    if (allPVData && allPVData.length > 0) {
        allPVData.forEach(pv => {
            // Chantier
            if (pv.chantier && pv.chantier.trim()) {
                fieldData['chantier'].push(pv.chantier.trim());
            }
            
            // Email conducteur (peut être string ou array)
            if (pv.email_conducteur) {
                if (Array.isArray(pv.email_conducteur)) {
                    pv.email_conducteur.forEach(email => {
                        if (email && email.trim()) fieldData['email_conducteur'].push(email.trim());
                    });
                } else if (typeof pv.email_conducteur === 'string') {
                    // Peut contenir plusieurs emails séparés par virgule
                    pv.email_conducteur.split(',').forEach(email => {
                        if (email && email.trim()) fieldData['email_conducteur'].push(email.trim());
                    });
                }
            }
            
            // Email entreprise
            if (pv.email_entreprise && pv.email_entreprise.trim()) {
                fieldData['email_entreprise'].push(pv.email_entreprise.trim());
            }
            
            // Matériel numéro
            if (pv.materiel_numero && pv.materiel_numero.trim()) {
                fieldData['materiel_numero'].push(pv.materiel_numero.trim());
            }
            
            // Matériel type
            if (pv.materiel_type && pv.materiel_type.trim()) {
                fieldData['materiel_type'].push(pv.materiel_type.trim());
            }
            
            // Fournisseur
            if (pv.fournisseur && pv.fournisseur.trim()) {
                fieldData['fournisseur'].push(pv.fournisseur.trim());
            }
            
            // Responsable
            if (pv.responsable && pv.responsable.trim()) {
                fieldData['responsable'].push(pv.responsable.trim());
            }
        });
        
        // Supprimer les doublons et trier
        Object.keys(fieldData).forEach(key => {
            fieldData[key] = [...new Set(fieldData[key])].sort((a, b) => 
                a.toLowerCase().localeCompare(b.toLowerCase())
            );
        });
    }
    
    // Mettre à jour chaque champ Select2
    HISTORY_FIELDS.forEach(fieldId => {
        const $field = $(`#${fieldId}`);
        if ($field.length === 0 || !$field.hasClass('select2-hidden-accessible')) return;
        
        // Sauvegarder la valeur actuelle
        const currentValue = $field.val();
        
        // Récupérer toutes les options existantes
        const existingOptions = [];
        $field.find('option').each(function() {
            const val = $(this).val();
            if (val) existingOptions.push(val);
        });
        
        // Combiner avec les nouvelles données de la DB
        const dbData = fieldData[fieldId] || [];
        const allOptions = [...new Set([...dbData, ...existingOptions])];
        
        // Vider et repeupler les options
        $field.empty();
        allOptions.forEach(value => {
            if (value && value.trim()) {
                $field.append(new Option(value, value, false, false));
            }
        });
        
        // Restaurer la valeur
        if (currentValue) {
            $field.val(currentValue).trigger('change.select2');
        }
    });
}

/**
 * Initialise un seul champ Select2
 */
function initSingleSelect2Field($field, fieldId, fieldData) {
    // Vérifier si c'est un champ multiple
    const isMultiple = $field.prop('multiple');
    
    // Initialiser Select2 avec la fonction tags et template personnalisé
    $field.select2({
        theme: 'bootstrap-5',
        tags: true,
        multiple: isMultiple,
        placeholder: `Sélectionnez ou tapez ${$field.prev('label').text().replace('*', '').trim()}`,
        allowClear: !$field.prop('required'),
        width: '100%',
        createTag: function (params) {
            const term = $.trim(params.term);
            if (term === '') {
                return null;
            }
            return {
                id: term,
                text: term,
                newTag: true
            };
        },
        templateResult: function(data) {
            if (!data.id) {
                return data.text;
            }
            
            // Retourner simplement le texte sans bouton de suppression
            return data.text;
        }
    });
    
    // Sauvegarder dans l'historique quand la valeur change
    $field.off('change.history').on('change.history', function() {
        const value = $(this).val();
        if (value) {
            // Gérer les selects multiples
            if (Array.isArray(value)) {
                value.forEach(v => {
                    if (v && v.trim && v.trim()) {
                        saveToFieldHistory(fieldId, v.trim());
                    }
                });
            } else if (value.trim && value.trim()) {
                saveToFieldHistory(fieldId, value.trim());
            }
        }
    });
    
    // Déclencher une auto-sauvegarde immédiate après changement Select2
    $field.off('select2:select').on('select2:select', function(e) {
        performAutoSave();
        // Fermer et rouvrir pour rafraîchir les styles
        if (isMultiple) {
            const wasOpen = $field.data('select2').isOpen();
            if (wasOpen) {
                setTimeout(() => {
                    $field.select2('close');
                    setTimeout(() => {
                        $field.select2('open');
                    }, 50);
                }, 10);
            }
        }
    });
    
    $field.off('select2:unselect').on('select2:unselect', function(e) {
        performAutoSave();
        // Fermer et rouvrir pour rafraîchir les styles
        if (isMultiple) {
            const wasOpen = $field.data('select2').isOpen();
            if (wasOpen) {
                setTimeout(() => {
                    $field.select2('close');
                    setTimeout(() => {
                        $field.select2('open');
                    }, 50);
                }, 10);
            }
        }
    });
    
    $field.off('select2:clear').on('select2:clear', function() {
        performAutoSave();
    });
}

/**
 * ========================================
 * GESTION DE L'HISTORIQUE DES CHAMPS
 * ========================================
 */

/**
 * Initialise la gestion de l'email entreprise - synchronise le champ global avec le formulaire
 */
function initializeEmailEntreprise() {
    const globalEmailField = $('#global_email_entreprise');
    const formEmailField = $('#email_entreprise');
    
    if (!globalEmailField.length) return;
    
    // Initialiser Select2 sur le champ global
    const history = getFieldHistory('email_entreprise');
    history.forEach(value => {
        if (value && value.trim()) {
            globalEmailField.append(new Option(value, value, false, false));
        }
    });
    
    initSingleSelect2Field(globalEmailField, 'global_email_entreprise', {});
    
    // Charger le dernier email utilisé
    if (history.length > 0) {
        globalEmailField.val(history[0]).trigger('change');
        // Pré-remplir aussi le champ du formulaire
        if (formEmailField.length) {
            formEmailField.val(history[0]).trigger('change');
        }
    }
    
    // Synchroniser : quand on change le champ global, mettre à jour le champ du formulaire
    globalEmailField.on('change', function() {
        const selectedValue = $(this).val();
        if (selectedValue && formEmailField.length) {
            formEmailField.val(selectedValue).trigger('change');
        }
    });
    
    // Synchroniser dans l'autre sens : quand on change le champ du formulaire, mettre à jour le global
    formEmailField.on('change', function() {
        const selectedValue = $(this).val();
        if (selectedValue && globalEmailField.length && globalEmailField.val() !== selectedValue) {
            // Vérifier si la valeur existe dans les options du champ global
            if (globalEmailField.find(`option[value="${selectedValue}"]`).length === 0) {
                // Ajouter l'option si elle n'existe pas
                globalEmailField.append(new Option(selectedValue, selectedValue, false, false));
            }
            globalEmailField.val(selectedValue).trigger('change');
        }
    });
}

/**
 * Initialise le système d'historique pour les champs avec autocomplétion
 */
function initializeFieldHistory() {
    HISTORY_FIELDS.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        const dropdown = document.getElementById(`${fieldId}_dropdown`);
        
        if (!field || !dropdown) return;
        
        // Afficher le dropdown au focus
        field.addEventListener('focus', function() {
            showDropdown(fieldId);
        });
        
        // Filtrer au fur et à mesure de la frappe
        field.addEventListener('input', function() {
            showDropdown(fieldId, this.value);
        });
        
        // Sauvegarder quand on quitte le champ
        field.addEventListener('blur', function(e) {
            // Délai pour permettre le clic sur un élément du dropdown
            setTimeout(() => {
                // Vérifier si le dropdown est toujours visible (peut avoir été rouvert par un clic de suppression)
                const dropdown = document.getElementById(`${fieldId}_dropdown`);
                const isDropdownHovered = dropdown && dropdown.matches(':hover');
                
                // Ne pas fermer si la souris est sur le dropdown
                if (!isDropdownHovered) {
                    const value = this.value.trim();
                    if (value) {
                        saveToFieldHistory(fieldId, value);
                    }
                    hideDropdown(fieldId);
                }
            }, 200);
        });
    });
    
    // Fermer les dropdowns si on clique ailleurs
    document.addEventListener('click', function(e) {
        // Ne pas fermer si on clique sur un dropdown ou un bouton de suppression
        if (!e.target.closest('.position-relative') && !e.target.closest('.autocomplete-dropdown')) {
            HISTORY_FIELDS.forEach(fieldId => {
                hideDropdown(fieldId);
            });
        }
    });
}

/**
 * Affiche le dropdown avec l'historique filtré
 * @param {string} fieldId - L'ID du champ
 * @param {string} filter - Texte de filtrage (optionnel)
 */
function showDropdown(fieldId, filter = '') {
    const dropdown = document.getElementById(`${fieldId}_dropdown`);
    if (!dropdown) return;
    
    let history = getFieldHistory(fieldId);
    
    // Filtrer si nécessaire
    if (filter) {
        const filterLower = filter.toLowerCase();
        history = history.filter(item => item.toLowerCase().includes(filterLower));
    }
    
    dropdown.innerHTML = '';
    
    if (history.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'autocomplete-empty';
        empty.innerHTML = filter 
            ? '<i class="fas fa-search"></i> Aucun résultat'
            : '<i class="fas fa-info-circle"></i> Tapez pour enregistrer une nouvelle valeur';
        dropdown.appendChild(empty);
        dropdown.style.display = 'block';
        return;
    }
    
    history.forEach(value => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        
        const text = document.createElement('span');
        text.className = 'autocomplete-item-text';
        text.textContent = value;
        text.addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById(fieldId).value = value;
            hideDropdown(fieldId);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'autocomplete-item-delete';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = 'Supprimer cette valeur';
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteFromFieldHistory(fieldId, value);
            // Récupérer le filtre actuel du champ
            const currentFilter = document.getElementById(fieldId)?.value || '';
            showDropdown(fieldId, currentFilter);
        });
        
        item.appendChild(text);
        item.appendChild(deleteBtn);
        dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
}

/**
 * Cache le dropdown
 * @param {string} fieldId - L'ID du champ
 */
function hideDropdown(fieldId) {
    const dropdown = document.getElementById(`${fieldId}_dropdown`);
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

/**
 * Récupère l'historique d'un champ depuis le localStorage
 * @param {string} fieldId - L'ID du champ
 * @returns {Array} - Tableau des valeurs historiques
 */
function getFieldHistory(fieldId) {
    try {
        const history = localStorage.getItem(`field_history_${fieldId}`);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'historique pour ${fieldId}:`, error);
        return [];
    }
}

/**
 * Sauvegarde une valeur dans l'historique d'un champ
 * @param {string} fieldId - L'ID du champ
 * @param {string} value - La valeur à sauvegarder
 */
function saveToFieldHistory(fieldId, value) {
    if (!value || value.trim() === '') return;
    
    try {
        let history = getFieldHistory(fieldId);
        
        // Supprimer l'ancienne occurrence si elle existe
        history = history.filter(item => item !== value);
        
        // Ajouter au début
        history.unshift(value);
        
        // Limiter à 50 valeurs
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        localStorage.setItem(`field_history_${fieldId}`, JSON.stringify(history));
    } catch (error) {
        console.error(`Erreur lors de la sauvegarde de l'historique pour ${fieldId}:`, error);
    }
}

/**
 * Supprime une valeur de l'historique d'un champ
 * @param {string} fieldId - L'ID du champ
 * @param {string} value - La valeur à supprimer
 */
function deleteFromFieldHistory(fieldId, value) {
    try {
        let history = getFieldHistory(fieldId);
        history = history.filter(item => item !== value);
        localStorage.setItem(`field_history_${fieldId}`, JSON.stringify(history));
    } catch (error) {
        console.error(`Erreur lors de la suppression de l'historique pour ${fieldId}:`, error);
    }
}

/**
 * Gère le bouton de navigation scroll (haut/bas de page)
 */
function initScrollNavigation() {
    const scrollBtn = document.getElementById('scrollNavBtn');
    const scrollIcon = document.getElementById('scrollNavIcon');
    
    if (!scrollBtn || !scrollIcon) return;
    
    let isAtBottom = false;
    
    // Fonction pour vérifier si on est en bas de page
    function checkScrollPosition() {
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollBottom = scrollTop + windowHeight;
        
        // Considérer qu'on est en bas si on est à moins de 100px du bas
        isAtBottom = (documentHeight - scrollBottom) < 100;
        
        // Afficher le bouton si on a scrollé plus de 300px
        if (scrollTop > 300) {
            scrollBtn.style.display = 'flex';
            
            // Changer l'icône selon la position
            if (isAtBottom) {
                scrollIcon.className = 'fas fa-chevron-up';
            } else {
                scrollIcon.className = 'fas fa-chevron-down';
            }
        } else {
            scrollBtn.style.display = 'none';
        }
    }
    
    // Fonction pour scroller
    function handleScroll() {
        if (isAtBottom) {
            // Scroller vers le haut
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            // Scroller vers le bas
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }
    }
    
    // Événements
    window.addEventListener('scroll', checkScrollPosition);
    scrollBtn.addEventListener('click', handleScroll);
    
    // Vérification initiale
    checkScrollPosition();
}

/**
 * Ouvre le sélecteur de fichier pour ajouter des photos à un élément d'inspection
 * @param {string} fieldName - Le nom du champ (ex: 'carrosserie', 'eclairage', etc.)
 */
function openPhotoModal(fieldName) {
    // Déterminer le type de PV actif (réception ou retour)
    const pvType = document.querySelector('input[name="pv_type"]:checked')?.value || 'reception';
    
    // Trouver l'input file correspondant directement par son ID
    const inputId = `photo_${fieldName}_${pvType}`;
    const fileInput = document.getElementById(inputId);
    
    if (!fileInput) {
        console.error(`File input ${inputId} not found`);
        return;
    }
    
    // Déclencher le click pour ouvrir le sélecteur
    fileInput.click();
}

/**
 * Met à jour l'affichage des photos dans la colonne Élément
 * @param {string} fieldName - Le nom du champ
 * @param {string} pvType - Le type de PV (reception ou retour)
 */
function updatePhotoPreview(fieldName, pvType) {
    const previewContainer = document.getElementById(`photos_preview_${fieldName}`);
    if (!previewContainer) return;
    
    // Récupérer toutes les photos des deux types
    const receptionContainer = document.getElementById(`photos_${fieldName}_reception`);
    const retourContainer = document.getElementById(`photos_${fieldName}_retour`);
    
    // Vider le container
    previewContainer.innerHTML = '';
    
    // Fonction pour ajouter les aperçus d'un container
    const addPreviews = (container, type) => {
        if (!container) return;
        const photoItems = container.querySelectorAll('.photo-item');
        photoItems.forEach((item, index) => {
            const preview = item.querySelector('.photo-preview img');
            if (preview && preview.src) {
                const previewItem = document.createElement('div');
                previewItem.className = 'photo-preview-item';
                previewItem.title = type === 'reception' ? 'Réception' : 'Retour';
                
                const img = document.createElement('img');
                img.src = preview.src;
                img.alt = `Photo ${type}`;
                
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-photo';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    item.remove();
                    updatePhotoPreview(fieldName, pvType);
                };
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                previewContainer.appendChild(previewItem);
            }
        });
    };
    
    addPreviews(receptionContainer, 'reception');
    addPreviews(retourContainer, 'retour');
}

// ============================================================================
// GESTION VGP (Vérification Générale Périodique)
// ============================================================================

/**
 * Upload du document VGP
 */
async function uploadVGPDocument(pvId, file) {
    if (!pvId || !file) return false;
    
    try {
        const formData = new FormData();
        formData.append('vgp_document', file);
        
        const response = await fetch(`/upload-vgp-document/${pvId}`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Afficher le lien du document
            const vgpDocLink = document.getElementById('vgp_document_link');
            const vgpDocCurrent = document.getElementById('vgp_document_current');
            if (vgpDocLink && vgpDocCurrent) {
                vgpDocLink.href = `/vgp-document/${pvId}`;
                vgpDocCurrent.style.display = 'block';
            }
            return true;
        } else {
            console.error('Erreur upload VGP:', data.message);
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de l\'upload du document VGP:', error);
        return false;
    }
}

/**
 * Calcule le statut VGP basé sur la date
 * @param {string} vgpDate - Date au format YYYY-MM-DD
 * @returns {object} - {status: 'valid'|'warning'|'expired'|'none', daysRemaining: number, expiryDate: Date}
 */
function calculateVGPStatus(vgpDate) {
    if (!vgpDate) {
        return { status: 'none', daysRemaining: null, expiryDate: null };
    }
    
    const vgp = new Date(vgpDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // VGP valide 6 mois (180 jours)
    const expiryDate = new Date(vgp);
    expiryDate.setDate(expiryDate.getDate() + 180);
    
    // Alerte 3 semaines avant (21 jours)
    const warningDate = new Date(expiryDate);
    warningDate.setDate(warningDate.getDate() - 21);
    
    const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (today > expiryDate) {
        return { status: 'expired', daysRemaining, expiryDate };
    } else if (today >= warningDate) {
        return { status: 'warning', daysRemaining, expiryDate };
    } else {
        return { status: 'valid', daysRemaining, expiryDate };
    }
}

/**
 * Met à jour l'indicateur visuel VGP
 */
function updateVGPIndicator() {
    const vgpDateInput = document.getElementById('vgp_date');
    const badge = document.getElementById('vgp_status_badge');
    const nextDateSpan = document.getElementById('vgp_next_date');
    
    if (!vgpDateInput || !badge || !nextDateSpan) return;
    
    const vgpDate = vgpDateInput.value;
    const vgpStatus = calculateVGPStatus(vgpDate);
    
    // Masquer le badge si pas de date
    if (vgpStatus.status === 'none') {
        badge.style.display = 'none';
        nextDateSpan.textContent = '';
        return;
    }
    
    // Afficher et mettre à jour le badge
    badge.style.display = 'inline-block';
    badge.className = 'badge vgp-status-badge';
    
    const expiryDateStr = vgpStatus.expiryDate.toLocaleDateString('fr-FR');
    
    switch (vgpStatus.status) {
        case 'valid':
            badge.classList.add('bg-success');
            badge.innerHTML = '<i class="fas fa-check-circle"></i> Contrôle à jour';
            nextDateSpan.textContent = `Valide jusqu'au ${expiryDateStr} (${vgpStatus.daysRemaining} jours restants)`;
            nextDateSpan.className = 'text-success small';
            break;
        case 'warning':
            badge.classList.add('bg-warning', 'text-dark');
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> À renouveler';
            nextDateSpan.textContent = `Échéance le ${expiryDateStr} (${vgpStatus.daysRemaining} jours restants)`;
            nextDateSpan.className = 'text-warning small';
            break;
        case 'expired':
            badge.classList.add('bg-danger');
            badge.innerHTML = '<i class="fas fa-times-circle"></i> Contrôle échu';
            nextDateSpan.textContent = `Échu depuis ${Math.abs(vgpStatus.daysRemaining)} jours (échéance : ${expiryDateStr})`;
            nextDateSpan.className = 'text-danger small fw-bold';
            break;
    }
}

/**
 * Initialise la gestion VGP
 */
function initializeVGP() {
    const vgpDateInput = document.getElementById('vgp_date');
    const vgpAdminBtn = document.getElementById('vgpAdminBtn');
    const vgpAlertViewBtn = document.getElementById('vgpAlertViewBtn');
    
    // Écouter les changements de date VGP
    if (vgpDateInput) {
        vgpDateInput.addEventListener('change', updateVGPIndicator);
    }
    
    // Bouton administration VGP
    if (vgpAdminBtn) {
        vgpAdminBtn.addEventListener('click', openVGPAdminModal);
    }
    
    // Bouton "Voir les détails" dans l'alerte
    if (vgpAlertViewBtn) {
        vgpAlertViewBtn.addEventListener('click', openVGPAdminModal);
    }
}

/**
 * Vérifie et affiche les alertes VGP au chargement
 */
async function checkVGPAlerts() {
    try {
        const response = await fetch('/list-pv');
        const data = await response.json();
        
        if (!data.success) return;
        
        const pvList = data.pv_list;
        
        // Compter les VGP échues et à renouveler
        let expiredCount = 0;
        let warningCount = 0;
        
        pvList.forEach(pv => {
            const vgpStatus = calculateVGPStatus(pv.vgp_date);
            if (vgpStatus.status === 'expired') {
                expiredCount++;
            } else if (vgpStatus.status === 'warning') {
                warningCount++;
            }
        });
        
        // Afficher l'alerte si nécessaire
        const alertBanner = document.getElementById('vgpAlertBanner');
        const alertTitle = document.getElementById('vgpAlertTitle');
        const alertMessage = document.getElementById('vgpAlertMessage');
        
        if (!alertBanner || !alertTitle || !alertMessage) return;
        
        if (expiredCount > 0) {
            // Alerte critique (rouge)
            alertBanner.className = 'alert alert-danger alert-dismissible fade show mb-3';
            alertBanner.style.borderLeft = '5px solid #dc3545';
            alertTitle.innerHTML = '<i class="fas fa-exclamation-circle"></i> Alerte VGP Critique !';
            alertMessage.innerHTML = `<strong>${expiredCount}</strong> contrôle(s) VGP échu(s) ! ` +
                (warningCount > 0 ? `Et <strong>${warningCount}</strong> à renouveler sous 3 semaines.` : '') +
                ` <strong>Action requise immédiatement.</strong>`;
            alertBanner.style.display = 'block';
        } else if (warningCount > 0) {
            // Alerte importante (orange)
            alertBanner.className = 'alert alert-warning alert-dismissible fade show mb-3';
            alertBanner.style.borderLeft = '5px solid #ffc107';
            alertTitle.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Attention : VGP à renouveler';
            alertMessage.innerHTML = `<strong>${warningCount}</strong> contrôle(s) VGP à renouveler dans les 3 prochaines semaines.`;
            alertBanner.style.display = 'block';
        } else {
            // Pas d'alerte
            alertBanner.style.display = 'none';
        }
        
        // Mettre à jour le badge du bouton Administration VGP
        const vgpAdminBtn = document.getElementById('vgpAdminBtn');
        if (vgpAdminBtn && (expiredCount > 0 || warningCount > 0)) {
            const totalAlerts = expiredCount + warningCount;
            vgpAdminBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Administration VGP <span class="badge bg-danger ms-1">${totalAlerts}</span>`;
        }
        
    } catch (error) {
        console.error('Erreur lors de la vérification des alertes VGP:', error);
    }
}

/**
 * Ouvre le modal d'administration VGP
 */
async function openVGPAdminModal() {
    const modal = new bootstrap.Modal(document.getElementById('vgpAdminModal'));
    
    try {
        // Charger tous les PV
        const response = await fetch('/list-pv');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Erreur lors du chargement');
        }
        
        const pvList = data.pv_list;
        
        // Catégoriser les PV par statut VGP
        const categories = {
            expired: [],
            warning: [],
            valid: [],
            none: []
        };
        
        pvList.forEach(pv => {
            const vgpStatus = calculateVGPStatus(pv.vgp_date);
            categories[vgpStatus.status].push({ pv, vgpStatus });
        });
        
        // Remplir les tableaux
        populateVGPTable('vgpExpiredList', categories.expired, 'expired');
        populateVGPTable('vgpWarningList', categories.warning, 'warning');
        populateVGPTable('vgpValidList', categories.valid, 'valid');
        populateVGPTable('vgpNoneList', categories.none, 'none');
        
        // Mettre à jour les compteurs
        document.getElementById('vgpExpiredCount').textContent = categories.expired.length;
        document.getElementById('vgpWarningCount').textContent = categories.warning.length;
        document.getElementById('vgpValidCount').textContent = categories.valid.length;
        document.getElementById('vgpNoneCount').textContent = categories.none.length;
        
        modal.show();
    } catch (error) {
        console.error('Erreur lors du chargement des PV VGP:', error);
        alert('Erreur lors du chargement des données VGP');
    }
}

/**
 * Remplit un tableau VGP
 */
function populateVGPTable(tableId, items, type) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (items.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = type === 'none' ? 6 : 8;
        cell.className = 'text-center text-muted py-3';
        cell.innerHTML = '<i class="fas fa-inbox"></i> Aucun PV dans cette catégorie';
        return;
    }
    
    items.forEach(({ pv, vgpStatus }) => {
        const row = tbody.insertRow();
        row.className = 'align-middle';
        
        // Chantier
        row.insertCell().textContent = pv.chantier || '-';
        
        // Matériel
        row.insertCell().textContent = pv.materiel_type || '-';
        
        // N° Série
        row.insertCell().textContent = pv.materiel_numero || '-';
        
        // Fournisseur
        row.insertCell().textContent = pv.fournisseur || '-';
        
        if (type === 'none') {
            // Date Réception
            row.insertCell().textContent = pv.date_reception ? new Date(pv.date_reception).toLocaleDateString('fr-FR') : '-';
        } else {
            // Date VGP
            const vgpDateCell = row.insertCell();
            vgpDateCell.textContent = pv.vgp_date ? new Date(pv.vgp_date).toLocaleDateString('fr-FR') : '-';
            
            // Statut
            const statusCell = row.insertCell();
            if (vgpStatus.expiryDate) {
                const expiryStr = vgpStatus.expiryDate.toLocaleDateString('fr-FR');
                const days = Math.abs(vgpStatus.daysRemaining);
                
                switch (type) {
                    case 'expired':
                        statusCell.innerHTML = `<span class="text-danger fw-bold">Depuis ${days} jours</span>`;
                        break;
                    case 'warning':
                        statusCell.innerHTML = `<span class="text-warning fw-bold">${days} jours</span>`;
                        break;
                    case 'valid':
                        statusCell.textContent = expiryStr;
                        break;
                }
            }
            
            // Document
            const docCell = row.insertCell();
            if (pv.vgp_document_path) {
                docCell.innerHTML = `<a href="/vgp-document/${pv.id}" target="_blank" class="btn btn-sm btn-outline-danger">
                    <i class="fas fa-file-pdf"></i> PDF
                </a>`;
            } else {
                docCell.innerHTML = '<span class="text-muted">-</span>';
            }
        }
        
        // Actions
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-outline-primary" onclick="loadPVById('${pv.id}')">
                <i class="fas fa-edit"></i> Modifier
            </button>
        `;
    });
}

/**
 * ID du PV à supprimer (variable globale pour le modal)
 */
let pendingDeletePVId = null;

/**
 * Demande de suppression avec mot de passe
 */
function requestDeletePV(pvId, pvInfo) {
    pendingDeletePVId = pvId;
    
    const modal = new bootstrap.Modal(document.getElementById('deletePasswordModal'));
    const infoElem = document.getElementById('deletePVInfo');
    const errorElem = document.getElementById('deletePasswordError');
    const passwordInput = document.getElementById('deletePassword');
    
    // Afficher les infos du PV
    if (infoElem) {
        infoElem.innerHTML = `<strong>PV à supprimer :</strong><br>${pvInfo}`;
    }
    
    // Réinitialiser
    if (errorElem) {
        errorElem.classList.add('d-none');
        errorElem.textContent = '';
    }
    if (passwordInput) {
        passwordInput.value = '';
    }
    
    modal.show();
}

/**
 * Confirme la suppression après vérification du mot de passe
 */
async function confirmDeletePV() {
    const passwordInput = document.getElementById('deletePassword');
    const errorElem = document.getElementById('deletePasswordError');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (!passwordInput || !pendingDeletePVId) return;
    
    const password = passwordInput.value.trim();
    
    // Vérifier le mot de passe
    if (password !== 'FMO') {
        if (errorElem) {
            errorElem.textContent = 'Mot de passe incorrect. Veuillez réessayer.';
            errorElem.classList.remove('d-none');
        }
        passwordInput.value = '';
        passwordInput.focus();
        return;
    }
    
    // Mot de passe correct, supprimer le PV
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Suppression...';
    }
    
    try {
        const response = await fetch(`/delete-pv/${pendingDeletePVId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Fermer le modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deletePasswordModal'));
            if (modal) modal.hide();
            
            // Recharger la liste
            await loadSavedPVList();
            
            // Si c'est le PV actuellement chargé, réinitialiser le formulaire
            if (currentPVId === pendingDeletePVId) {
                resetForm();
            }
            
            showNotification('PV supprimé avec succès', 'success');
        } else {
            throw new Error('Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('Erreur:', error);
        if (errorElem) {
            errorElem.textContent = 'Erreur lors de la suppression. Veuillez réessayer.';
            errorElem.classList.remove('d-none');
        }
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Supprimer définitivement';
        }
        pendingDeletePVId = null;
    }
}

// Initialiser la VGP au chargement
document.addEventListener('DOMContentLoaded', function() {
    initializeVGP();
    
    // Bouton de confirmation de suppression
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeletePV);
    }
    
    
    // Reset du mot de passe quand le modal se ferme
    const deleteModal = document.getElementById('deletePasswordModal');
    if (deleteModal) {
        deleteModal.addEventListener('hidden.bs.modal', function() {
            const passwordInput = document.getElementById('deletePassword');
            const errorElem = document.getElementById('deletePasswordError');
            if (passwordInput) passwordInput.value = '';
            if (errorElem) {
                errorElem.classList.add('d-none');
                errorElem.textContent = '';
            }
            pendingDeletePVId = null;
        });
    }
    
    // Initialiser les contrôles de version
    initializeVersionControls();
});


// ============================================
// GESTION DES VERSIONS
// ============================================

let currentPVVersions = [];
let currentVersionNumber = 1;
let isOnCurrentVersion = true; // Track si on est sur la version actuelle ou une version antérieure

/**
 * Initialise les contrôles de navigation entre versions
 */
function initializeVersionControls() {
    const versionSelect = document.getElementById('versionSelect');
    const prevBtn = document.getElementById('prevVersionBtn');
    const nextBtn = document.getElementById('nextVersionBtn');
    
    if (!versionSelect) return;
    
    // Événement sur le sélecteur
    versionSelect.addEventListener('change', async function() {
        const selectedVersion = parseInt(this.value);
        if (selectedVersion && currentPVId) {
            // Avant de changer de version, sauvegarder les modifications si on est sur la version actuelle
            await saveBeforeVersionChange();
            await loadPVVersion(currentPVId, selectedVersion);
        }
    });
    
    // Bouton version précédente
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            const currentIndex = versionSelect.selectedIndex;
            if (currentIndex < versionSelect.options.length - 1) {
                versionSelect.selectedIndex = currentIndex + 1;
                versionSelect.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // Bouton version suivante
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const currentIndex = versionSelect.selectedIndex;
            if (currentIndex > 0) {
                versionSelect.selectedIndex = currentIndex - 1;
                versionSelect.dispatchEvent(new Event('change'));
            }
        });
    }
}

/**
 * Charge les versions disponibles pour un PV
 */
async function loadPVVersions(pvId) {
    try {
        const response = await fetch(`/pv-versions/${pvId}`);
        const data = await response.json();
        
        if (!data.success) {
            console.error('Erreur lors du chargement des versions');
            return;
        }
        
        currentPVId = pvId;
        currentPVVersions = data.versions;
        currentVersionNumber = data.current_version;
        
        // Afficher le sélecteur si plus d'une version
        const versionSelector = document.getElementById('versionSelector');
        if (versionSelector) {
            if (currentPVVersions.length > 1) {
                versionSelector.style.display = 'block';
                updateVersionSelector();
            } else {
                versionSelector.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des versions:', error);
    }
}

/**
 * Met à jour le contenu du sélecteur de versions
 */
function updateVersionSelector() {
    const versionSelect = document.getElementById('versionSelect');
    
    if (!versionSelect) return;
    
    // Vider et remplir le sélecteur
    versionSelect.innerHTML = '';
    
    currentPVVersions.forEach(version => {
        const option = document.createElement('option');
        option.value = version.version_number;
        const label = version.is_current ? 
            `Version ${version.version_number} - ${version.date_creation} (Actuelle)` :
            `Version ${version.version_number} - ${version.date_creation}`;
        option.textContent = label;
        if (version.is_current || version.version_number === currentVersionNumber) {
            option.selected = true;
        }
        versionSelect.appendChild(option);
    });
}

/**
 * Charge une version spécifique d'un PV
 */
/**
 * Sauvegarde les modifications avant de changer de version
 */
async function saveBeforeVersionChange() {
    // Ne sauvegarder que si on est sur la version actuelle (pas sur une version antérieure en lecture seule)
    if (!isOnCurrentVersion) {
        return;
    }
    
    // Si un auto-save est planifié, l'annuler et sauvegarder immédiatement
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
    
    // Attendre que l'auto-save en cours se termine
    if (isAutoSaving) {
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (!isAutoSaving) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }
    
    // Si on est sur la version actuelle et qu'il y a des modifications, sauvegarder
    const chantier = document.getElementById('chantier').value;
    if (chantier && chantier.trim() !== '') {
        try {
            await savePVDraft(true); // Sauvegarde silencieuse
        } catch (error) {
            console.error('Erreur lors de la sauvegarde avant changement de version:', error);
        }
    }
}

async function loadPVVersion(pvId, versionNumber) {
    try {
        // Sauvegarder le PV et la version dans localStorage
        localStorage.setItem('currentPVId', pvId);
        localStorage.setItem('currentPVVersion', versionNumber);
        
        // Vérifier d'abord si c'est une version antérieure
        const response = await fetch(`/load-pv-version/${pvId}/${versionNumber}`);
        const data = await response.json();
        
        if (!data.success) {
            alert(data.message || 'Erreur lors du chargement de la version');
            return;
        }
        
        const pvData = data.pv;
        const previousVersion = currentVersionNumber;
        currentVersionNumber = versionNumber;
        
        // Mettre à jour le flag pour savoir si on est sur la version actuelle
        isOnCurrentVersion = pvData.is_current_version;
        
        // Afficher un avertissement si ce n'est pas la version actuelle
        if (!pvData.is_current_version) {
            showVersionWarning(versionNumber, pvData.version_date);
            disableFormEditing(); // Désactiver l'édition pour les versions antérieures
        } else {
            hideVersionWarning();
            enableFormEditing(); // Réactiver l'édition pour la version actuelle
        }
        
        // IMPORTANT: Réinitialiser complètement le formulaire avant de charger les nouvelles données
        // Cela évite que les modifications d'une version restent sur une autre
        resetForm();
        
        // Charger les données dans le formulaire
        populateFormWithPVData(pvData);
        
        // Mettre à jour l'indicateur et le sélecteur de versions
        updatePVStatusBadge();
        updateVersionSelector();
        
    } catch (error) {
        console.error('Erreur lors du chargement de la version:', error);
        alert('Erreur lors du chargement de la version');
    }
}

/**
 * Affiche un avertissement quand on consulte une ancienne version
 */
function showVersionWarning(versionNumber, versionDate) {
    const indicator = document.getElementById('currentPVIndicator');
    if (!indicator) return;
    
    indicator.classList.remove('alert-info', 'alert-success');
    indicator.classList.add('alert-warning');
    
    // Ajouter un message d'avertissement
    let warningDiv = document.getElementById('versionWarningMessage');
    if (!warningDiv) {
        warningDiv = document.createElement('div');
        warningDiv.id = 'versionWarningMessage';
        warningDiv.className = 'alert alert-warning mt-2 mb-0';
        const detailsDiv = indicator.querySelector('.pv-indicator-details');
        if (detailsDiv) {
            detailsDiv.appendChild(warningDiv);
        }
    }
    
    warningDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i> 
        <strong>Attention :</strong> Vous consultez une ancienne version (Version ${versionNumber} du ${versionDate}). 
        <strong>Mode lecture seule - Les modifications sont désactivées.</strong>
    `;
    warningDiv.style.display = 'block';
}

/**
 * Masque l'avertissement de version
 */
function hideVersionWarning() {
    const warningDiv = document.getElementById('versionWarningMessage');
    if (warningDiv) {
        warningDiv.style.display = 'none';
    }
    
    const indicator = document.getElementById('currentPVIndicator');
    if (indicator) {
        indicator.classList.remove('alert-warning', 'alert-info');
        indicator.classList.add('alert-info');
    }
}

/**
 * Désactive l'édition du formulaire (mode lecture seule)
 */
function disableFormEditing() {
    const form = document.getElementById('pvForm');
    if (!form) return;
    
    // Désactiver tous les inputs, textareas et selects
    const inputs = form.querySelectorAll('input, textarea, select, button[type="button"]');
    inputs.forEach(element => {
        // Ne pas désactiver le sélecteur de version
        if (element.id === 'versionSelect') return;
        
        // Ne pas désactiver les boutons radio du type de PV (réception/retour)
        if (element.name === 'pv_type_sticky' || 
            element.id === 'pv_type_compact_reception' || 
            element.id === 'pv_type_compact_retour') {
            return;
        }
        
        element.disabled = true;
        element.style.cursor = 'not-allowed';
    });
    
    // Désactiver les signatures
    if (signaturePadReception) {
        signaturePadReception.off();
    }
    if (signaturePadRetour) {
        signaturePadRetour.off();
    }
    
    // Désactiver les boutons d'ajout de photos
    const photoButtons = document.querySelectorAll('.add-photo-btn, .photo-item button');
    photoButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
    });
    
    // Ajouter une classe au formulaire pour le style
    form.classList.add('readonly-mode');
}

/**
 * Réactive l'édition du formulaire
 */
function enableFormEditing() {
    const form = document.getElementById('pvForm');
    if (!form) return;
    
    // Réactiver tous les inputs, textareas et selects
    const inputs = form.querySelectorAll('input, textarea, select, button[type="button"]');
    inputs.forEach(element => {
        element.disabled = false;
        element.style.cursor = '';
    });
    
    // Réactiver les signatures
    if (signaturePadReception) {
        signaturePadReception.on();
    }
    if (signaturePadRetour) {
        signaturePadRetour.on();
    }
    
    // Réactiver les boutons d'ajout de photos
    const photoButtons = document.querySelectorAll('.add-photo-btn, .photo-item button');
    photoButtons.forEach(btn => {
        btn.disabled = false;
        btn.style.cursor = '';
    });
    
    // Retirer la classe readonly du formulaire
    form.classList.remove('readonly-mode');
}

/**
 * Remplit le formulaire avec les données d'un PV (y compris anciennes versions)
 */
function populateFormWithPVData(pvData) {
    const formData = pvData.form_data || pvData;
    
    // Mettre à jour les variables globales
    currentPVId = pvData.id;
    document.getElementById('pvId').value = currentPVId;
    
    // Stocker les données du PV pour y accéder dans updatePVStatusBadge
    window.currentPVData = pvData;
    
    // Utiliser la fonction existante populateForm pour remplir le formulaire
    populateForm(formData);
    
    // Charger les données VGP si présentes
    const vgpDateInput = document.getElementById('vgp_date');
    if (vgpDateInput && pvData.vgp_date) {
        vgpDateInput.value = pvData.vgp_date;
    }
    
    // Afficher le lien du document VGP si présent
    const vgpDocLink = document.getElementById('vgp_document_link');
    const vgpDocCurrent = document.getElementById('vgp_document_current');
    if (vgpDocLink && vgpDocCurrent && pvData.vgp_document_path) {
        vgpDocLink.href = `/vgp-document/${pvData.id}`;
        vgpDocCurrent.style.display = 'block';
    } else if (vgpDocCurrent) {
        vgpDocCurrent.style.display = 'none';
    }
    
    // Mettre à jour l'indicateur VGP
    updateVGPIndicator();
}

// Ajuster dynamiquement le padding du body en fonction de la hauteur de l'indicateur
function adjustBodyPadding() {
    const indicator = document.getElementById('currentPVIndicator');
    const notificationContainer = document.querySelector('.notification-container');
    
    if (indicator && document.body.classList.contains('has-pv-indicator')) {
        const height = indicator.offsetHeight;
        document.body.style.paddingTop = height + 'px';
        
        // Ajuster aussi la position des notifications
        if (notificationContainer) {
            notificationContainer.style.top = (height + 10) + 'px'; // 10px de marge
        }
    } else {
        document.body.style.paddingTop = '0';
        if (notificationContainer) {
            notificationContainer.style.top = '70px'; // Valeur par défaut
        }
    }
}

// Observer les changements de taille de l'indicateur
const indicatorObserver = new ResizeObserver(() => {
    adjustBodyPadding();
});

// Démarrer l'observation dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    const indicator = document.getElementById('currentPVIndicator');
    if (indicator) {
        indicatorObserver.observe(indicator);
        adjustBodyPadding();
    }
    
    // Ajuster aussi lors du redimensionnement de la fenêtre
    window.addEventListener('resize', adjustBodyPadding);
});

/**
 * Initialise les boutons de navigation en haut/bas de page
 */
function initializeScrollButtons() {
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
    
    if (!scrollToTopBtn || !scrollToBottomBtn) return;
    
    // Bouton pour aller en haut
    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Bouton pour aller en bas
    scrollToBottomBtn.addEventListener('click', function() {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    });
    
    // Afficher/masquer les boutons selon la position du scroll
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.body.scrollHeight;
        
        // Afficher le bouton "haut" si on a scrollé plus de 300px
        if (scrollPosition > 300) {
            scrollToTopBtn.style.display = 'flex';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
        
        // Afficher le bouton "bas" si on n'est pas en bas de page
        if (scrollPosition + windowHeight < documentHeight - 100) {
            scrollToBottomBtn.style.display = 'flex';
        } else {
            scrollToBottomBtn.style.display = 'none';
        }
    });
}
