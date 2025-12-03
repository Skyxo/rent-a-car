#!/usr/bin/env python3
"""
Script pour générer 50 PV avec des données VGP variées
Simule différents scénarios : VGP valides, à renouveler, échues, et sans VGP
"""

import sys
import random
import os
from datetime import datetime, timedelta
from pathlib import Path

# Ajouter le répertoire parent au path pour importer setup_db
sys.path.insert(0, str(Path(__file__).parent))

from setup_db import db, PV
from flask import Flask

# Créer une application Flask minimale pour le contexte
app = Flask(__name__)
# Utiliser le chemin absolu vers la base de données
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'pvs.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialiser la base de données
db.init_app(app)

# Données de test variées
CHANTIERS = [
    "Chantier A1 - Paris", "Chantier B2 - Lyon", "Chantier C3 - Marseille",
    "Chantier D4 - Toulouse", "Chantier E5 - Bordeaux", "Chantier F6 - Nantes",
    "Chantier G7 - Strasbourg", "Chantier H8 - Nice", "Chantier I9 - Lille",
    "Chantier J10 - Rennes"
]

TYPES_MATERIELS = [
    "Nacelle élévatrice", "Chariot élévateur", "Grue mobile", "Pelle mécanique",
    "Compacteur", "Bétonnière", "Échafaudage roulant", "Plateforme élévatrice",
    "Mini-pelle", "Dumper", "Tractopelle", "Grue à tour"
]

FOURNISSEURS = [
    "Loxam", "Kiloutou", "Point P Location", "Boels",
    "TVH Rental", "Loxam Access", "Mediaco", "Algeco"
]

RESPONSABLES = [
    "Dupont Jean", "Martin Sophie", "Bernard Paul", "Dubois Marie",
    "Thomas Pierre", "Robert Claire", "Petit François", "Durand Lucie",
    "Leroy Marc", "Moreau Julie"
]

EMAILS_CONDUCTEURS = [
    "conducteur1@example.com", "conducteur2@example.com", "conducteur3@example.com",
    "conducteur4@example.com", "conducteur5@example.com"
]

EMAILS_ENTREPRISE = [
    "contact@francemontage.fr", "admin@francemontage.fr", "bureau@francemontage.fr"
]

