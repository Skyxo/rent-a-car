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

# Import SQLAlchemy et modèle PV
from setup_db import db, PV, PVVersion, init_db

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limite 16MB pour protection DoS

# Configuration SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pvs.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialiser la base de données
init_db(app)

# Répertoire de configuration
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
            'email_conducteur': request.form.getlist('email_conducteur'),  # Liste d'emails
            'email_entreprise': request.form.get('email_entreprise', ''),
            
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
            
            # Signatures - vérifier d'abord dans files (envoi depuis JS), puis dans form (sauvegarde JSON)
            'signature_reception': '',
            'signature_retour': '',
        }
        
        # Gérer les signatures qui peuvent venir de request.files (Blob) ou request.form (base64)
        if 'signature_reception' in request.files:
            sig_file = request.files['signature_reception']
            if sig_file and sig_file.filename:
                # Lire le fichier et le convertir en base64

                sig_data = sig_file.read()
                form_data['signature_reception'] = f"data:image/png;base64,{base64.b64encode(sig_data).decode('utf-8')}"
        elif request.form.get('signature_reception'):
            form_data['signature_reception'] = request.form.get('signature_reception', '')
        
        if 'signature_retour' in request.files:
            sig_file = request.files['signature_retour']
            if sig_file and sig_file.filename:
                # Lire le fichier et le convertir en base64

                sig_data = sig_file.read()
                form_data['signature_retour'] = f"data:image/png;base64,{base64.b64encode(sig_data).decode('utf-8')}"
        elif request.form.get('signature_retour'):
            form_data['signature_retour'] = request.form.get('signature_retour', '')
        
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
                             'carburant_reception', 'carburant_retour',
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
        
        if not form_data.get('email_conducteur') or len(form_data.get('email_conducteur', [])) == 0:
            flash('Au moins un email destinataire est obligatoire', 'danger')
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
        
        # Récupérer la version courante ou créer la version 1
        pv_id = request.form.get('pv_id')
        version_number = 1
        if pv_id:
            existing_pv = PV.query.get(pv_id)
            if existing_pv:
                version_number = existing_pv.version_courante + 1
        
        # Ajouter les infos de version au template
        form_data['version_info'] = {
            'number': version_number,
            'date': datetime.now().strftime('%d/%m/%Y %H:%M')
        }
        
        # Générer le HTML pour le PDF
        html_content = render_template('pdf_template.html', **form_data)
        
        # Générer le PDF en mémoire avec WeasyPrint
        # Utiliser base_url pour permettre à WeasyPrint de résoudre les chemins relatifs des images
        base_url = request.url_root
        pdf_bytes = HTML(string=html_content, base_url=base_url).write_pdf()
        
        # Préparer la liste des destinataires (tous les emails conducteur + email entreprise)
        recipients = [email.strip() for email in form_data.get('email_conducteur', []) if email.strip()]
        email_entreprise = form_data.get('email_entreprise', '').strip()
        if email_entreprise and email_entreprise not in recipients:
            recipients.append(email_entreprise)
        
        # Envoyer le PDF par email
        success, message = send_email_with_pdf(
            pdf_bytes,
            recipients,
            form_data['chantier'],
            form_data['date_reception'] or 'Non spécifiée'
        )
        
        if success:
            flash(message, 'success')
            
            # Sauvegarder le PV après envoi réussi dans la base de données
            pv_id = request.form.get('pv_id')
            if not pv_id:
                # Générer un nouvel ID si le PV n'en a pas
                pv_id = str(uuid.uuid4())
            
            try:
                # Vérifier si le PV existe déjà
                existing_pv = PV.query.get(pv_id)
                
                if existing_pv:
                    # Créer une nouvelle version avant la mise à jour
                    new_version_number = existing_pv.version_courante + 1
                    
                    # Sauvegarder l'état actuel comme version
                    version_data = existing_pv.get_data()
                    version_data['version_info'] = {
                        'number': existing_pv.version_courante,
                        'date': datetime.now().isoformat(),
                        'sent_to': ', '.join(recipients)
                    }
                    
                    new_version = PVVersion(
                        pv_id=pv_id,
                        version_number=existing_pv.version_courante,
                        data_dict=version_data,
                        created_by='email_send',
                        comment=f"Envoyé à {', '.join(recipients)}"
                    )
                    db.session.add(new_version)
                    
                    # Mise à jour d'un PV existant avec nouvelle version
                    existing_pv.chantier = form_data['chantier']
                    existing_pv.date_dernier_envoi = datetime.now()
                    existing_pv.version_courante = new_version_number
                    
                    # Mettre à jour les champs indexés
                    indexed_fields = PV.extract_indexed_fields(form_data)
                    existing_pv.conducteur_email = indexed_fields.get('conducteur_email')
                    existing_pv.entreprise_email = indexed_fields.get('entreprise_email')
                    existing_pv.responsable = indexed_fields.get('responsable')
                    existing_pv.fournisseur = indexed_fields.get('fournisseur')
                    existing_pv.materiel_type = indexed_fields.get('materiel_type')
                    existing_pv.date_reception = indexed_fields.get('date_reception')
                    existing_pv.date_retour = indexed_fields.get('date_retour')
                    existing_pv.statut = indexed_fields.get('statut')
                    
                    # Mettre à jour le JSON complet avec info de version
                    pv_dict = existing_pv.get_data()
                    pv_dict['form_data'] = form_data
                    pv_dict['updated_at'] = datetime.now().isoformat()
                    pv_dict['last_sent_date'] = datetime.now().isoformat()
                    pv_dict['version_info'] = {
                        'number': new_version_number,
                        'date': datetime.now().isoformat(),
                        'sent_to': ', '.join(recipients)
                    }
                    existing_pv.set_data(pv_dict)
                    
                else:
                    # Créer un nouveau PV (Version 1)
                    indexed_fields = PV.extract_indexed_fields(form_data)
                    
                    pv_dict = {
                        'id': pv_id,
                        'chantier': form_data['chantier'],
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat(),
                        'last_sent_date': datetime.now().isoformat(),
                        'form_data': form_data,
                        'version_info': {
                            'number': 1,
                            'date': datetime.now().isoformat(),
                            'sent_to': ', '.join(recipients)
                        }
                    }
                    
                    new_pv = PV(
                        id=pv_id,
                        chantier=form_data['chantier'],
                        data_dict=pv_dict,
                        conducteur_email=indexed_fields.get('conducteur_email'),
                        entreprise_email=indexed_fields.get('entreprise_email'),
                        responsable=indexed_fields.get('responsable'),
                        fournisseur=indexed_fields.get('fournisseur'),
                        materiel_type=indexed_fields.get('materiel_type'),
                        date_reception=indexed_fields.get('date_reception'),
                        date_retour=indexed_fields.get('date_retour'),
                        statut=indexed_fields.get('statut'),
                        date_dernier_envoi=datetime.now()
                    )
                    db.session.add(new_pv)
                
                # Commit des changements
                db.session.commit()
                
            except Exception as db_error:
                db.session.rollback()
                print(f"Erreur lors de la sauvegarde DB: {db_error}")
                flash(f"Attention: email envoyé mais erreur de sauvegarde: {db_error}", 'warning')
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
    Sauvegarde un PV en cours de rédaction dans la base de données.
    Permet de reprendre l'édition plus tard.
    """
    try:
        data = request.get_json()
        
        # Générer un ID unique si nouveau PV
        pv_id = data.get('pv_id') or str(uuid.uuid4())
        chantier = data.get('chantier', 'Sans nom')
        
        # Vérifier si le PV existe déjà
        existing_pv = PV.query.get(pv_id)
        
        if existing_pv:
            # Mise à jour d'un PV existant
            existing_pv.chantier = chantier
            
            # Mettre à jour les champs indexés
            indexed_fields = PV.extract_indexed_fields(data)
            existing_pv.conducteur_email = indexed_fields.get('conducteur_email')
            existing_pv.entreprise_email = indexed_fields.get('entreprise_email')
            existing_pv.responsable = indexed_fields.get('responsable')
            existing_pv.fournisseur = indexed_fields.get('fournisseur')
            existing_pv.materiel_type = indexed_fields.get('materiel_type')
            existing_pv.date_reception = indexed_fields.get('date_reception')
            existing_pv.date_retour = indexed_fields.get('date_retour')
            existing_pv.statut = indexed_fields.get('statut')
            
            # Mettre à jour la date VGP si présente
            if 'vgp_date' in data:
                existing_pv.vgp_date = data.get('vgp_date') or None
            
            # Mettre à jour explicitement la date de mise à jour (important pour l'affichage de la version courante)
            existing_pv.date_mise_a_jour = datetime.utcnow()
            
            # Mettre à jour le JSON complet
            pv_dict = existing_pv.get_data()
            pv_dict['form_data'] = data
            pv_dict['updated_at'] = datetime.now().isoformat()
            existing_pv.set_data(pv_dict)
            
        else:
            # Créer un nouveau PV
            indexed_fields = PV.extract_indexed_fields(data)
            
            pv_dict = {
                'id': pv_id,
                'chantier': chantier,
                'created_at': data.get('created_at', datetime.now().isoformat()),
                'updated_at': datetime.now().isoformat(),
                'last_sent_date': None,
                'form_data': data
            }
            
            new_pv = PV(
                id=pv_id,
                chantier=chantier,
                data_dict=pv_dict,
                conducteur_email=indexed_fields.get('conducteur_email'),
                entreprise_email=indexed_fields.get('entreprise_email'),
                responsable=indexed_fields.get('responsable'),
                fournisseur=indexed_fields.get('fournisseur'),
                materiel_type=indexed_fields.get('materiel_type'),
                date_reception=indexed_fields.get('date_reception'),
                date_retour=indexed_fields.get('date_retour'),
                statut=indexed_fields.get('statut'),
                vgp_date=data.get('vgp_date') or None
            )
            db.session.add(new_pv)
        
        # Commit des changements
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'PV "{chantier}" sauvegardé avec succès',
            'pv_id': pv_id,
            'chantier': chantier
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la sauvegarde: {str(e)}'
        }), 500


@app.route('/list-pv', methods=['GET'])
def list_pv():
    """
    Liste tous les PV sauvegardés depuis la base de données.
    """
    try:
        # Requête SQL avec tri par date de mise à jour
        pvs = PV.query.order_by(PV.date_mise_a_jour.desc()).all()
        
        pv_list = []
        for pv in pvs:
            # Récupérer le JSON complet
            pv_dict = pv.get_data()
            form_data = pv_dict.get('form_data', {})
            
            # Déterminer l'état de complétion
            has_reception = bool(form_data.get('signature_reception'))
            has_retour = bool(form_data.get('signature_retour'))
            
            pv_list.append({
                'id': pv.id,
                'chantier': pv.chantier,
                'email_conducteur': pv.conducteur_email or form_data.get('email_conducteur', ''),
                'responsable': pv.responsable or form_data.get('responsable', ''),
                'fournisseur': pv.fournisseur or form_data.get('fournisseur', ''),
                'materiel_numero': form_data.get('materiel_numero', ''),
                'materiel_type': pv.materiel_type or form_data.get('materiel_type', ''),
                'date_reception': pv.date_reception or form_data.get('date_reception', ''),
                'date_retour': pv.date_retour or form_data.get('date_retour', ''),
                'created_at': pv.date_creation.isoformat() if pv.date_creation else '',
                'updated_at': pv.date_mise_a_jour.isoformat() if pv.date_mise_a_jour else '',
                'last_sent_date': pv.date_dernier_envoi.isoformat() if pv.date_dernier_envoi else None,
                'completion_status': pv.statut,
                'has_reception': has_reception,
                'has_retour': has_retour,
                'vgp_date': pv.vgp_date,
                'vgp_document_path': pv.vgp_document_path,
                'version_courante': pv.version_courante
            })
        
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
    Charge un PV spécifique depuis la base de données.
    """
    try:
        pv = PV.query.get(pv_id)
        
        if not pv:
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        # Convertir en format compatible avec l'ancien système
        pv_data = pv.to_dict()
        
        return jsonify({
            'success': True,
            'pv_data': pv_data
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors du chargement: {str(e)}'
        }), 500


