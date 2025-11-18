/**
 * Script JavaScript pour l'application PV Matériel Loué
 * Centrale Lyon Conseil
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

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', function() {
    initializeSignaturePads();
    initializeFormPersistence();
    initializeFormValidation();
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
 * Confirmation avant de quitter la page avec des données non sauvegardées
 */
window.addEventListener('beforeunload', function(event) {
    // Vérifier si des signatures sont présentes mais non soumises
    if (signaturePadReception && !signaturePadReception.isEmpty() ||
        signaturePadRetour && !signaturePadRetour.isEmpty()) {
        
        const formSubmitted = sessionStorage.getItem('formSubmitted');
        if (!formSubmitted) {
            event.preventDefault();
            event.returnValue = 'Vous avez des signatures non soumises. Voulez-vous vraiment quitter ?';
            return event.returnValue;
        }
    }
});

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
