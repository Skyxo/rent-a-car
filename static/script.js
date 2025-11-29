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
const AUTO_SAVE_DELAY = 3000; // 3 secondes après la dernière modification
const PERIODIC_SAVE_INTERVAL = 30000; // 30 secondes

// Champs avec historique
const HISTORY_FIELDS = ['chantier', 'email_conducteur', 'email_entreprise', 'materiel_numero', 'materiel_type', 'fournisseur', 'responsable'];

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    initializeSignaturePads();
    initializeFormPersistence();
    initializeFormValidation();
    initializePhotoUploads();
    initializePVManagement();
    loadSavedPVList();
    initializeRadioDeselect();
    initializePVTypeToggle();
    initializeSelect2Fields();
    initializeStickyHeader();
    initializeEmailEntreprise();
    startPeriodicAutoSave();
    initScrollNavigation();
});

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
 * Gère l'affichage conditionnel des colonnes Réception/Retour selon le type de PV
 */
function initializePVTypeToggle() {
    const pvTypeStickyReception = document.getElementById('pv_type_sticky_reception');
    const pvTypeStickyRetour = document.getElementById('pv_type_sticky_retour');
    
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
        
        // Sélectionner tous les tableaux d'inspection
        const tables = document.querySelectorAll('.inspection-table');
        
        tables.forEach(table => {
            const headers = table.querySelectorAll('thead th');
            const rows = table.querySelectorAll('tbody tr');
            
            if (type === 'reception') {
                // Afficher colonnes Réception (index 1 et 2), masquer Retour (index 3 et 4)
                if (headers.length >= 5) {
                    headers[1].style.display = '';
                    headers[2].style.display = '';
                    headers[3].style.display = 'none';
                    headers[4].style.display = 'none';
                }
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        cells[1].style.display = '';
                        cells[2].style.display = '';
                        cells[3].style.display = 'none';
                        cells[4].style.display = 'none';
                    }
                });
            } else {
                // Masquer colonnes Réception, afficher Retour
                if (headers.length >= 5) {
                    headers[1].style.display = 'none';
                    headers[2].style.display = 'none';
                    headers[3].style.display = '';
                    headers[4].style.display = '';
                }
                
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        cells[1].style.display = 'none';
                        cells[2].style.display = 'none';
                        cells[3].style.display = '';
                        cells[4].style.display = '';
                    }
                });
            }
        });
        
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
        } else {
            if (signatureReceptionCol) signatureReceptionCol.style.display = 'none';
            if (signatureRetourCol) signatureRetourCol.style.display = '';
        }
    }
    
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
    
    if (!header || !placeholder) return;
    
    // Utiliser scroll event pour une détection précise
    function checkSticky() {
        const headerRect = header.getBoundingClientRect();
        const headerHeight = header.offsetHeight;
        
        // Le header devient sticky quand son haut atteint ou dépasse le haut du viewport
        if (headerRect.top <= 0 && !header.classList.contains('is-sticky')) {
            // Activer le sticky
            placeholder.style.height = headerHeight + 'px';
            placeholder.style.display = 'block';
            header.classList.add('is-sticky');
        }
        // Désactiver le sticky uniquement quand le placeholder revient en vue
        else if (header.classList.contains('is-sticky')) {
            const placeholderRect = placeholder.getBoundingClientRect();
            // Vérifier si on a remonté jusqu'au placeholder
            if (placeholderRect.top >= 0) {
                header.classList.remove('is-sticky');
                placeholder.style.display = 'none';
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
            minWidth: 1.5,
            maxWidth: 2.5,
            velocityFilterWeight: 0.7
        });
        
        resizeCanvas(canvasReception, signaturePadReception);
        
        // Auto-sauvegarde après signature
        signaturePadReception.addEventListener('endStroke', () => {
            scheduleAutoSave();
        });
    }
    
    if (canvasRetour) {
        signaturePadRetour = new SignaturePad(canvasRetour, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 1.5,
            maxWidth: 2.5,
            velocityFilterWeight: 0.7
        });
        
        resizeCanvas(canvasRetour, signaturePadRetour);
        
        // Auto-sauvegarde après signature
        signaturePadRetour.addEventListener('endStroke', () => {
            scheduleAutoSave();
        });
    }
    
    // Redimensionner les canvas lors du resize de la fenêtre
    window.addEventListener('resize', function() {
        if (canvasReception) {
            resizeCanvas(canvasReception, signaturePadReception);
        }
        if (canvasRetour) {
            resizeCanvas(canvasRetour, signaturePadRetour);
        }
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
    
    // Redimensionner le canvas physique en utilisant la largeur du parent
    canvas.width = parentWidth * ratio;
    canvas.height = 150 * ratio; // Hauteur fixe appropriée
    
    // Définir la largeur CSS pour qu'elle corresponde
    canvas.style.width = parentWidth + 'px';
    canvas.style.height = '150px';
    
    // Mettre à l'échelle le contexte
    canvas.getContext('2d').scale(ratio, ratio);
    
    // Restaurer les données
    if (data) {
        signaturePad.fromData(data);
    } else {
        signaturePad.clear();
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
    });
    
    // Auto-sauvegarde avec délai pour les inputs texte (pour ne pas surcharger)
    form.addEventListener('input', debounce(scheduleAutoSave, 1000));
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
        console.log('⏳ Sauvegarde en cours, attente...');
        return;
    }
    
    // Vérifier qu'il y a un chantier (minimum requis)
    const chantier = document.getElementById('chantier').value;
    if (!chantier || chantier.trim() === '') {
        console.log('Auto-sauvegarde ignorée : chantier vide');
        return;
    }
    
    isAutoSaving = true;
    console.log('💾 Démarrage auto-sauvegarde...');
    
    try {
        const result = await savePVDraft(true); // true = silent
        if (result) {
            lastAutoSave = new Date();
            console.log('✅ Auto-sauvegarde effectuée:', lastAutoSave.toLocaleTimeString());
            
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
function startPeriodicAutoSave() {
    setInterval(async () => {
        // Sauvegarder uniquement s'il y a des changements non sauvegardés
        if (hasUnsavedChanges) {
            await performAutoSave();
        }
    }, PERIODIC_SAVE_INTERVAL);
}

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
        console.log('Données sauvegardées automatiquement');
    } catch (e) {
        console.warn('Impossible de sauvegarder dans localStorage:', e);
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
                console.log('Données trop anciennes, ignorées');
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
        
        console.log('Vérification de sauvegarde automatique effectuée');
    } catch (e) {
        console.warn('Impossible de charger depuis localStorage:', e);
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
        photoItem.remove();
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
                // Debug: afficher les données du PV
                console.log('PV data:', pv);
                
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
                
                // Déterminer le statut
                const statusClass = pv.status === 'sent' ? 'sent' : 'draft';
                const statusText = pv.status === 'sent' ? 'Envoyé' : 'Brouillon';
                const statusIcon = pv.status === 'sent' ? 'check-circle' : 'edit';
                
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
                
                // Créer la carte
                const card = document.createElement('div');
                card.className = 'pv-card';
                card.dataset.pvId = pv.id;
                
                // Ajouter les données pour la recherche
                card.dataset.chantier = (pv.chantier || '').toLowerCase();
                card.dataset.emailConducteur = (pv.email_conducteur || '').toLowerCase();
                card.dataset.responsable = (pv.responsable || '').toLowerCase();
                card.dataset.fournisseur = (pv.fournisseur || '').toLowerCase();
                card.dataset.materielNumero = (pv.materiel_numero || '').toLowerCase();
                card.dataset.materielType = (pv.materiel_type || '').toLowerCase();
                card.dataset.completionStatus = completionStatus;
                card.dataset.dateReception = pv.date_reception || '';
                card.dataset.dateRetour = pv.date_retour || '';
                
                // Créer un texte de recherche complet avec tous les formats de dates possibles
                let searchText = [
                    pv.chantier || '',
                    pv.email_conducteur || '',
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
                    detailsHTML += `
                        <div class="pv-card-detail">
                            <i class="fas fa-envelope"></i>
                            <span>${pv.email_conducteur}</span>
                        </div>
                    `;
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
                
                console.log('Details HTML:', detailsHTML);
                
                card.innerHTML = `
                    <div class="pv-card-header">
                        <h6 class="pv-card-title">
                            <i class="fas fa-file-alt me-2 text-primary"></i>
                            ${pv.chantier || 'Sans nom'}
                        </h6>
                        <div class="pv-card-badges">
                            ${completionBadge}
                            <span class="pv-card-status ${statusClass}">
                                <i class="fas fa-${statusIcon}"></i> ${statusText}
                            </span>
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
            
            // Initialiser la recherche et le filtrage
            initializePVSearch();
            
            // Peupler les dropdowns de filtre
            populateFilterDropdowns(data.pv_list);
            
            // Mettre à jour le compteur filtré
            updateFilterCount();
            
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
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const pvId = this.dataset.pvId;
            await deletePVById(pvId);
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
function initializePVSearch() {
    const searchInput = document.getElementById('pvSearchInput');
    const filterStatus = document.getElementById('pvFilterStatus');
    const filterCompletion = document.getElementById('pvFilterCompletion');
    const filterChantier = document.getElementById('pvFilterChantier');
    const filterMaterielType = document.getElementById('pvFilterMaterielType');
    const filterResponsable = document.getElementById('pvFilterResponsable');
    const filterFournisseur = document.getElementById('pvFilterFournisseur');
    const filterEmailConducteur = document.getElementById('pvFilterEmailConducteur');
    const filterDateReception = document.getElementById('pvFilterDateReception');
    const filterDateRetour = document.getElementById('pvFilterDateRetour');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    const filtersSection = document.getElementById('pvFiltersSection');
    const toggleBtn = document.getElementById('togglePVListBtn');
    const searchSection = document.getElementById('pvSearchSection');
    const listContainer = document.getElementById('pvListContainer');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterPVCards);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterCompletion) {
        filterCompletion.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterChantier) {
        filterChantier.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterMaterielType) {
        filterMaterielType.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterResponsable) {
        filterResponsable.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterFournisseur) {
        filterFournisseur.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterEmailConducteur) {
        filterEmailConducteur.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterDateReception) {
        filterDateReception.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (filterDateRetour) {
        filterDateRetour.addEventListener('change', function() {
            filterPVCards();
            populateFilterDropdowns();
        });
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Réinitialiser tous les filtres
            if (searchInput) searchInput.value = '';
            if (filterStatus) filterStatus.value = '';
            if (filterCompletion) filterCompletion.value = '';
            if (filterChantier) filterChantier.value = '';
            if (filterMaterielType) filterMaterielType.value = '';
            if (filterResponsable) filterResponsable.value = '';
            if (filterFournisseur) filterFournisseur.value = '';
            if (filterEmailConducteur) filterEmailConducteur.value = '';
            if (filterDateReception) filterDateReception.value = '';
            if (filterDateRetour) filterDateRetour.value = '';
            
            // Relancer le filtrage
            filterPVCards();
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
    const filterStatus = document.getElementById('pvFilterStatus');
    const filterCompletion = document.getElementById('pvFilterCompletion');
    const filterChantier = document.getElementById('pvFilterChantier');
    const filterMaterielType = document.getElementById('pvFilterMaterielType');
    const filterResponsable = document.getElementById('pvFilterResponsable');
    const filterFournisseur = document.getElementById('pvFilterFournisseur');
    const filterEmailConducteur = document.getElementById('pvFilterEmailConducteur');
    const filterDateReception = document.getElementById('pvFilterDateReception');
    const filterDateRetour = document.getElementById('pvFilterDateRetour');
    const cards = document.querySelectorAll('.pv-card');
    
    if (!searchInput || !filterStatus) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const completionFilter = filterCompletion ? filterCompletion.value : '';
    const chantierFilter = filterChantier ? filterChantier.value.toLowerCase() : '';
    const materielTypeFilter = filterMaterielType ? filterMaterielType.value.toLowerCase() : '';
    const responsableFilter = filterResponsable ? filterResponsable.value.toLowerCase() : '';
    const fournisseurFilter = filterFournisseur ? filterFournisseur.value.toLowerCase() : '';
    const emailConducteurFilter = filterEmailConducteur ? filterEmailConducteur.value.toLowerCase() : '';
    const dateReceptionFilter = filterDateReception ? filterDateReception.value : '';
    const dateRetourFilter = filterDateRetour ? filterDateRetour.value : '';
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const statusBadge = card.querySelector('.pv-card-status');
        const cardStatus = statusBadge.classList.contains('sent') ? 'sent' : 'draft';
        
        // Récupérer le texte de recherche complet qui contient tous les formats
        const searchableText = card.dataset.searchText || '';
        
        // Vérifier la recherche textuelle
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        
        // Vérifier le filtre de statut
        const matchesStatus = !statusFilter || cardStatus === statusFilter;
        
        // Vérifier le filtre de complétion
        const matchesCompletion = !completionFilter || (card.dataset.completionStatus || 'empty') === completionFilter;
        
        // Vérifier le filtre chantier
        const matchesChantier = !chantierFilter || (card.dataset.chantier || '').toLowerCase() === chantierFilter;
        
        // Vérifier le filtre type matériel
        const matchesMaterielType = !materielTypeFilter || (card.dataset.materielType || '').toLowerCase() === materielTypeFilter;
        
        // Vérifier le filtre responsable
        const matchesResponsable = !responsableFilter || (card.dataset.responsable || '').toLowerCase() === responsableFilter;
        
        // Vérifier le filtre fournisseur
        const matchesFournisseur = !fournisseurFilter || (card.dataset.fournisseur || '').toLowerCase() === fournisseurFilter;
        
        // Vérifier le filtre email conducteur
        const matchesEmailConducteur = !emailConducteurFilter || (card.dataset.emailConducteur || '').toLowerCase() === emailConducteurFilter;
        
        // Vérifier le filtre date réception
        const matchesDateReception = !dateReceptionFilter || (card.dataset.dateReception || '') === dateReceptionFilter;
        
        // Vérifier le filtre date retour
        const matchesDateRetour = !dateRetourFilter || (card.dataset.dateRetour || '') === dateRetourFilter;
        
        // Afficher ou masquer la carte
        if (matchesSearch && matchesStatus && matchesCompletion && matchesChantier && matchesMaterielType && 
            matchesResponsable && matchesFournisseur && matchesEmailConducteur && matchesDateReception && matchesDateRetour) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });
    
    updateFilterCount(visibleCount);
    checkScrollableList();
}

/**
 * Peuple les dropdowns de filtre avec les valeurs uniques
 */
function populateFilterDropdowns(pvs) {
    // Sauvegarder les valeurs actuellement sélectionnées
    const currentFilters = {
        status: document.getElementById('pvFilterStatus')?.value || '',
        completion: document.getElementById('pvFilterCompletion')?.value || '',
        chantier: document.getElementById('pvFilterChantier')?.value || '',
        materielType: document.getElementById('pvFilterMaterielType')?.value || '',
        responsable: document.getElementById('pvFilterResponsable')?.value || '',
        fournisseur: document.getElementById('pvFilterFournisseur')?.value || '',
        emailConducteur: document.getElementById('pvFilterEmailConducteur')?.value || '',
        dateReception: document.getElementById('pvFilterDateReception')?.value || '',
        dateRetour: document.getElementById('pvFilterDateRetour')?.value || ''
    };
    
    // Filtrer les PV selon les filtres actifs
    let filteredPVs = allPVData.filter(pv => {
        const matchesStatus = !currentFilters.status || 
            (currentFilters.status === 'sent' && pv.status === 'sent') ||
            (currentFilters.status === 'draft' && pv.status !== 'sent');
        const matchesCompletion = !currentFilters.completion || 
            (pv.completion_status || 'empty') === currentFilters.completion;
        const matchesChantier = !currentFilters.chantier || 
            (pv.chantier || '').trim() === currentFilters.chantier;
        const matchesMaterielType = !currentFilters.materielType || 
            (pv.materiel_type || '').trim() === currentFilters.materielType;
        const matchesResponsable = !currentFilters.responsable || 
            (pv.responsable || '').trim() === currentFilters.responsable;
        const matchesFournisseur = !currentFilters.fournisseur || 
            (pv.fournisseur || '').trim() === currentFilters.fournisseur;
        const matchesEmailConducteur = !currentFilters.emailConducteur || 
            (pv.email_conducteur || '').trim() === currentFilters.emailConducteur;
        const matchesDateReception = !currentFilters.dateReception || 
            (pv.date_reception || '') === currentFilters.dateReception;
        const matchesDateRetour = !currentFilters.dateRetour || 
            (pv.date_retour || '') === currentFilters.dateRetour;
        
        return matchesStatus && matchesCompletion && matchesChantier && matchesMaterielType &&
            matchesResponsable && matchesFournisseur && matchesEmailConducteur &&
            matchesDateReception && matchesDateRetour;
    });
    
    const chantierSet = new Set();
    const materielTypeSet = new Set();
    const responsableSet = new Set();
    const fournisseurSet = new Set();
    const emailConducteurSet = new Set();
    
    console.log('🔍 Population des filtres avec', filteredPVs.length, 'PV (sur', allPVData.length, 'total)');
    
    filteredPVs.forEach(pv => {
        if (pv.chantier && pv.chantier.trim()) {
            chantierSet.add(pv.chantier.trim());
        }
        if (pv.materiel_type && pv.materiel_type.trim()) {
            materielTypeSet.add(pv.materiel_type.trim());
        }
        if (pv.responsable && pv.responsable.trim()) {
            responsableSet.add(pv.responsable.trim());
        }
        if (pv.fournisseur && pv.fournisseur.trim()) {
            fournisseurSet.add(pv.fournisseur.trim());
        }
        if (pv.email_conducteur && pv.email_conducteur.trim()) {
            emailConducteurSet.add(pv.email_conducteur.trim());
        }
    });
    
    console.log('🏗️ Chantiers trouvés:', Array.from(chantierSet));
    console.log('🔧 Types matériel trouvés:', Array.from(materielTypeSet));
    console.log('👤 Responsables trouvés:', Array.from(responsableSet));
    console.log('🚚 Fournisseurs trouvés:', Array.from(fournisseurSet));
    console.log('✉️ Emails conducteur trouvés:', Array.from(emailConducteurSet));
    
    // Peupler le dropdown chantier
    const chantierSelect = document.getElementById('pvFilterChantier');
    if (chantierSelect) {
        const currentValue = chantierSelect.value;
        chantierSelect.innerHTML = '<option value="">Tous chantiers</option>';
        Array.from(chantierSet).sort().forEach(chantier => {
            const option = document.createElement('option');
            option.value = chantier;
            option.textContent = chantier;
            chantierSelect.appendChild(option);
        });
        // Restaurer la valeur si elle existe toujours
        if (currentValue && chantierSet.has(currentValue)) {
            chantierSelect.value = currentValue;
        }
        console.log('✅ Dropdown chantier peuplé avec', chantierSet.size, 'valeurs');
    }
    
    // Peupler le dropdown type matériel
    const materielTypeSelect = document.getElementById('pvFilterMaterielType');
    if (materielTypeSelect) {
        const currentValue = materielTypeSelect.value;
        materielTypeSelect.innerHTML = '<option value="">Tous types</option>';
        Array.from(materielTypeSet).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            materielTypeSelect.appendChild(option);
        });
        if (currentValue && materielTypeSet.has(currentValue)) {
            materielTypeSelect.value = currentValue;
        }
        console.log('✅ Dropdown type matériel peuplé avec', materielTypeSet.size, 'valeurs');
    }
    
    // Peupler le dropdown responsable
    const responsableSelect = document.getElementById('pvFilterResponsable');
    if (responsableSelect) {
        const currentValue = responsableSelect.value;
        responsableSelect.innerHTML = '<option value="">Tous responsables</option>';
        Array.from(responsableSet).sort().forEach(resp => {
            const option = document.createElement('option');
            option.value = resp;
            option.textContent = resp;
            responsableSelect.appendChild(option);
        });
        if (currentValue && responsableSet.has(currentValue)) {
            responsableSelect.value = currentValue;
        }
        console.log('✅ Dropdown responsable peuplé avec', responsableSet.size, 'valeurs');
    }
    
    // Peupler le dropdown fournisseur
    const fournisseurSelect = document.getElementById('pvFilterFournisseur');
    if (fournisseurSelect) {
        const currentValue = fournisseurSelect.value;
        fournisseurSelect.innerHTML = '<option value="">Tous fournisseurs</option>';
        Array.from(fournisseurSet).sort().forEach(fourn => {
            const option = document.createElement('option');
            option.value = fourn;
            option.textContent = fourn;
            fournisseurSelect.appendChild(option);
        });
        if (currentValue && fournisseurSet.has(currentValue)) {
            fournisseurSelect.value = currentValue;
        }
        console.log('✅ Dropdown fournisseur peuplé avec', fournisseurSet.size, 'valeurs');
    }
    
    // Peupler le dropdown email conducteur
    const emailConducteurSelect = document.getElementById('pvFilterEmailConducteur');
    if (emailConducteurSelect) {
        const currentValue = emailConducteurSelect.value;
        emailConducteurSelect.innerHTML = '<option value="">Tous emails conducteur</option>';
        Array.from(emailConducteurSet).sort().forEach(email => {
            const option = document.createElement('option');
            option.value = email;
            option.textContent = email;
            emailConducteurSelect.appendChild(option);
        });
        if (currentValue && emailConducteurSet.has(currentValue)) {
            emailConducteurSelect.value = currentValue;
        }
        console.log('✅ Dropdown email conducteur peuplé avec', emailConducteurSet.size, 'valeurs');
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
 */
async function loadPVById(pvId) {
    if (!pvId) return;
    
    try {
        // Nettoyer complètement le formulaire avant de charger les nouvelles données
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
        
        const response = await fetch(`/load-pv/${pvId}`);
        const data = await response.json();
        
        if (data.success) {
            const pvData = data.pv_data;
            currentPVId = pvData.id;
            pvStatus = pvData.status || 'draft';
            
            // Remplir le formulaire avec les nouvelles données
            populateForm(pvData.form_data);
            
            // Effacer la sauvegarde automatique car on charge un PV sauvegardé
            localStorage.removeItem('pvMaterielFormData');
            
            // Mettre à jour le statut
            document.getElementById('pvId').value = currentPVId;
            updatePVStatusBadge();
            
            showNotification('success', `PV "${pvData.chantier}" chargé avec succès`);
            
            // Mettre à jour la sélection visuelle
            await loadSavedPVList();
            
            // Scroller en haut
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${pvName} ?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/delete-pv/${pvId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('success', data.message);
            
            // Si c'était le PV actuel, créer un nouveau
            if (currentPVId === pvId) {
                createNewPV();
            }
            
            // Recharger la liste
            await loadSavedPVList();
        } else {
            showNotification('danger', data.message);
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showNotification('danger', 'Erreur lors de la suppression du PV');
    }
}

/**
 * Télécharge un PV par son ID
 */
async function downloadPVById(pvId) {
    if (!pvId) return;
    
    try {
        // Charger le PV d'abord
        await loadPVById(pvId);
        
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
        // Charger le PV d'abord
        await loadPVById(pvId);
        
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
            const emailConducteur = formData.get('email_conducteur');
            const hasReceptionSignature = signaturePadReception && !signaturePadReception.isEmpty();
            const hasRetourSignature = signaturePadRetour && !signaturePadRetour.isEmpty();
            
            if (!chantier || !emailConducteur) {
                showNotification('warning', 'Veuillez remplir le chantier et l\'email conducteur avant d\'envoyer');
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
        console.log('FormData being saved:', formData);
        console.log('Email conducteur:', formData.email_conducteur);
        console.log('Responsable:', formData.responsable);
        console.log('Fournisseur:', formData.fournisseur);
        
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
            
            // Effacer la sauvegarde automatique locale car les données sont maintenant sauvegardées
            localStorage.removeItem('pvMaterielFormData');
            
            // Afficher message de succès seulement si pas en mode silent
            if (!silent) {
                showNotification('success', data.message);
            }
            
            // Recharger la liste
            await loadSavedPVList();
            
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
                // Créer l'option si elle n'existe pas déjà
                if ($element.find(`option[value="${value}"]`).length === 0 && value) {
                    const newOption = new Option(value, value, true, true);
                    $element.append(newOption);
                }
                // Définir la valeur et déclencher le changement
                $element.val(value).trigger('change');
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
    
    console.log('Photos trouvées à restaurer:', allPhotoKeys.length);
    
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
    
    console.log('Photos regroupées par conteneur:', Object.keys(photosByContainer));
    
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
            console.log(`${photoKeys.length} photo(s) restaurée(s) dans ${containerId}`);
        } else {
            console.warn(`Conteneur ${containerId} introuvable pour le champ ${fieldName}`);
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
 * Met à jour le badge de statut du PV
 */
function updatePVStatusBadge() {
    const statusAlert = document.querySelector('.alert-info');
    if (!statusAlert) return;
    
    if (pvStatus === 'new') {
        statusAlert.className = 'alert alert-info mb-3';
        statusAlert.innerHTML = '<i class="fas fa-info-circle"></i> <strong>Nouveau PV en cours</strong> - Le formulaire est vide et prêt à être rempli';
    } else if (pvStatus === 'draft') {
        statusAlert.className = 'alert alert-warning mb-3';
        statusAlert.innerHTML = '<i class="fas fa-edit"></i> <strong>PV chargé</strong> - Vous pouvez modifier ce PV et l\'envoyer par email';
    }
}

/**
 * Affiche une notification
 */
function showNotification(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insérer au début du main
    const main = document.querySelector('main.container');
    if (main) {
        main.insertBefore(alertDiv, main.firstChild);
        
        // Auto-dismiss après 5 secondes
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
        
        // Scroller vers le haut
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
 * Initialise les champs Select2 avec les données de l'historique
 */
function initializeSelect2Fields() {
    // Configuration des données factices pour chaque champ
    const fieldData = {
        'chantier': [],
        'email_conducteur': [],
        'email_entreprise': [],
        'materiel_numero': [],
        'materiel_type': [],
        'fournisseur': [],
        'responsable': []
    };
    
    // Initialiser chaque champ Select2
    HISTORY_FIELDS.forEach(fieldId => {
        const $field = $(`#${fieldId}`);
        if ($field.length === 0) return;
        
        // Charger les données de l'historique localStorage
        const historyData = getFieldHistory(fieldId);
        
        // Combiner les données factices avec l'historique (sans doublons)
        const dummyData = fieldData[fieldId] || [];
        const allData = [...new Set([...historyData, ...dummyData])];
        
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
 * Initialise un seul champ Select2
 */
function initSingleSelect2Field($field, fieldId, fieldData) {
    // Initialiser Select2 avec la fonction tags et template personnalisé
    $field.select2({
        theme: 'bootstrap-5',
        tags: true,
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
            
            // Créer l'élément avec un bouton de suppression
            const $result = $('<span class="select2-result-item"></span>');
            const $text = $('<span class="select2-result-text"></span>').text(data.text);
            const $deleteBtn = $('<button class="select2-delete-btn" type="button" title="Supprimer"><i class="fas fa-times"></i></button>');
            
            // Utiliser mousedown pour intercepter avant le clic de Select2
            $deleteBtn.on('mousedown', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const valueToDelete = data.text;
                
                // Empêcher la fermeture du dropdown temporairement
                let preventClose = true;
                const preventClosing = function(e) {
                    if (preventClose) {
                        e.preventDefault();
                    }
                };
                
                $field.on('select2:closing', preventClosing);
                
                // Supprimer de l'historique
                deleteFromFieldHistory(fieldId, valueToDelete);
                
                // Sauvegarder la valeur actuelle
                const currentVal = $field.val();
                
                // Supprimer l'option du DOM
                $field.find(`option`).filter(function() {
                    return $(this).val() === valueToDelete;
                }).remove();
                
                // Restaurer la valeur si elle n'a pas été supprimée
                if (currentVal !== valueToDelete) {
                    $field.val(currentVal);
                }
                
                // Supprimer visuellement l'élément du dropdown
                $(e.target).closest('.select2-results__option').fadeOut(150, function() {
                    $(this).remove();
                    
                    // Réactiver la fermeture normale après l'animation
                    setTimeout(() => {
                        preventClose = false;
                        $field.off('select2:closing', preventClosing);
                    }, 50);
                });
                
                return false;
            });
            
            // Empêcher aussi le click
            $deleteBtn.on('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                return false;
            });
            
            $result.append($text);
            $result.append($deleteBtn);
            
            return $result;
        }
    });
    
    // Sauvegarder dans l'historique quand la valeur change
    $field.off('change.history').on('change.history', function() {
        const value = $(this).val();
        if (value && value.trim()) {
            saveToFieldHistory(fieldId, value.trim());
        }
    });
    
    // Déclencher une auto-sauvegarde immédiate après changement Select2
    $field.off('select2:select').on('select2:select', function() {
        performAutoSave();
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
 * Initialise la gestion de l'email entreprise - charge le dernier email utilisé
 */
function initializeEmailEntreprise() {
    const emailField = document.getElementById('email_entreprise');
    if (!emailField) return;
    
    // Charger le dernier email utilisé depuis l'historique
    const history = getFieldHistory('email_entreprise');
    if (history.length > 0) {
        emailField.value = history[0]; // Le plus récent
    }
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