@app.route('/delete-pv/<pv_id>', methods=['POST', 'DELETE'])
def delete_pv(pv_id):
    """
    Supprime un PV sauvegardé depuis la base de données.
    Note: Accepte POST et DELETE pour compatibilité avec le frontend.
    """
    try:
        pv = PV.query.get(pv_id)
        
        if not pv:
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        # Récupérer le nom du chantier avant suppression
        chantier = pv.chantier
        
        # Supprimer le document VGP s'il existe
        if pv.vgp_document_path:
            doc_path = Path(pv.vgp_document_path)
            if doc_path.exists():
                try:
                    doc_path.unlink()
                except Exception as e:
                    print(f"Erreur lors de la suppression du document VGP: {e}")
        
        # Supprimer de la DB
        db.session.delete(pv)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'PV "{chantier}" supprimé avec succès'
        })
    
    except Exception as e:
        db.session.rollback()
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
            'email_conducteur': request.form.getlist('email_conducteur'),  # Liste d'emails
            
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
            
            # Signatures - vérifier d'abord dans files (envoi depuis JS), puis dans form (sauvegarde JSON)
            'signature_reception': '',
            'signature_retour': '',
        }
        
        # Gérer les signatures qui peuvent venir de request.files (Blob) ou request.form (base64)
        if 'signature_reception' in request.files:
            sig_file = request.files['signature_reception']
            if sig_file and sig_file.filename:
                # Lire le fichier et le convertir en base64

                sig_data = sig_file.read()
                form_data['signature_reception'] = f"data:image/png;base64,{base64.b64encode(sig_data).decode('utf-8')}"
        elif request.form.get('signature_reception'):
            form_data['signature_reception'] = request.form.get('signature_reception', '')
        
        if 'signature_retour' in request.files:
            sig_file = request.files['signature_retour']
            if sig_file and sig_file.filename:
                # Lire le fichier et le convertir en base64

                sig_data = sig_file.read()
                form_data['signature_retour'] = f"data:image/png;base64,{base64.b64encode(sig_data).decode('utf-8')}"
        elif request.form.get('signature_retour'):
            form_data['signature_retour'] = request.form.get('signature_retour', '')
        
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
                             'carburant_reception', 'carburant_retour',
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
        
        # Récupérer la version du PV pour l'afficher sur le PDF
        pv_id = request.form.get('pv_id')
        if pv_id:
            existing_pv_for_version = PV.query.get(pv_id)
            if existing_pv_for_version:
                form_data['version_info'] = {
                    'number': existing_pv_for_version.version_courante,
                    'date': existing_pv_for_version.date_mise_a_jour.strftime('%d/%m/%Y %H:%M') if existing_pv_for_version.date_mise_a_jour else datetime.now().strftime('%d/%m/%Y %H:%M')
                }
            else:
                form_data['version_info'] = {
                    'number': 1,
                    'date': datetime.now().strftime('%d/%m/%Y %H:%M')
                }
        else:
            form_data['version_info'] = {
                'number': 1,
                'date': datetime.now().strftime('%d/%m/%Y %H:%M')
            }
        
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
            'last_sent_date': None,  # Pas envoyé, juste téléchargé
            'form_data': form_data
        }
        
        # Sauvegarder le PV avant le téléchargement dans la base de données
        try:
            # Vérifier si le PV existe déjà
            existing_pv = PV.query.get(pv_id)
            
            if existing_pv:
                # Mise à jour d'un PV existant
                existing_pv.chantier = form_data['chantier']
                
                # Mettre à jour les champs indexés
                indexed_fields = PV.extract_indexed_fields(form_data)
                existing_pv.conducteur_email = indexed_fields.get('conducteur_email')
                existing_pv.entreprise_email = indexed_fields.get('entreprise_email')
                existing_pv.responsable = indexed_fields.get('responsable')
                existing_pv.fournisseur = indexed_fields.get('fournisseur')
                existing_pv.materiel_type = indexed_fields.get('materiel_type')
                existing_pv.date_reception = indexed_fields.get('date_reception')
                existing_pv.date_retour = indexed_fields.get('date_retour')
                existing_pv.statut = indexed_fields.get('statut')
                
                # Mettre à jour le JSON complet
                pv_dict = existing_pv.get_data()
                pv_dict['form_data'] = form_data
                pv_dict['updated_at'] = datetime.now().isoformat()
                existing_pv.set_data(pv_dict)
                
            else:
                # Créer un nouveau PV
                indexed_fields = PV.extract_indexed_fields(form_data)
                
                pv_dict = {
                    'id': pv_id,
                    'chantier': form_data['chantier'],
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'last_sent_date': None,
                    'form_data': form_data
                }
                
                new_pv = PV(
                    id=pv_id,
                    chantier=form_data['chantier'],
                    data_dict=pv_dict,
                    conducteur_email=indexed_fields.get('conducteur_email'),
                    entreprise_email=indexed_fields.get('entreprise_email'),
                    responsable=indexed_fields.get('responsable'),
                    fournisseur=indexed_fields.get('fournisseur'),
                    materiel_type=indexed_fields.get('materiel_type'),
                    date_reception=indexed_fields.get('date_reception'),
                    date_retour=indexed_fields.get('date_retour'),
                    statut=indexed_fields.get('statut')
                )
                db.session.add(new_pv)
            
            # Commit des changements
            db.session.commit()
            
        except Exception as db_error:
            db.session.rollback()
            print(f"Erreur lors de la sauvegarde DB: {db_error}")
            # Continuer quand même pour retourner le PDF
        
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


