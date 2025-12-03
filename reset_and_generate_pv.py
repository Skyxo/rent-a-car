#!/usr/bin/env python3
"""
Script pour réinitialiser la base et générer 100 PV réalistes avec versions multiples
"""

import sys
import random
import os
from datetime import datetime, timedelta
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent))

from setup_db import db, PV, PVVersion
from flask import Flask

# Créer une application Flask minimale
app = Flask(__name__)
db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'pvs.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialiser la base de données
db.init_app(app)

# Données réalistes
CHANTIERS = [
    "Chantier Tour Eiffel - Paris 7ème", "Chantier Gare Saint-Jean - Bordeaux",
    "Chantier Confluence - Lyon 2ème", "Chantier Vieux-Port - Marseille",
    "Chantier Capitole - Toulouse", "Chantier Commerce - Nantes",
    "Chantier Château - Strasbourg", "Chantier Promenade - Nice",
    "Chantier Grand-Place - Lille", "Chantier République - Rennes",
    "Chantier Bellecour - Lyon", "Chantier Pey Berland - Bordeaux",
    "Chantier Massena - Nice", "Chantier Wilson - Toulouse",
    "Chantier Part-Dieu - Lyon", "Chantier Canebière - Marseille"
]

MATERIELS = [
    ("Nacelle élévatrice", "Genie Z-45/25J", ["Genie", "Haulotte", "JLG"]),
    ("Chariot élévateur", "Toyota 8FD25", ["Toyota", "Linde", "Still", "Fenwick"]),
    ("Grue mobile", "Liebherr LTM 1050", ["Liebherr", "Grove", "Terex"]),
    ("Pelle mécanique", "Caterpillar 320D", ["Caterpillar", "Komatsu", "Hitachi"]),
    ("Compacteur", "Bomag BW 213", ["Bomag", "Caterpillar", "Dynapac"]),
    ("Minipelle", "Kubota KX080-4", ["Kubota", "Yanmar", "Takeuchi"]),
    ("Télescopique", "Manitou MLT 735", ["Manitou", "JCB", "Merlo"]),
    ("Dumper", "Thwaites MACH 472", ["Thwaites", "Ausa", "Wacker Neuson"]),
    ("Compresseur", "Atlas Copco XAS 137", ["Atlas Copco", "Ingersoll Rand", "Kaeser"]),
    ("Plateforme", "Skyjack SJIII 3226", ["Skyjack", "Genie", "Haulotte"])
]

RESPONSABLES = [
    "Jean Dupont", "Marie Martin", "Pierre Durand", "Sophie Bernard",
    "Luc Petit", "Claire Thomas", "Michel Robert", "Isabelle Richard",
    "François Dubois", "Catherine Moreau", "Alain Simon", "Nathalie Laurent"
]

CONDUCTEURS = [
    ("paul.leclerc@gmail.com", "Paul Leclerc"),
    ("marc.fontaine@outlook.fr", "Marc Fontaine"),
    ("lucas.girard@gmail.com", "Lucas Girard"),
    ("julien.morel@yahoo.fr", "Julien Morel"),
    ("nicolas.fournier@gmail.com", "Nicolas Fournier"),
    ("antoine.vincent@hotmail.fr", "Antoine Vincent"),
    ("olivier.lambert@gmail.com", "Olivier Lambert"),
    ("thomas.rousseau@outlook.fr", "Thomas Rousseau")
]

ENTREPRISES = [
    ("contact@bouygues-construction.fr", "Bouygues Construction"),
    ("chantiers@vinci-construction.com", "Vinci Construction"),
    ("location@eiffage.fr", "Eiffage"),
    ("materiel@colas.fr", "Colas"),
    ("parc@eurovia.com", "Eurovia"),
    ("gestion@spie-batignolles.fr", "Spie Batignolles")
]

ELEMENTS_INSPECTION = [
    'cabine', 'moteur', 'hydraulique', 'pneumatiques', 'freins',
    'direction', 'eclairage', 'securite', 'carrosserie', 'chassis'
]

def generate_numero_serie():
    """Génère un numéro de série réaliste"""
    letters = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))
    numbers = ''.join(random.choices('0123456789', k=6))
    return f"{letters}-{numbers}"

