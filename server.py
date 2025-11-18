"""
Application Flask pour la génération de Procès-Verbaux de Matériel Loué
Centrale Lyon Conseil

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

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limite 16MB pour protection DoS

# Configuration SMTP (à définir via variables d'environnement en production)
SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', SMTP_USERNAME)


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


def send_email_with_pdf(pdf_bytes, recipient_email, chantier_name, date_reception):
    """
    Envoie le PDF généré par email via SMTP.
    
    Args:
        pdf_bytes: Contenu binaire du PDF
        recipient_email: Adresse email du destinataire
        chantier_name: Nom du chantier (pour le sujet)
        date_reception: Date de réception (pour le nom de fichier)
        
    Returns:
        tuple: (success: bool, message: str)
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        return False, "Configuration SMTP manquante. Définir SMTP_USERNAME et SMTP_PASSWORD."
    
    try:
        # Construire le message MIME
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = recipient_email
        msg['Subject'] = f"PV Matériel Loué - {chantier_name} - {date_reception}"
        
        # Corps du message
        body = f"""
Bonjour,

Veuillez trouver ci-joint le Procès-Verbal de matériel loué pour le chantier : {chantier_name}

Date de réception : {date_reception}

Ce document a été généré automatiquement par l'application de gestion Centrale Lyon Conseil.

Cordialement,
L'équipe Centrale Lyon Conseil
        """
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # Attacher le PDF
        filename = f"PV_Materiel_{chantier_name.replace(' ', '_')}_{date_reception}.pdf"
        pdf_attachment = MIMEApplication(pdf_bytes, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment', filename=filename)
        msg.attach(pdf_attachment)
        
        # Connexion au serveur SMTP et envoi
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()  # Sécuriser la connexion
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        return True, f"Email envoyé avec succès à {recipient_email}"
    
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
        
        # Validation des champs obligatoires
        if not form_data['chantier']:
            flash('Le chantier est obligatoire', 'danger')
            return redirect(url_for('index'))
        
        if not form_data['email_destinataire']:
            flash('L\'email du destinataire est obligatoire', 'danger')
            return redirect(url_for('index'))
        
        # Optimiser les signatures si présentes
        if form_data['signature_reception']:
            form_data['signature_reception'] = optimize_signature(form_data['signature_reception'])
        
        if form_data['signature_retour']:
            form_data['signature_retour'] = optimize_signature(form_data['signature_retour'])
        
        # Ajouter la date de génération
        form_data['date_generation'] = datetime.now().strftime('%d/%m/%Y %H:%M')
        
        # Générer le HTML pour le PDF
        html_content = render_template('pdf_template.html', **form_data)
        
        # Générer le PDF en mémoire avec WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Envoyer le PDF par email
        success, message = send_email_with_pdf(
            pdf_bytes,
            form_data['email_destinataire'],
            form_data['chantier'],
            form_data['date_reception'] or 'Non spécifiée'
        )
        
        if success:
            flash(message, 'success')
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


if __name__ == '__main__':
    # En développement uniquement
    app.run(debug=True, host='0.0.0.0', port=5000)