@app.route('/upload-vgp-document/<pv_id>', methods=['POST'])
def upload_vgp_document(pv_id):
    """
    Upload du rapport/certificat de conformité VGP (PDF) pour un PV.
    """
    try:
        pv = PV.query.get(pv_id)
        
        if not pv:
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        if 'vgp_document' not in request.files:
            return jsonify({
                'success': False,
                'message': 'Aucun fichier fourni'
            }), 400
        
        file = request.files['vgp_document']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'Aucun fichier sélectionné'
            }), 400
        
        # Vérifier que c'est un PDF
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'message': 'Seuls les fichiers PDF sont acceptés'
            }), 400
        
        # Créer le répertoire pour les documents VGP
        vgp_dir = Path('vgp_documents')
        vgp_dir.mkdir(exist_ok=True)
        
        # Générer un nom de fichier unique
        file_ext = '.pdf'
        filename = f"{pv_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}{file_ext}"
        filepath = vgp_dir / filename
        
        # Supprimer l'ancien document s'il existe
        if pv.vgp_document_path:
            old_path = Path(pv.vgp_document_path)
            if old_path.exists():
                try:
                    old_path.unlink()
                except Exception as e:
                    print(f"Erreur lors de la suppression de l'ancien fichier: {e}")
        
        # Sauvegarder le nouveau fichier
        file.save(str(filepath))
        
        # Mettre à jour le PV
        pv.vgp_document_path = str(filepath)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Document VGP uploadé avec succès',
            'document_path': str(filepath)
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Erreur lors de l\'upload: {str(e)}'
        }), 500


