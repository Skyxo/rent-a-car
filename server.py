"""
Application Flask pour la génération de Procès-Verbaux de Matériel Loué
France Montage - Groupe Briand

Architecture stateless avec génération PDF en mémoire et envoi SMTP.
"""

from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from weasyprint import HTML, CSS
import io
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os
import base64
from PIL import Image
from datetime import datetime
import json
import uuid
from pathlib import Path

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limite 16MB pour protection DoS

# Répertoires de stockage
SAVED_PV_DIR = Path('saved_pv')
SAVED_PV_DIR.mkdir(exist_ok=True)

CONFIG_DIR = Path('config')
CONFIG_DIR.mkdir(exist_ok=True)
SMTP_CONFIG_FILE = CONFIG_DIR / 'smtp_config.json'

# Chargement de la configuration SMTP
def load_smtp_config():
    """Charge la configuration SMTP depuis le fichier JSON"""
    if SMTP_CONFIG_FILE.exists():
        try:
            with open(SMTP_CONFIG_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    # Configuration par défaut
    return {
        'smtp_server': os.environ.get('SMTP_SERVER', 'smtp.gmail.com'),
        'smtp_port': int(os.environ.get('SMTP_PORT', '587')),
        'smtp_username': os.environ.get('SMTP_USERNAME', ''),
        'smtp_password': os.environ.get('SMTP_PASSWORD', ''),
        'smtp_from_name': os.environ.get('SMTP_FROM_NAME', 'France Montage')
    }

def save_smtp_config(config):
    """Sauvegarde la configuration SMTP dans le fichier JSON"""
    with open(SMTP_CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

# Configuration SMTP globale
smtp_config = load_smtp_config()

SMTP_SERVER = smtp_config.get('smtp_server', 'smtp.gmail.com')
SMTP_PORT = smtp_config.get('smtp_port', 587)
SMTP_USERNAME = smtp_config.get('smtp_username', '')
SMTP_PASSWORD = smtp_config.get('smtp_password', '')
SMTP_FROM_NAME = smtp_config.get('smtp_from_name', 'Centrale Lyon Conseil')


def optimize_signature(base64_string):
    """
    Optimise une signature Base64 pour réduire la taille du PDF.
    
    Args:
        base64_string: Chaîne Base64 de l'image (format data:image/png;base64,...)
        
    Returns:
        Chaîne Base64 optimisée
    """
    try:
        # Extraire les données Base64 (supprimer le préfixe data:image/png;base64,)
        if ',' in base64_string:
            header, encoded = base64_string.split(',', 1)
        else:
            encoded = base64_string
        
        # Décoder l'image
        image_data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_data))
        
        # Redimensionner si trop large (max 400px de large)
        if image.width > 400:
            ratio = 400 / image.width
            new_size = (400, int(image.height * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Sauvegarder avec optimisation
        output = io.BytesIO()
        image.save(output, format='PNG', optimize=True)
        output.seek(0)
        
        # Ré-encoder en Base64
        optimized_b64 = base64.b64encode(output.read()).decode('utf-8')
        return f"data:image/png;base64,{optimized_b64}"
    
    except Exception as e:
        print(f"Erreur lors de l'optimisation de la signature: {e}")
        return base64_string  # Retourner l'original en cas d'erreur


def send_email_with_pdf(pdf_bytes, recipients, chantier_name, date_reception):
    """
    Envoie le PDF généré par email via SMTP.
    
    Args:
        pdf_bytes: Contenu binaire du PDF
        recipients: Liste d'adresses email des destinataires ou une seule adresse
        chantier_name: Nom du chantier (pour le sujet)
        date_reception: Date de réception (pour le nom de fichier)
        
    Returns:
        tuple: (success: bool, message: str)
    """
    # Recharger la configuration SMTP depuis le fichier
    config = load_smtp_config()
    smtp_server = config.get('smtp_server', 'smtp.gmail.com')
    smtp_port = config.get('smtp_port', 587)
    smtp_username = config.get('smtp_username', '')
    smtp_password = config.get('smtp_password', '')
    smtp_from_name = config.get('smtp_from_name', 'Centrale Lyon Conseil')
    
    if not smtp_username or not smtp_password:
        return False, """⚠️ Configuration email non configurée. Cliquez sur "⚙️ Configuration Email" en haut de la page pour activer l'envoi automatique par email."""
    
    # Convertir en liste si c'est une seule adresse
    if isinstance(recipients, str):
        recipients = [recipients]
    
    try:
        # Construire le message MIME
        msg = MIMEMultipart()
        msg['From'] = f"{smtp_from_name} <{smtp_username}>"
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = f"PV Matériel Loué - {chantier_name} - {date_reception}"
        
        # Corps du message
        body = f"""
Bonjour,

Veuillez trouver ci-joint le Procès-Verbal de matériel loué pour le chantier : {chantier_name}

Date de réception : {date_reception}

Ce document a été généré automatiquement par l'application de gestion France Montage - Groupe Briand.

Cordialement,
L'équipe France Montage
        """
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # Attacher le PDF
        filename = f"PV_Materiel_{chantier_name.replace(' ', '_')}_{date_reception}.pdf"
        pdf_attachment = MIMEApplication(pdf_bytes, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment', filename=filename)
        msg.attach(pdf_attachment)
        
        # Connexion au serveur SMTP et envoi
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()  # Sécuriser la connexion
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
        
        recipients_str = ', '.join(recipients)
        return True, f"Email envoyé avec succès à {recipients_str}"
    
    except smtplib.SMTPAuthenticationError:
        return False, "Erreur d'authentification SMTP. Vérifier les identifiants."
    except smtplib.SMTPException as e:
        return False, f"Erreur SMTP: {str(e)}"
    except Exception as e:
        return False, f"Erreur lors de l'envoi: {str(e)}"


@app.route('/')
def index():
    """Affiche le formulaire de saisie du PV."""
    return render_template('index.html')


@app.route('/submit', methods=['POST'])
def submit():
    """
    Traite la soumission du formulaire, génère le PDF et l'envoie par email.
    """
    try:
        # Récupération des données du formulaire
        form_data = {
            # Métadonnées
            'chantier': request.form.get('chantier', ''),
            'date_reception': request.form.get('date_reception', ''),
            'date_retour': request.form.get('date_retour', ''),
            'materiel_numero': request.form.get('materiel_numero', ''),
            'materiel_type': request.form.get('materiel_type', ''),
            'fournisseur': request.form.get('fournisseur', ''),
            'responsable': request.form.get('responsable', ''),
            'email_destinataire': request.form.get('email_destinataire', ''),
            'email_conducteur': request.form.get('email_conducteur', ''),
            
            # Compteurs
            'compteur_reception': request.form.get('compteur_reception', ''),
            'compteur_retour': request.form.get('compteur_retour', ''),
            
            # État - Réception
            'carrosserie_reception': request.form.get('carrosserie_reception', ''),
            'eclairage_reception': request.form.get('eclairage_reception', ''),
            'pneumatiques_reception': request.form.get('pneumatiques_reception', ''),
            'panier_reception': request.form.get('panier_reception', ''),
            'flexibles_reception': request.form.get('flexibles_reception', ''),
            'commandes_reception': request.form.get('commandes_reception', ''),
            'conformite_reception': request.form.get('conformite_reception', ''),
            'mobilites_reception': request.form.get('mobilites_reception', ''),
            'nacelles_reception': request.form.get('nacelles_reception', ''),
            'securite_reception': request.form.get('securite_reception', ''),
            
            # État - Retour
            'carrosserie_retour': request.form.get('carrosserie_retour', ''),
            'eclairage_retour': request.form.get('eclairage_retour', ''),
            'pneumatiques_retour': request.form.get('pneumatiques_retour', ''),
            'panier_retour': request.form.get('panier_retour', ''),
            'flexibles_retour': request.form.get('flexibles_retour', ''),
            'commandes_retour': request.form.get('commandes_retour', ''),
            'conformite_retour': request.form.get('conformite_retour', ''),
            'mobilites_retour': request.form.get('mobilites_retour', ''),
            'nacelles_retour': request.form.get('nacelles_retour', ''),
            'securite_retour': request.form.get('securite_retour', ''),
            
            # Fluides - Réception
            'carburant_reception': request.form.get('carburant_reception', ''),
            'fuite_moteur_reception': request.form.get('fuite_moteur_reception', 'non'),
            'fuite_hydraulique_reception': request.form.get('fuite_hydraulique_reception', 'non'),
            'fuite_gasoil_reception': request.form.get('fuite_gasoil_reception', 'non'),
            
            # Fluides - Retour
            'carburant_retour': request.form.get('carburant_retour', ''),
            'fuite_moteur_retour': request.form.get('fuite_moteur_retour', 'non'),
            'fuite_hydraulique_retour': request.form.get('fuite_hydraulique_retour', 'non'),
            'fuite_gasoil_retour': request.form.get('fuite_gasoil_retour', 'non'),
            
            # Observations
            'observations_reception': request.form.get('observations_reception', ''),
            'observations_retour': request.form.get('observations_retour', ''),
            
            # Signatures
            'signature_reception': request.form.get('signature_reception', ''),
            'signature_retour': request.form.get('signature_retour', ''),
        }
        
        # Récupérer toutes les photos (qui peuvent avoir des noms comme photo_carrosserie_reception_1, photo_carrosserie_reception_2, etc.)
        photo_base_fields = ['carrosserie_reception', 'carrosserie_retour',
                             'eclairage_reception', 'eclairage_retour',
                             'pneumatiques_reception', 'pneumatiques_retour',
                             'panier_reception', 'panier_retour',
                             'flexibles_reception', 'flexibles_retour',
                             'commandes_reception', 'commandes_retour',
                             'conformite_reception', 'conformite_retour',
                             'mobilites_reception', 'mobilites_retour',
                             'nacelles_reception', 'nacelles_retour',
                             'securite_reception', 'securite_retour',
                             'fuite_reception', 'fuite_retour',
                             'observation_reception', 'observation_retour']
        
        for field in photo_base_fields:
            # Collecter toutes les photos pour ce champ
            photos = []
            for key in request.form.keys():
                if key.startswith(f'photo_{field}'):
                    photo_data = request.form.get(key, '')
                    if photo_data:
                        photos.append(photo_data)
            
            # Stocker la liste des photos
            form_data[f'photo_{field}'] = photos if photos else []
        
        # Validation des champs obligatoires
        if not form_data['chantier']:
            flash('Le chantier est obligatoire', 'danger')
            return redirect(url_for('index'))
        
        if not form_data.get('email_conducteur'):
            flash('L\'email du conducteur de travaux est obligatoire', 'danger')
            return redirect(url_for('index'))
        
        # Optimiser les signatures si présentes
        if form_data['signature_reception']:
            form_data['signature_reception'] = optimize_signature(form_data['signature_reception'])
        
        if form_data['signature_retour']:
            form_data['signature_retour'] = optimize_signature(form_data['signature_retour'])
        
        # Optimiser les photos si présentes
        for field in photo_base_fields:
            photo_key = f'photo_{field}'
            if photo_key in form_data and form_data[photo_key]:
                # Optimiser chaque photo dans la liste
                optimized_photos = []
                for photo in form_data[photo_key]:
                    if photo:
                        optimized_photos.append(optimize_signature(photo))
                form_data[photo_key] = optimized_photos
        
        # Ajouter la date de génération
        form_data['date_generation'] = datetime.now().strftime('%d/%m/%Y %H:%M')
        
        # Générer le HTML pour le PDF
        html_content = render_template('pdf_template.html', **form_data)
        
        # Générer le PDF en mémoire avec WeasyPrint
        # Utiliser base_url pour permettre à WeasyPrint de résoudre les chemins relatifs des images
        base_url = request.url_root
        pdf_bytes = HTML(string=html_content, base_url=base_url).write_pdf()
        
        # Préparer la liste des destinataires (seulement le conducteur de travaux)
        recipients = [form_data['email_conducteur']]
        
        # Envoyer le PDF par email
        success, message = send_email_with_pdf(
            pdf_bytes,
            recipients,
            form_data['chantier'],
            form_data['date_reception'] or 'Non spécifiée'
        )
        
        if success:
            flash(message, 'success')
            
            # Sauvegarder le PV après envoi réussi
            pv_id = request.form.get('pv_id')
            if not pv_id:
                # Générer un nouvel ID si le PV n'en a pas
                pv_id = str(uuid.uuid4())
            
            # Préparer les données pour la sauvegarde
            pv_data = {
                'id': pv_id,
                'chantier': form_data['chantier'],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'status': 'sent',  # Marquer comme envoyé
                'form_data': form_data
            }
            
            # Sauvegarder dans un fichier JSON
            file_path = SAVED_PV_DIR / f"{pv_id}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(pv_data, f, ensure_ascii=False, indent=2)
        else:
            flash(message, 'danger')
        
        return redirect(url_for('index'))
    
    except Exception as e:
        flash(f'Erreur lors de la génération du PV: {str(e)}', 'danger')
        print(f"Erreur complète: {e}")
        import traceback
        traceback.print_exc()
        return redirect(url_for('index'))


@app.route('/health')
def health():
    """Endpoint de santé pour vérifier que l'application fonctionne."""
    return jsonify({
        'status': 'healthy',
        'smtp_configured': bool(SMTP_USERNAME and SMTP_PASSWORD)
    })


@app.route('/config/smtp', methods=['GET'])
def get_smtp_config():
    """Récupère la configuration SMTP (sans le mot de passe)."""
    config = load_smtp_config()
    # Ne pas retourner le mot de passe pour des raisons de sécurité
    safe_config = {
        'smtp_server': config.get('smtp_server', ''),
        'smtp_port': config.get('smtp_port', 587),
        'smtp_username': config.get('smtp_username', ''),
        'smtp_from_name': config.get('smtp_from_name', 'Centrale Lyon Conseil'),
        'has_password': bool(config.get('smtp_password', ''))
    }
    return jsonify(safe_config)


@app.route('/config/smtp', methods=['POST'])
def update_smtp_config():
    """Met à jour la configuration SMTP."""
    try:
        data = request.get_json()
        
        # Charger la config existante
        config = load_smtp_config()
        
        # Mettre à jour les champs fournis
        if 'smtp_server' in data:
            config['smtp_server'] = data['smtp_server']
        if 'smtp_port' in data:
            config['smtp_port'] = int(data['smtp_port'])
        if 'smtp_username' in data:
            config['smtp_username'] = data['smtp_username']
        if 'smtp_password' in data and data['smtp_password']:  # Ne pas écraser si vide
            config['smtp_password'] = data['smtp_password']
        if 'smtp_from_name' in data:
            config['smtp_from_name'] = data['smtp_from_name']
        
        # Sauvegarder la configuration
        save_smtp_config(config)
        
        # Recharger les variables globales
        global smtp_config, SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_NAME
        smtp_config = config
        SMTP_SERVER = config.get('smtp_server', 'smtp.gmail.com')
        SMTP_PORT = config.get('smtp_port', 587)
        SMTP_USERNAME = config.get('smtp_username', '')
        SMTP_PASSWORD = config.get('smtp_password', '')
        SMTP_FROM_NAME = config.get('smtp_from_name', 'Centrale Lyon Conseil')
        
        return jsonify({
            'success': True,
            'message': 'Configuration SMTP mise à jour avec succès'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la mise à jour : {str(e)}'
        }), 500


@app.route('/config/smtp/test', methods=['POST'])
def test_smtp_config():
    """Teste la connexion SMTP avec les paramètres fournis ou configurés."""
    try:
        data = request.get_json() or {}
        
        # Utiliser les paramètres fournis dans la requête, sinon la config enregistrée
        if data.get('smtp_server'):
            # Tester avec les paramètres du formulaire
            smtp_server = data.get('smtp_server')
            smtp_port = int(data.get('smtp_port', 587))
            smtp_username = data.get('smtp_username')
            smtp_password = data.get('smtp_password')
        else:
            # Tester avec la configuration enregistrée
            config = load_smtp_config()
            smtp_server = config.get('smtp_server')
            smtp_port = config.get('smtp_port')
            smtp_username = config.get('smtp_username')
            smtp_password = config.get('smtp_password')
        
        if not smtp_username or not smtp_password:
            return jsonify({
                'success': False,
                'message': 'Configuration SMTP incomplète. Veuillez remplir tous les champs.'
            }), 400
        
        # Tester la connexion
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
        
        return jsonify({
            'success': True,
            'message': 'Connexion SMTP réussie ! ✓'
        })
        
    except smtplib.SMTPAuthenticationError:
        return jsonify({
            'success': False,
            'message': 'Erreur d\'authentification. Vérifiez vos identifiants (email et mot de passe).'
        }), 401
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur de connexion : {str(e)}'
        }), 500


@app.route('/save', methods=['POST'])
def save_pv():
    """
    Sauvegarde un PV en cours de rédaction.
    Permet de reprendre l'édition plus tard.
    """
    try:
        data = request.get_json()
        
        # Générer un ID unique si nouveau PV
        pv_id = data.get('pv_id') or str(uuid.uuid4())
        
        # Ajouter des métadonnées
        pv_data = {
            'id': pv_id,
            'chantier': data.get('chantier', 'Sans nom'),
            'created_at': data.get('created_at', datetime.now().isoformat()),
            'updated_at': datetime.now().isoformat(),
            'status': 'draft',
            'form_data': data
        }
        
        # Sauvegarder dans un fichier JSON
        file_path = SAVED_PV_DIR / f"{pv_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(pv_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'success': True,
            'message': f'PV "{pv_data["chantier"]}" sauvegardé avec succès',
            'pv_id': pv_id,
            'chantier': pv_data['chantier']
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la sauvegarde: {str(e)}'
        }), 500


