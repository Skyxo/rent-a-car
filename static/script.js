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
});

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
    const rect = canvas.getBoundingClientRect();
    
    // Sauvegarder les données actuelles si elles existent
    const data = signaturePad.isEmpty() ? null : signaturePad.toData();
    
    // Redimensionner le canvas physique
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    
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
    const formData = {};
    const form = document.getElementById('pvForm');
    const formElements = form.elements;
    
    for (let element of formElements) {
        if (element.name && element.name !== 'signature_reception' && element.name !== 'signature_retour') {
            if (element.type === 'checkbox') {
                formData[element.name] = element.checked;
            } else if (element.type === 'radio') {
                if (element.checked) {
                    formData[element.name] = element.value;
                }
            } else {
                formData[element.name] = element.value;
            }
        }
    }
    
    try {
        localStorage.setItem('pvMaterielFormData', JSON.stringify(formData));
        console.log('Données sauvegardées localement');
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
        const form = document.getElementById('pvForm');
        
        for (let name in formData) {
            const elements = form.elements[name];
            
            if (!elements) continue;
            
            if (elements.length > 1) {
                // Radio buttons
                for (let element of elements) {
                    if (element.value === formData[name]) {
                        element.checked = true;
                    }
                }
            } else {
                const element = elements;
                if (element.type === 'checkbox') {
                    element.checked = formData[name];
                } else {
                    element.value = formData[name];
                }
            }
        }
        
        console.log('Données chargées depuis localStorage');
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
 * Gère l'upload d'une photo : prévisualisation et encodage base64
 * 
 * @param {HTMLInputElement} input - L'input file qui a changé
 */
function handlePhotoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide (JPG, PNG, etc.)');
        input.value = '';
        return;
    }
    
    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        alert('L\'image est trop volumineuse. Taille maximum : 5MB');
        input.value = '';
        return;
    }
    
    // Récupérer le conteneur de prévisualisation
    const previewId = input.dataset.preview;
    const previewContainer = document.getElementById(previewId);
    
    if (!previewContainer) return;
    
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
            
            // Convertir en base64 (JPEG avec qualité 0.85 pour réduire la taille)
            const base64Data = canvas.toDataURL('image/jpeg', 0.85);
            
            // Créer un input hidden pour stocker les données base64
            let hiddenInput = input.parentElement.querySelector(`input[name="${input.name}"]`);
            if (!hiddenInput || hiddenInput === input) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = input.name;
                input.parentElement.appendChild(hiddenInput);
                // Changer le nom de l'input file pour qu'il ne soit pas soumis
                input.removeAttribute('name');
            }
            hiddenInput.value = base64Data;
            
            // Afficher la prévisualisation
            previewContainer.innerHTML = `
                <img src="${base64Data}" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; border-radius: 4px;">
                <button type="button" class="btn btn-sm btn-danger mt-1" onclick="removePhoto('${previewId}', this)">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            `;
        };
        
        img.onerror = function() {
            alert('Erreur lors du chargement de l\'image');
            input.value = '';
        };
        
        img.src = e.target.result;
    };
    
    reader.onerror = function() {
        alert('Erreur lors de la lecture du fichier');
        input.value = '';
    };
    
    reader.readAsDataURL(file);
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
    
    // Trouver l'input file associé
    const inputFile = previewContainer.parentElement.querySelector('.photo-upload');
    if (inputFile) {
        inputFile.value = '';
    }
    
    // Trouver et supprimer l'input hidden
    const hiddenInput = previewContainer.parentElement.querySelector('input[type="hidden"]');
    if (hiddenInput) {
        hiddenInput.remove();
    }
    
    // Vider la prévisualisation
    previewContainer.innerHTML = '';
}

/**
 * Initialise la gestion des PV sauvegardés
 */
function initializePVManagement() {
    // Bouton Sauvegarder
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', savePVDraft);
    }
    
    // Select des PV
    const savedPVSelect = document.getElementById('savedPVSelect');
    if (savedPVSelect) {
        savedPVSelect.addEventListener('change', function() {
            const loadBtn = document.getElementById('loadPVBtn');
            const deleteBtn = document.getElementById('deletePVBtn');
            
            if (this.value) {
                loadBtn.disabled = false;
                deleteBtn.disabled = false;
            } else {
                loadBtn.disabled = true;
                deleteBtn.disabled = true;
            }
        });
    }
    
    // Bouton Charger
    const loadPVBtn = document.getElementById('loadPVBtn');
    if (loadPVBtn) {
        loadPVBtn.addEventListener('click', loadSelectedPV);
    }
    
    // Bouton Supprimer
    const deletePVBtn = document.getElementById('deletePVBtn');
    if (deletePVBtn) {
        deletePVBtn.addEventListener('click', deleteSelectedPV);
    }
    
    // Bouton Nouveau PV
    const newPVBtn = document.getElementById('newPVBtn');
    if (newPVBtn) {
        newPVBtn.addEventListener('click', createNewPV);
    }
    
    // Intercepter la soumission du formulaire
    const pvForm = document.getElementById('pvForm');
    if (pvForm) {
        pvForm.addEventListener('submit', function(e) {
            // Vérifier les champs obligatoires
            const chantier = document.getElementById('chantier').value;
            const emailDest = document.getElementById('email_destinataire').value;
            
            if (!chantier || !emailDest) {
                e.preventDefault();
                alert('Le chantier et l\'email destinataire sont obligatoires pour envoyer le PV.');
                return false;
            }
        });
    }
}

/**
 * Charge la liste des PV sauvegardés
 */