def generate_form_data(materiel_info, chantier, conducteur, entreprise, responsable, date_base, pv_type):
    """Génère des données de formulaire réalistes"""
    materiel_type, materiel_model, fournisseurs = materiel_info
    fournisseur = random.choice(fournisseurs)
    
    form_data = {
        'chantier': chantier,
        'materiel_type': materiel_type,
        'materiel_numero': generate_numero_serie(),
        'materiel_modele': materiel_model,
        'fournisseur': fournisseur,
        'responsable': responsable,
        'email_conducteur': [conducteur[0]],
        'conducteur_nom': conducteur[1],
        'email_entreprise': entreprise[0],
        'entreprise_nom': entreprise[1],
        'date_reception': date_base.strftime('%Y-%m-%d') if pv_type in ['reception', 'complet'] else '',
        'date_retour': (date_base + timedelta(days=random.randint(7, 60))).strftime('%Y-%m-%d') if pv_type in ['retour', 'complet'] else '',
        'signature_reception': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' if pv_type in ['reception', 'complet'] else '',
        'signature_retour': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' if pv_type in ['retour', 'complet'] else '',
        'signature_reception_nom': conducteur[1] if pv_type in ['reception', 'complet'] else '',
        'signature_retour_nom': conducteur[1] if pv_type in ['retour', 'complet'] else '',
        'carburant_reception': str(random.choice([25, 50, 75, 100])) if pv_type in ['reception', 'complet'] else '0',
        'carburant_retour': str(random.choice([0, 25, 50, 75])) if pv_type in ['retour', 'complet'] else '0',
    }
    
    # Ajouter des états pour les éléments d'inspection
    for element in ELEMENTS_INSPECTION:
        if pv_type in ['reception', 'complet']:
            form_data[f'{element}_reception'] = random.choice(['bon', 'bon', 'bon', 'defectueux'])
        if pv_type in ['retour', 'complet']:
            form_data[f'{element}_retour'] = random.choice(['bon', 'bon', 'defectueux'])
    
    # Ajouter conformité réglementaire
    if pv_type in ['reception', 'complet']:
        form_data['conformite_reception'] = random.choice(['bon', 'bon', 'bon', 'defectueux'])
    if pv_type in ['retour', 'complet']:
        form_data['conformite_retour'] = random.choice(['bon', 'bon', 'defectueux'])
    
    # Observations aléatoires
    observations = [
        "RAS - Matériel en bon état",
        "Léger choc sur le côté droit",
        "Traces d'usure normale",
        "Nécessite un nettoyage",
        "Petit impact sur le capot",
        "État général satisfaisant"
    ]
    if pv_type in ['reception', 'complet']:
        form_data['observations_reception'] = random.choice(observations)
    if pv_type in ['retour', 'complet']:
        form_data['observations_retour'] = random.choice(observations)
    
    return form_data

def calculate_vgp_date(scenario):
    """Calcule une date VGP selon le scénario"""
    today = datetime.now()
    
    if scenario == 'expired':
        # VGP expirée (plus de 180 jours)
        days_ago = random.randint(180, 365)
        return (today - timedelta(days=days_ago)).strftime('%Y-%m-%d')
    elif scenario == 'warning':
        # À renouveler (150-165 jours, soit moins de 3 semaines avant expiration)
        days_ago = random.randint(150, 165)
        return (today - timedelta(days=days_ago)).strftime('%Y-%m-%d')
    elif scenario == 'valid':
        # Valide (0-120 jours)
        days_ago = random.randint(0, 120)
        return (today - timedelta(days=days_ago)).strftime('%Y-%m-%d')
    else:
        return None