@app.route('/list-pv', methods=['GET'])
def list_pv():
    """
    Liste tous les PV sauvegardés.
    """
    try:
        pv_list = []
        
        for file_path in SAVED_PV_DIR.glob('*.json'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    pv_data = json.load(f)
                    pv_list.append({
                        'id': pv_data['id'],
                        'chantier': pv_data.get('chantier', 'Sans nom'),
                        'created_at': pv_data.get('created_at', ''),
                        'updated_at': pv_data.get('updated_at', ''),
                        'status': pv_data.get('status', 'draft')
                    })
            except Exception as e:
                print(f"Erreur lors de la lecture de {file_path}: {e}")
                continue
        
        # Trier par date de mise à jour (plus récent en premier)
        pv_list.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'pv_list': pv_list
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors du chargement de la liste: {str(e)}'
        }), 500


@app.route('/load-pv/<pv_id>', methods=['GET'])
def load_pv(pv_id):
    """
    Charge un PV spécifique.
    """
    try:
        file_path = SAVED_PV_DIR / f"{pv_id}.json"
        
        if not file_path.exists():
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            pv_data = json.load(f)
        
        return jsonify({
            'success': True,
            'pv_data': pv_data
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors du chargement: {str(e)}'
        }), 500


@app.route('/delete-pv/<pv_id>', methods=['DELETE'])
def delete_pv(pv_id):
    """
    Supprime un PV sauvegardé.
    """
    try:
        file_path = SAVED_PV_DIR / f"{pv_id}.json"
        
        if not file_path.exists():
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        # Lire le nom du chantier avant de supprimer
        with open(file_path, 'r', encoding='utf-8') as f:
            pv_data = json.load(f)
            chantier = pv_data.get('chantier', 'Sans nom')
        
        file_path.unlink()
        
        return jsonify({
            'success': True,
            'message': f'PV "{chantier}" supprimé avec succès'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la suppression: {str(e)}'
        }), 500


