"""
Configuration de la base de données SQLite avec SQLAlchemy
Pour l'application de gestion de Procès-Verbaux de Matériel Loué

Architecture hybride :
- Colonnes SQL pour les champs de recherche fréquents
- Colonne JSON pour conserver la structure complète sans casser le frontend
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

# Instance SQLAlchemy (sera initialisée dans server.py)
db = SQLAlchemy()


class PV(db.Model):
    """
    Modèle PV (Procès-Verbal) avec architecture hybride.
    
    Colonnes SQL indexées pour les recherches rapides :
    - id, date_creation, chantier, emails, statut
    
    Colonne JSON pour conserver toute la structure complexe :
    - data (contient form_data avec tous les champs, photos, signatures)
    """
    
    __tablename__ = 'pvs'
    
    # Colonnes indexées pour recherches fréquentes
    id = db.Column(db.String(36), primary_key=True)  # UUID
    date_creation = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    date_mise_a_jour = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    
    # Champs métier principaux (recherche et tri)
    chantier = db.Column(db.String(200), nullable=False, index=True)
    conducteur_email = db.Column(db.String(500), index=True)  # Peut contenir plusieurs emails
    entreprise_email = db.Column(db.String(200), index=True)
    responsable = db.Column(db.String(200), index=True)
    fournisseur = db.Column(db.String(200), index=True)
    materiel_type = db.Column(db.String(200), index=True)
    
    # Dates de réception/retour pour filtrage
    date_reception = db.Column(db.String(20), index=True)  # Format YYYY-MM-DD
    date_retour = db.Column(db.String(20), index=True)
    
    # Statut de complétion
    statut = db.Column(db.String(50), index=True)  # 'reception_only', 'complete', 'empty', etc.
    
    # Date du dernier envoi par email
    date_dernier_envoi = db.Column(db.DateTime, nullable=True, index=True)
    
    # Version courante du PV
    version_courante = db.Column(db.Integer, nullable=False, default=1, index=True)
    
    # VGP (Vérification Générale Périodique) - Contrôle technique des engins
    vgp_date = db.Column(db.String(20), nullable=True, index=True)  # Format YYYY-MM-DD
    vgp_document_path = db.Column(db.Text, nullable=True)  # Chemin vers le PDF de conformité
    
    # Colonne JSON contenant TOUTES les données du PV
    # Cela évite de créer des dizaines de tables et garde la compatibilité avec le frontend
    data = db.Column(db.Text, nullable=False)  # Stockage JSON en texte
    
    def __init__(self, id, chantier, data_dict, conducteur_email=None, entreprise_email=None, 
                 responsable=None, fournisseur=None, materiel_type=None, 
                 date_reception=None, date_retour=None, statut='empty', 
                 date_dernier_envoi=None, date_creation=None, date_mise_a_jour=None,
                 vgp_date=None, vgp_document_path=None):
        """
        Initialise un PV avec données indexées + JSON complet.
        
        Args:
            id: UUID du PV
            chantier: Nom du chantier
            data_dict: Dictionnaire Python complet (sera converti en JSON)
            conducteur_email: Email(s) du conducteur
            entreprise_email: Email de l'entreprise
            responsable: Nom du responsable
            fournisseur: Nom du fournisseur
            materiel_type: Type de matériel
            date_reception: Date de réception (format YYYY-MM-DD)
            date_retour: Date de retour (format YYYY-MM-DD)
            statut: État de complétion du PV
            date_dernier_envoi: DateTime du dernier envoi email
            date_creation: DateTime de création (auto si None)
            date_mise_a_jour: DateTime de mise à jour (auto si None)
            vgp_date: Date de la dernière VGP (format YYYY-MM-DD)
            vgp_document_path: Chemin vers le document PDF de conformité VGP
        """
        self.id = id
        self.chantier = chantier
        self.conducteur_email = conducteur_email
        self.entreprise_email = entreprise_email
        self.responsable = responsable
        self.fournisseur = fournisseur
        self.materiel_type = materiel_type
        self.date_reception = date_reception
        self.date_retour = date_retour
        self.statut = statut
        self.date_dernier_envoi = date_dernier_envoi
        self.vgp_date = vgp_date
        self.vgp_document_path = vgp_document_path
        
        # Dates de gestion
        now = datetime.utcnow()
        self.date_creation = date_creation or now
        self.date_mise_a_jour = date_mise_a_jour or now
        
        # Stocker le JSON complet
        self.data = json.dumps(data_dict, ensure_ascii=False)
    
    def get_data(self):
        """
        Récupère le dictionnaire Python depuis le JSON stocké.
        
        Returns:
            dict: Données complètes du PV
        """
        try:
            return json.loads(self.data)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def set_data(self, data_dict):
        """
        Met à jour la colonne JSON avec un nouveau dictionnaire.
        
        Args:
            data_dict: Dictionnaire Python à stocker
        """
        self.data = json.dumps(data_dict, ensure_ascii=False)
        self.date_mise_a_jour = datetime.utcnow()
    
    def to_dict(self):
        """
        Convertit le PV en dictionnaire (format compatible avec l'ancien système JSON).
        
        Returns:
            dict: Structure identique aux anciens fichiers JSON
        """
        data_dict = self.get_data()
        
        return {
            'id': self.id,
            'chantier': self.chantier,
            'created_at': self.date_creation.isoformat() if self.date_creation else None,
            'updated_at': self.date_mise_a_jour.isoformat() if self.date_mise_a_jour else None,
            'last_sent_date': self.date_dernier_envoi.isoformat() if self.date_dernier_envoi else None,
            'form_data': data_dict.get('form_data', data_dict)  # Compatibilité avec ancienne structure
        }
    
    @staticmethod
    def extract_indexed_fields(form_data):
        """
        Extrait les champs à indexer depuis form_data.
        Fonction utilitaire pour créer/mettre à jour un PV.
        
        Args:
            form_data: Dictionnaire des données du formulaire
            
        Returns:
            dict: Champs extraits pour les colonnes SQL
        """
        # Extraire email conducteur (peut être liste ou string)
        conducteur_email = form_data.get('email_conducteur', '')
        if isinstance(conducteur_email, list):
            conducteur_email = ', '.join(conducteur_email)
        
        # Déterminer le statut de complétion
        has_reception = bool(form_data.get('signature_reception'))
        has_retour = bool(form_data.get('signature_retour'))
        
        if has_reception and has_retour:
            statut = 'complete'
        elif has_reception:
            statut = 'reception_only'
        elif has_retour:
            statut = 'retour_only'
        else:
            statut = 'empty'
        
        return {
            'conducteur_email': conducteur_email,
            'entreprise_email': form_data.get('email_entreprise', ''),
            'responsable': form_data.get('responsable', ''),
            'fournisseur': form_data.get('fournisseur', ''),
            'materiel_type': form_data.get('materiel_type', ''),
            'date_reception': form_data.get('date_reception', ''),
            'date_retour': form_data.get('date_retour', ''),
            'statut': statut,
            'vgp_date': form_data.get('vgp_date', ''),
            'vgp_document_path': form_data.get('vgp_document_path', '')
        }
    
    def __repr__(self):
        return f'<PV {self.id} - {self.chantier} ({self.statut})>'


class PVVersion(db.Model):
    """
    Modèle pour stocker les versions historiques des PV.
    Chaque envoi par email crée une nouvelle version.
    """
    
    __tablename__ = 'pv_versions'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    pv_id = db.Column(db.String(36), db.ForeignKey('pvs.id', ondelete='CASCADE'), nullable=False, index=True)
    version_number = db.Column(db.Integer, nullable=False)
    date_creation = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    data = db.Column(db.Text, nullable=False)  # Snapshot JSON du PV à ce moment
    created_by = db.Column(db.String(100), default='system')
    comment = db.Column(db.Text, nullable=True)  # Ex: "Envoyé par email à..."
    
    def __init__(self, pv_id, version_number, data_dict, created_by='system', comment=None):
        self.pv_id = pv_id
        self.version_number = version_number
        self.data = json.dumps(data_dict, ensure_ascii=False)
        self.created_by = created_by
        self.comment = comment
    
    def get_data(self):
        """Récupère le dictionnaire Python depuis le JSON stocké."""
        try:
            return json.loads(self.data)
        except (json.JSONDecodeError, TypeError):
            return {}
    
    def to_dict(self):
        """Convertit la version en dictionnaire."""
        return {
            'id': self.id,
            'pv_id': self.pv_id,
            'version_number': self.version_number,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
            'created_by': self.created_by,
            'comment': self.comment,
            'data': self.get_data()
        }
    
    def __repr__(self):
        return f'<PVVersion {self.pv_id} v{self.version_number}>'


def init_db(app):
    """
    Initialise la base de données avec l'application Flask.
    À appeler au démarrage de l'application.
    
    Args:
        app: Instance Flask
    """
    db.init_app(app)
    
    with app.app_context():
        # Créer toutes les tables si elles n'existent pas
        db.create_all()
        print("✅ Base de données initialisée avec succès")


def get_db_stats():
    """
    Retourne des statistiques sur la base de données.
    
    Returns:
        dict: Statistiques (nombre total, par statut, etc.)
    """
    try:
        total = PV.query.count()
        stats = {
            'total': total,
            'complete': PV.query.filter_by(statut='complete').count(),
            'reception_only': PV.query.filter_by(statut='reception_only').count(),
            'retour_only': PV.query.filter_by(statut='retour_only').count(),
            'empty': PV.query.filter_by(statut='empty').count(),
        }
        return stats
    except Exception as e:
        print(f"Erreur lors de la récupération des stats: {e}")
        return {'total': 0, 'error': str(e)}
