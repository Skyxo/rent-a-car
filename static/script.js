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
    const pvTypeReception = document.getElementById('pv_type_reception');
    const pvTypeRetour = document.getElementById('pv_type_retour');
    
    function togglePVColumns(type) {
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
    
    // Écouteurs d'événements
    if (pvTypeReception) {
        pvTypeReception.addEventListener('change', function() {
            if (this.checked) {
                togglePVColumns('reception');
            }
        });
    }
    
    if (pvTypeRetour) {
        pvTypeRetour.addEventListener('change', function() {
            if (this.checked) {
                togglePVColumns('retour');
            }
        });
    }
    
    // Initialiser l'affichage au chargement (Réception par défaut)
    togglePVColumns('reception');
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
    } else if (type === 'Retour' && signaturePadRetour) {
        signaturePadRetour.clear();
        document.getElementById('signature_retour_data').value = '';
        saveFormData();
    }
}

/**
 * Initialise la persistence des données du formulaire via localStorage
 */
function initializeFormPersistence() {
    const form = document.getElementById('pvForm');
    
    // Charger les données sauvegardées au démarrage
    loadFormData();
    
    // Sauvegarder à chaque modification
    form.addEventListener('change', saveFormData);
    form.addEventListener('input', debounce(saveFormData, 500));
}

/**
 * Sauvegarde l'état du formulaire dans localStorage
 */
function saveFormData() {
    const formData = gatherFormData();
    
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
    // Bouton Sauvegarder (bas de page)
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', savePVDraft);
    }
    
    // Bouton Sauvegarder (haut de page)
    const saveDraftBtnTop = document.getElementById('saveDraftBtnTop');
    if (saveDraftBtnTop) {
        saveDraftBtnTop.addEventListener('click', savePVDraft);
    }
    
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

/**
 * Charge la liste des PV sauvegardés et les affiche sous forme de cartes
 */
async function loadSavedPVList() {
    try {
        const response = await fetch('/list-pv');
        const data = await response.json();
        
        if (data.success) {
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
                
                // Déterminer le statut
                const statusClass = pv.status === 'sent' ? 'sent' : 'draft';
                const statusText = pv.status === 'sent' ? 'Envoyé' : 'Brouillon';
                const statusIcon = pv.status === 'sent' ? 'check-circle' : 'edit';
                
                // Créer la carte
                const card = document.createElement('div');
                card.className = 'pv-card';
                card.dataset.pvId = pv.id;
                
                // Marquer comme sélectionné si c'est le PV actuel
                if (currentPVId === pv.id) {
                    card.classList.add('selected');
                }
                
                card.innerHTML = `
                    <div class="pv-card-header">
                        <h6 class="pv-card-title">
                            <i class="fas fa-file-alt me-2 text-primary"></i>
                            ${pv.chantier || 'Sans nom'}
                        </h6>
                        <span class="pv-card-status ${statusClass}">
                            <i class="fas fa-${statusIcon}"></i> ${statusText}
                        </span>
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
                    <div class="pv-card-actions">
                        <button type="button" class="btn btn-sm btn-primary load-pv-btn" data-pv-id="${pv.id}">
                            <i class="fas fa-folder-open"></i> Charger
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-pv-btn" data-pv-id="${pv.id}">
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
    // Événement de clic sur les boutons "Charger"
    document.querySelectorAll('.load-pv-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const pvId = this.dataset.pvId;
            await loadPVById(pvId);
        });
    });
    
    // Événement de clic sur les boutons "Supprimer"
    document.querySelectorAll('.delete-pv-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            const pvId = this.dataset.pvId;
            await deletePVById(pvId);
        });
    });
    
    // Événement de clic sur les cartes (sélection visuelle)
    document.querySelectorAll('.pv-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Ne pas traiter si on a cliqué sur un bouton
            if (e.target.closest('.pv-card-actions')) return;
            
            // Retirer la sélection de toutes les cartes
            document.querySelectorAll('.pv-card').forEach(c => c.classList.remove('selected'));
            
            // Sélectionner cette carte
            this.classList.add('selected');
            
            // Mettre à jour le select (pour compatibilité)
            const select = document.getElementById('savedPVSelect');
            if (select) {
                select.value = this.dataset.pvId;
            }
        });
    });
}

/**
 * Initialise la recherche et le filtrage des PV
 */
function initializePVSearch() {
    const searchInput = document.getElementById('pvSearchInput');
    const filterStatus = document.getElementById('pvFilterStatus');
    const toggleBtn = document.getElementById('togglePVListBtn');
    const searchSection = document.getElementById('pvSearchSection');
    const listContainer = document.getElementById('pvListContainer');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterPVCards);
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', filterPVCards);
    }
    
    if (toggleBtn && searchSection && listContainer) {
        toggleBtn.addEventListener('click', function() {
            const isCollapsed = searchSection.classList.contains('collapsed');
            
            if (isCollapsed) {
                searchSection.classList.remove('collapsed');
                listContainer.style.display = 'block';
                this.innerHTML = '<i class="fas fa-chevron-up"></i>';
            } else {
                searchSection.classList.add('collapsed');
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
    const cards = document.querySelectorAll('.pv-card');
    
    if (!searchInput || !filterStatus) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    
    let visibleCount = 0;
    
    cards.forEach(card => {
        const title = card.querySelector('.pv-card-title').textContent.toLowerCase();
        const meta = card.querySelector('.pv-card-meta').textContent.toLowerCase();
        const statusBadge = card.querySelector('.pv-card-status');
        const cardStatus = statusBadge.classList.contains('sent') ? 'sent' : 'draft';
        
        // Vérifier la recherche textuelle
        const matchesSearch = !searchTerm || title.includes(searchTerm) || meta.includes(searchTerm);
        
        // Vérifier le filtre de statut
        const matchesStatus = !statusFilter || cardStatus === statusFilter;
        
        // Afficher ou masquer la carte
        if (matchesSearch && matchesStatus) {
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
        
        // Restaurer les boutons
        const btnBottom = document.getElementById('downloadPVBtn');
        const btnTop = document.getElementById('downloadPVBtnTop');
        if (btnBottom) {
            btnBottom.disabled = false;
            btnBottom.innerHTML = '<i class="fas fa-download"></i> Télécharger le PDF<br><small class="d-block mt-1">Générer et télécharger le PDF</small>';
        }
        if (btnTop) {
            btnTop.disabled = false;
            btnTop.innerHTML = '<i class="fas fa-download"></i> Télécharger le PDF';
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