@app.route('/download-pdf', methods=['POST'])
def download_pdf():
    """
    Génère et télécharge le PDF du PV sans l'envoyer par email.
    """
    try:
        # Récupération des données du formulaire (même logique que submit)
        form_data = {
            # Métadonnées
            'chantier': request.form.get('chantier', ''),
            'date_reception': request.form.get('date_reception', ''),
            'date_retour': request.form.get('date_retour', ''),
            'materiel_numero': request.form.get('materiel_numero', ''),
            'materiel_type': request.form.get('materiel_type', ''),
            'fournisseur': request.form.get('fournisseur', ''),
            'responsable': request.form.get('responsable', ''),
            'email_destinataire': request.form.get('email_destinataire', ''),
            'email_conducteur': request.form.get('email_conducteur', ''),
            
            # Compteurs
            'compteur_reception': request.form.get('compteur_reception', ''),
            'compteur_retour': request.form.get('compteur_retour', ''),
            
            # État - Réception
            'carrosserie_reception': request.form.get('carrosserie_reception', ''),
            'eclairage_reception': request.form.get('eclairage_reception', ''),
            'pneumatiques_reception': request.form.get('pneumatiques_reception', ''),
            'panier_reception': request.form.get('panier_reception', ''),
            'flexibles_reception': request.form.get('flexibles_reception', ''),
            'commandes_reception': request.form.get('commandes_reception', ''),
            'conformite_reception': request.form.get('conformite_reception', ''),
            'mobilites_reception': request.form.get('mobilites_reception', ''),
            'nacelles_reception': request.form.get('nacelles_reception', ''),
            'securite_reception': request.form.get('securite_reception', ''),
            
            # État - Retour
            'carrosserie_retour': request.form.get('carrosserie_retour', ''),
            'eclairage_retour': request.form.get('eclairage_retour', ''),
            'pneumatiques_retour': request.form.get('pneumatiques_retour', ''),
            'panier_retour': request.form.get('panier_retour', ''),
            'flexibles_retour': request.form.get('flexibles_retour', ''),
            'commandes_retour': request.form.get('commandes_retour', ''),
            'conformite_retour': request.form.get('conformite_retour', ''),
            'mobilites_retour': request.form.get('mobilites_retour', ''),
            'nacelles_retour': request.form.get('nacelles_retour', ''),
            'securite_retour': request.form.get('securite_retour', ''),
            
            # Fluides - Réception
            'carburant_reception': request.form.get('carburant_reception', ''),
            'fuite_moteur_reception': request.form.get('fuite_moteur_reception', 'non'),
            'fuite_hydraulique_reception': request.form.get('fuite_hydraulique_reception', 'non'),
            'fuite_gasoil_reception': request.form.get('fuite_gasoil_reception', 'non'),
            
            # Fluides - Retour
            'carburant_retour': request.form.get('carburant_retour', ''),
            'fuite_moteur_retour': request.form.get('fuite_moteur_retour', 'non'),
            'fuite_hydraulique_retour': request.form.get('fuite_hydraulique_retour', 'non'),
            'fuite_gasoil_retour': request.form.get('fuite_gasoil_retour', 'non'),
            
            # Observations
            'observations_reception': request.form.get('observations_reception', ''),
            'observations_retour': request.form.get('observations_retour', ''),
            
            # Signatures
            'signature_reception': request.form.get('signature_reception', ''),
            'signature_retour': request.form.get('signature_retour', ''),
        }
        
        # Récupérer toutes les photos
        photo_base_fields = ['carrosserie_reception', 'carrosserie_retour',
                             'eclairage_reception', 'eclairage_retour',
                             'pneumatiques_reception', 'pneumatiques_retour',
                             'panier_reception', 'panier_retour',
                             'flexibles_reception', 'flexibles_retour',
                             'commandes_reception', 'commandes_retour',
                             'conformite_reception', 'conformite_retour',
                             'mobilites_reception', 'mobilites_retour',
                             'nacelles_reception', 'nacelles_retour',
                             'securite_reception', 'securite_retour',
                             'fuite_reception', 'fuite_retour',
                             'observation_reception', 'observation_retour']
        
        for field in photo_base_fields:
            photos = []
            for key in request.form.keys():
                if key.startswith(f'photo_{field}'):
                    photo_data = request.form.get(key, '')
                    if photo_data:
                        photos.append(photo_data)
            form_data[f'photo_{field}'] = photos if photos else []
        
        # Validation du champ obligatoire
        if not form_data['chantier']:
            return jsonify({
                'success': False,
                'message': 'Le chantier est obligatoire'
            }), 400
        
        # Optimiser les signatures si présentes
        if form_data['signature_reception']:
            form_data['signature_reception'] = optimize_signature(form_data['signature_reception'])
        
        if form_data['signature_retour']:
            form_data['signature_retour'] = optimize_signature(form_data['signature_retour'])
        
        # Optimiser les photos si présentes
        for field in photo_base_fields:
            photo_key = f'photo_{field}'
            if photo_key in form_data and form_data[photo_key]:
                optimized_photos = []
                for photo in form_data[photo_key]:
                    if photo:
                        optimized_photos.append(optimize_signature(photo))
                form_data[photo_key] = optimized_photos
        
        # Ajouter la date de génération
        form_data['date_generation'] = datetime.now().strftime('%d/%m/%Y %H:%M')
        
        # Générer le HTML pour le PDF
        html_content = render_template('pdf_template.html', **form_data)
        
        # Générer le PDF en mémoire avec WeasyPrint
        base_url = request.url_root
        pdf_bytes = HTML(string=html_content, base_url=base_url).write_pdf()
        
        # Créer un nom de fichier sécurisé
        chantier_safe = "".join(c for c in form_data['chantier'] if c.isalnum() or c in (' ', '-', '_')).strip()
        date_str = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"PV_{chantier_safe}_{date_str}.pdf"
        
        # Sauvegarder le PV avant le téléchargement
        pv_id = request.form.get('pv_id')
        if not pv_id:
            # Générer un nouvel ID si le PV n'en a pas
            pv_id = str(uuid.uuid4())
        
        # Préparer les données pour la sauvegarde
        pv_data = {
            'id': pv_id,
            'chantier': form_data['chantier'],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'status': 'downloaded',  # Marquer comme téléchargé
            'form_data': form_data
        }
        
        # Sauvegarder dans un fichier JSON
        file_path = SAVED_PV_DIR / f"{pv_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(pv_data, f, ensure_ascii=False, indent=2)
        
        # Retourner le PDF en base64 pour le téléchargement côté client
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        return jsonify({
            'success': True,
            'pdf_data': pdf_base64,
            'filename': filename,
            'pv_id': pv_id
        })
    
    except Exception as e:
        print(f"Erreur lors de la génération du PDF: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la génération du PDF: {str(e)}'
        }), 500



if __name__ == '__main__':
    # En développement uniquement
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