def main():
    print("🗑️  Suppression de tous les PV existants...")
    
    with app.app_context():
        try:
            # Supprimer toutes les versions
            deleted_versions = PVVersion.query.delete()
            print(f"   ✓ {deleted_versions} versions supprimées")
            
            # Supprimer tous les PV
            deleted_pvs = PV.query.delete()
            print(f"   ✓ {deleted_pvs} PV supprimés")
            
            db.session.commit()
            print("✅ Base de données nettoyée\n")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erreur lors du nettoyage: {e}")
            return
        
        print("🚀 Génération de 100 nouveaux PV avec versions multiples...\n")
        
        # Distribution des types de PV
        pv_types_distribution = (
            ['complet'] * 60 +  # 60% complets (réception + retour)
            ['reception'] * 25 +  # 25% réception seulement
            ['retour'] * 10 +  # 10% retour seulement
            ['empty'] * 5  # 5% vides (brouillons)
        )
        random.shuffle(pv_types_distribution)
        
        # Distribution VGP
        vgp_scenarios = (
            ['expired'] * 20 +  # 20% expirées
            ['warning'] * 15 +  # 15% à renouveler
            ['valid'] * 50 +  # 50% valides
            [None] * 15  # 15% sans VGP
        )
        random.shuffle(vgp_scenarios)
        
        created_count = 0
        
        for i in range(100):
            try:
                # Sélectionner les données
                chantier = random.choice(CHANTIERS)
                materiel_info = random.choice(MATERIELS)
                responsable = random.choice(RESPONSABLES)
                conducteur = random.choice(CONDUCTEURS)
                entreprise = random.choice(ENTREPRISES)
                pv_type = pv_types_distribution[i]
                vgp_scenario = vgp_scenarios[i]
                
                # Date de base (entre 1 et 90 jours dans le passé)
                date_base = datetime.now() - timedelta(days=random.randint(1, 90))
                
                # Générer les données du formulaire
                form_data = generate_form_data(
                    materiel_info, chantier, conducteur, entreprise,
                    responsable, date_base, pv_type
                )
                
                # Ajouter VGP
                vgp_date = calculate_vgp_date(vgp_scenario) if vgp_scenario else None
                if vgp_date:
                    form_data['vgp_date'] = vgp_date
                
                # Extraire les champs indexés
                indexed_fields = PV.extract_indexed_fields(form_data)
                
                # Créer le PV
                pv_id = f"pv-{i+1:03d}-{random.randint(1000, 9999)}"
                
                # Déterminer le nombre de versions (1 à 5)
                num_versions = random.choices([1, 2, 3, 4, 5], weights=[20, 35, 25, 15, 5])[0]
                
                # Créer le PV initial
                pv_dict = {
                    'id': pv_id,
                    'chantier': chantier,
                    'created_at': date_base.isoformat(),
                    'updated_at': datetime.now().isoformat(),
                    'form_data': form_data,
                    'version_info': {
                        'number': num_versions,
                        'date': datetime.now().strftime('%d/%m/%Y %H:%M'),
                        'sent_to': ', '.join([conducteur[0], entreprise[0]])
                    }
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
                    date_dernier_envoi=datetime.now() if num_versions > 1 else None,
                    vgp_date=vgp_date,
                    date_creation=date_base,
                    date_mise_a_jour=datetime.now()
                )
                new_pv.version_courante = num_versions
                
                db.session.add(new_pv)
                
                # Créer les versions historiques (si plus d'une version)
                if num_versions > 1:
                    for v in range(1, num_versions):
                        version_date = date_base + timedelta(days=v * random.randint(5, 15))
                        
                        # Modifier légèrement les données pour chaque version
                        version_data = pv_dict.copy()
                        version_data['version_info'] = {
                            'number': v,
                            'date': version_date.strftime('%d/%m/%Y %H:%M'),
                            'sent_to': ', '.join([conducteur[0], entreprise[0]])
                        }
                        
                        version = PVVersion(
                            pv_id=pv_id,
                            version_number=v,
                            data_dict=version_data,
                            created_by='email_send',
                            comment=f"Envoyé à {conducteur[0]}, {entreprise[0]}"
                        )
                        version.date_creation = version_date
                        db.session.add(version)
                
                created_count += 1
                
                # Émoji de statut
                if pv_type == 'complet':
                    status_emoji = '✅'
                elif pv_type == 'reception':
                    status_emoji = '📥'
                elif pv_type == 'retour':
                    status_emoji = '📤'
                else:
                    status_emoji = '📝'
                
                # Émoji VGP
                vgp_emoji = {
                    'expired': '🔴',
                    'warning': '🟠',
                    'valid': '🟢',
                    None: '⚪'
                }.get(vgp_scenario, '⚪')
                
                print(f"✓ PV {created_count:3d}/100 - {chantier[:35]:<35} - {status_emoji} {pv_type:10s} - v{num_versions} - {vgp_emoji} VGP")
                
                # Commit tous les 10 PV pour voir la progression
                if created_count % 10 == 0:
                    db.session.commit()
                    
            except Exception as e:
                print(f"❌ Erreur PV {i+1}: {e}")
                db.session.rollback()
                continue
        
        # Commit final
        db.session.commit()
        
        print(f"\n✅ {created_count} PV créés avec succès !")
        
        # Statistiques
        print("\n📊 Statistiques de la base :")
        total_pvs = PV.query.count()
        total_versions = PVVersion.query.count()
        complets = PV.query.filter_by(statut='complete').count()
        reception = PV.query.filter_by(statut='reception_only').count()
        retour = PV.query.filter_by(statut='retour_only').count()
        vides = PV.query.filter_by(statut='empty').count()
        
        with_vgp = PV.query.filter(PV.vgp_date.isnot(None)).count()
        without_vgp = PV.query.filter(PV.vgp_date.is_(None)).count()
        
        print(f"   📄 Total PV : {total_pvs}")
        print(f"   📚 Total versions : {total_versions}")
        print(f"   ✅ Complets : {complets}")
        print(f"   📥 Réception seule : {reception}")
        print(f"   📤 Retour seul : {retour}")
        print(f"   📝 Brouillons : {vides}")
        print(f"   🔧 Avec VGP : {with_vgp}")
        print(f"   ⚪ Sans VGP : {without_vgp}")
        
        # Versions
        multi_versions = PV.query.filter(PV.version_courante > 1).count()
        print(f"   📦 PV avec plusieurs versions : {multi_versions}")

if __name__ == '__main__':
    main()