@app.route('/vgp-document/<pv_id>', methods=['GET'])
def download_vgp_document(pv_id):
    """
    Télécharge le rapport/certificat de conformité VGP (PDF) pour un PV.
    """
    try:
        pv = PV.query.get(pv_id)
        
        if not pv:
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        if not pv.vgp_document_path:
            return jsonify({
                'success': False,
                'message': 'Aucun document VGP disponible'
            }), 404
        
        doc_path = Path(pv.vgp_document_path)
        
        if not doc_path.exists():
            return jsonify({
                'success': False,
                'message': 'Fichier introuvable'
            }), 404
        
        from flask import send_file
        return send_file(
            str(doc_path),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"VGP_{pv.chantier}_{pv.materiel_type}.pdf"
        )
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors du téléchargement: {str(e)}'
        }), 500


@app.route('/pv-versions/<pv_id>', methods=['GET'])
def get_pv_versions(pv_id):
    """
    Récupère la liste de toutes les versions d'un PV.
    """
    try:
        pv = PV.query.get(pv_id)
        
        if not pv:
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        # Récupérer toutes les versions
        versions = PVVersion.query.filter_by(pv_id=pv_id).order_by(PVVersion.version_number.desc()).all()
        
        versions_list = []
        for version in versions:
            versions_list.append({
                'id': version.id,
                'version_number': version.version_number,
                'date_creation': version.date_creation.strftime('%d/%m/%Y %H:%M'),
                'comment': version.comment,
                'created_by': version.created_by
            })
        
        # Ajouter la version courante
        current_version = {
            'version_number': pv.version_courante,
            'date_creation': pv.date_mise_a_jour.strftime('%d/%m/%Y %H:%M'),
            'comment': 'Version actuelle',
            'created_by': 'system',
            'is_current': True
        }
        versions_list.insert(0, current_version)
        
        return jsonify({
            'success': True,
            'pv_id': pv_id,
            'current_version': pv.version_courante,
            'versions': versions_list
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors de la récupération des versions: {str(e)}'
        }), 500