async function loadSavedPVList() {
    try {
        const response = await fetch('/list-pv');
        const data = await response.json();
        
        if (data.success) {
            const select = document.getElementById('savedPVSelect');
            if (!select) return;
            
            // Garder l'option "Nouveau PV"
            select.innerHTML = '<option value="">-- Nouveau PV --</option>';
            
            // Ajouter les PV sauvegardés
            data.pv_list.forEach(pv => {
                const option = document.createElement('option');
                option.value = pv.id;
                
                const date = new Date(pv.updated_at);
                const dateStr = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
                
                option.textContent = `${pv.chantier} - ${dateStr}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la liste des PV:', error);
    }
}

/**
 * Sauvegarde le PV en cours comme brouillon
 */
async function savePVDraft() {
    try {
        const btn = document.getElementById('saveDraftBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sauvegarde...';
        
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
            
            // Afficher message de succès
            showNotification('success', data.message);
            
            // Recharger la liste
            await loadSavedPVList();
            
            // Sélectionner le PV dans la liste
            const select = document.getElementById('savedPVSelect');
            if (select) {
                select.value = currentPVId;
            }
        } else {
            showNotification('danger', data.message);
        }
        
        btn.disabled = false;
        btn.innerHTML = originalText;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        showNotification('danger', 'Erreur lors de la sauvegarde du PV');
        
        const btn = document.getElementById('saveDraftBtn');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder le PV';
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
    
    // Sauvegarder les signatures si présentes
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
 * Charge un PV sélectionné
 */
async function loadSelectedPV() {
    const select = document.getElementById('savedPVSelect');
    const pvId = select.value;
    
    if (!pvId) return;
    
    try {
        const response = await fetch(`/load-pv/${pvId}`);
        const data = await response.json();
        
        if (data.success) {
            const pvData = data.pv_data;
            currentPVId = pvData.id;
            pvStatus = pvData.status || 'draft';
            
            // Remplir le formulaire
            populateForm(pvData.form_data);
            
            // Mettre à jour le statut
            document.getElementById('pvId').value = currentPVId;
            updatePVStatusBadge();
            
            showNotification('success', `PV "${pvData.chantier}" chargé avec succès`);
            
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
 * Remplit le formulaire avec les données
 */
function populateForm(formData) {
    const form = document.getElementById('pvForm');
    
    Object.keys(formData).forEach(key => {
        const value = formData[key];
        
        // Ignorer les champs de signature et photo pour traitement spécial
        if (key === 'signature_reception' || key === 'signature_retour' || key.startsWith('photo_')) {
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
            } else {
                element.value = value;
            }
        }
    });
    
    // Restaurer les photos
    const photoFields = ['photo_carrosserie', 'photo_eclairage', 'photo_pneumatiques', 'photo_panier',
                         'photo_flexibles', 'photo_commandes', 'photo_conformite', 'photo_mobilites',
                         'photo_nacelles', 'photo_securite', 'photo_fuite_reception', 'photo_fuite_retour',
                         'photo_observation_reception', 'photo_observation_retour'];
    
    photoFields.forEach(photoField => {
        if (formData[photoField]) {
            const value = formData[photoField];
            
            // Trouver ou créer l'input hidden
            let hiddenInput = form.querySelector(`input[name="${photoField}"]`);
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = photoField;
                form.appendChild(hiddenInput);
            }
            hiddenInput.value = value;
            
            // Afficher la prévisualisation
            const previewId = `preview_${photoField.replace('photo_', '')}`;
            const previewContainer = document.getElementById(previewId);
            if (previewContainer && value) {
                previewContainer.innerHTML = `
                    <img src="${value}" style="max-width: 100%; max-height: 100px; border: 1px solid #ddd; border-radius: 4px;">
                    <button type="button" class="btn btn-sm btn-danger mt-1" onclick="removePhoto('${previewId}', this)">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                `;
            }
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
 * Supprime le PV sélectionné
 */
async function deleteSelectedPV() {
    const select = document.getElementById('savedPVSelect');
    const pvId = select.value;
    
    if (!pvId) return;
    
    const option = select.options[select.selectedIndex];
    const pvName = option.textContent;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le PV "${pvName}" ?`)) {
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
    
    // Vider les prévisualisations de photos
    document.querySelectorAll('.photo-preview').forEach(preview => {
        preview.innerHTML = '';
    });
    
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
    const badgeContainer = document.getElementById('pvStatusBadge');
    if (!badgeContainer) return;
    
    let badgeHTML = '';
    
    if (pvStatus === 'new') {
        badgeHTML = '<span class="badge bg-secondary"><i class="fas fa-file"></i> Nouveau PV</span>';
    } else if (pvStatus === 'draft') {
        badgeHTML = '<span class="badge bg-warning text-dark"><i class="fas fa-edit"></i> Brouillon sauvegardé</span>';
    }
    
    badgeContainer.innerHTML = badgeHTML;
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
            document.getElementById('smtp_from_name').value = config.smtp_from_name || 'Centrale Lyon Conseil';
            
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
    
    // Désactiver le bouton pendant la sauvegarde
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
    
    try {
        const formData = {
            smtp_server: document.getElementById('smtp_server').value,
            smtp_port: parseInt(document.getElementById('smtp_port').value),
            smtp_username: document.getElementById('smtp_username').value,
            smtp_password: document.getElementById('smtp_password').value,
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
    
    // Désactiver le bouton pendant le test
    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Test en cours...';
    
    try {
        const response = await fetch('/config/smtp/test', {
            method: 'POST'
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