def generate_date_in_range(days_ago_min, days_ago_max):
    """Génère une date dans une plage donnée"""
    days_ago = random.randint(days_ago_min, days_ago_max)
    return (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

def generate_vgp_date(scenario):
    """
    Génère une date VGP selon le scénario
    - 'valid': VGP valide (contrôle récent)
    - 'warning': À renouveler (5-6 mois)
    - 'expired': Échu (plus de 6 mois)
    - 'none': Pas de VGP
    """
    if scenario == 'none':
        return None
    elif scenario == 'valid':
        # Contrôle entre 0 et 4 mois (0-120 jours)
        days_ago = random.randint(0, 120)
    elif scenario == 'warning':
        # Contrôle entre 5 et 5.5 mois (150-165 jours) -> échéance dans 15-30 jours
        days_ago = random.randint(150, 165)
    elif scenario == 'expired':
        # Contrôle il y a plus de 6 mois (180-365 jours)
        days_ago = random.randint(180, 365)
    
    return (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

def generate_pv_data(index, vgp_scenario):
    """Génère les données d'un PV"""
    chantier = random.choice(CHANTIERS)
    materiel_type = random.choice(TYPES_MATERIELS)
    fournisseur = random.choice(FOURNISSEURS)
    responsable = random.choice(RESPONSABLES)
    email_conducteur = random.choice(EMAILS_CONDUCTEURS)
    email_entreprise = random.choice(EMAILS_ENTREPRISE)
    
    # Dates de réception/retour
    date_reception = generate_date_in_range(1, 180)
    has_retour = random.random() > 0.3  # 70% ont un retour
    date_retour = generate_date_in_range(1, 30) if has_retour else ''
    
    # Statut
    if has_retour:
        statut = 'complete'
    else:
        statut = 'reception_only'
    
    # Date VGP selon le scénario
    vgp_date = generate_vgp_date(vgp_scenario)
    
    # Numéro de série
    materiel_numero = f"MAT{index:04d}-{random.randint(1000, 9999)}"
    
    form_data = {
        'chantier': chantier,
        'date_reception': date_reception,
        'date_retour': date_retour,
        'materiel_numero': materiel_numero,
        'materiel_type': materiel_type,
        'fournisseur': fournisseur,
        'responsable': responsable,
        'email_conducteur': [email_conducteur],
        'email_entreprise': email_entreprise,
        'conformite_reception': random.choice(['bon', 'defectueux']),
        'conformite_retour': random.choice(['bon', 'defectueux']) if has_retour else '',
        'vgp_date': vgp_date,
        'created_at': datetime.now().isoformat()
    }
    
    return {
        'chantier': chantier,
        'conducteur_email': email_conducteur,
        'entreprise_email': email_entreprise,
        'responsable': responsable,
        'fournisseur': fournisseur,
        'materiel_type': materiel_type,
        'date_reception': date_reception,
        'date_retour': date_retour if has_retour else None,
        'statut': statut,
        'vgp_date': vgp_date,
        'form_data': form_data
    }

def main():
    """Génère 50 PV avec différents scénarios VGP"""
    
    with app.app_context():
        print("🚀 Génération de 50 PV avec données VGP...")
        print()
        
        # Répartition des scénarios
        # 15 VGP échues (30%)
        # 10 VGP à renouveler (20%)
        # 20 VGP valides (40%)
        # 5 sans VGP (10%)
        
        scenarios = (
            ['expired'] * 15 +
            ['warning'] * 10 +
            ['valid'] * 20 +
            ['none'] * 5
        )
        
        # Mélanger pour éviter un ordre prévisible
        random.shuffle(scenarios)
        
        created_count = 0
        
        for i, scenario in enumerate(scenarios, 1):
            pv_data = generate_pv_data(i, scenario)
            
            # Créer le PV complet
            import uuid
            pv_id = str(uuid.uuid4())
            
            pv_dict = {
                'id': pv_id,
                'chantier': pv_data['chantier'],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'last_sent_date': None,
                'form_data': pv_data['form_data']
            }
            
            new_pv = PV(
                id=pv_id,
                chantier=pv_data['chantier'],
                data_dict=pv_dict,
                conducteur_email=pv_data['conducteur_email'],
                entreprise_email=pv_data['entreprise_email'],
                responsable=pv_data['responsable'],
                fournisseur=pv_data['fournisseur'],
                materiel_type=pv_data['materiel_type'],
                date_reception=pv_data['date_reception'],
                date_retour=pv_data['date_retour'],
                statut=pv_data['statut'],
                vgp_date=pv_data['vgp_date']
            )
            
            db.session.add(new_pv)
            created_count += 1
            
            # Afficher la progression
            scenario_label = {
                'expired': '🔴 Échue',
                'warning': '🟠 À renouveler',
                'valid': '🟢 Valide',
                'none': '⚪ Sans VGP'
            }
            
            print(f"✓ PV {i}/50 - {pv_data['chantier'][:30]:30} - {scenario_label[scenario]}")
        
        # Commit tous les PV
        db.session.commit()
        
        print()
        print(f"✅ {created_count} PV créés avec succès !")
        print()
        print("📊 Répartition VGP :")
        print(f"   🔴 Échues : 15 PV (30%)")
        print(f"   🟠 À renouveler : 10 PV (20%)")
        print(f"   🟢 Valides : 20 PV (40%)")
        print(f"   ⚪ Sans VGP : 5 PV (10%)")
        print()
        print("💡 Rechargez l'application pour voir l'alerte VGP s'afficher !")

if __name__ == '__main__':
    main()