@app.route('/load-pv-version/<pv_id>/<int:version_number>', methods=['GET'])
def load_pv_version(pv_id, version_number):
    """
    Charge une version spécifique d'un PV.
    """
    try:
        pv = PV.query.get(pv_id)
        
        if not pv:
            return jsonify({
                'success': False,
                'message': 'PV introuvable'
            }), 404
        
        # Si c'est la version courante
        if version_number == pv.version_courante:
            pv_dict = pv.to_dict()
            pv_dict['version_number'] = pv.version_courante
            pv_dict['is_current_version'] = True
            return jsonify({
                'success': True,
                'pv': pv_dict
            })
        
        # Sinon, chercher dans les versions historiques
        version = PVVersion.query.filter_by(pv_id=pv_id, version_number=version_number).first()
        
        if not version:
            return jsonify({
                'success': False,
                'message': f'Version {version_number} introuvable'
            }), 404
        
        version_data = version.get_data()
        version_data['version_number'] = version.version_number
        version_data['is_current_version'] = False
        version_data['version_date'] = version.date_creation.strftime('%d/%m/%Y %H:%M')
        version_data['version_comment'] = version.comment
        
        return jsonify({
            'success': True,
            'pv': version_data
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Erreur lors du chargement de la version: {str(e)}'
        }), 500


if __name__ == '__main__':
    # En développement uniquement
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)
