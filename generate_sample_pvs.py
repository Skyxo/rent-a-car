#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import uuid
import random
from datetime import datetime, timedelta

# Listes de données réalistes
chantiers = [
    "montparnasse", "defense", "chatelet", "bastille", "republique",
    "gare-lyon", "nation", "opera", "louvre", "invalides",
    "trocadero", "champs-elysees", "arc-triomphe", "montmartre", "sacre-coeur",
    "notre-dame", "pantheon", "luxembourg", "eiffel", "bercy"
]

emails = [
    "chef.chantier@entreprise.fr",
    "conducteur.travaux@batiment.com",
    "responsable@construction.fr",
    "manager@travaux.com",
    "superviseur@projet.fr"
]

responsables = [
    "Jean Dupont", "Marie Martin", "Pierre Bernard", "Sophie Dubois",
    "Luc Moreau", "Claire Laurent", "Thomas Simon", "Julie Michel",
    "Nicolas Lefebvre", "Isabelle Leroy"
]

materiels = [
    ("Nacelle électrique", "GENIE", "GS-1932"),
    ("Nacelle diesel", "JLG", "E450AJ"),
    ("Nacelle hybride", "MANITOU", "160ATJ"),
    ("Chariot élévateur", "STILL", "RX60-35"),
    ("Chariot télescopique", "MANITOU", "MT625"),
    ("Plateforme ciseaux", "GENIE", "GS-2646"),
    ("Nacelle articulée", "JLG", "450AJ"),
    ("Chariot frontal", "TOYOTA", "8FD25"),
    ("Nacelle verticale", "HAULOTTE", "Compact 12"),
    ("Chariot latéral", "BULMOR", "EFX-50")
]

def generate_signature():
    """Génère une signature base64 basique"""
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def random_date(start_date, end_date):
    """Génère une date aléatoire entre start_date et end_date"""
    time_delta = end_date - start_date
    random_days = random.randint(0, time_delta.days)
    return start_date + timedelta(days=random_days)

def generate_pv_data(pv_type):
    """Génère les données d'un PV"""
    pv_id = str(uuid.uuid4())
    chantier = random.choice(chantiers)
    email_conducteur = [random.choice(emails), random.choice(emails)]
    email_entreprise = random.choice(emails)
    responsable = random.choice(responsables)
    materiel_numero = str(random.randint(100, 999))
    materiel_info = random.choice(materiels)
    materiel_type = f"{materiel_info[0]} {materiel_info[1]} {materiel_info[2]}"
    fournisseur = materiel_info[1]
    
    # Générer des dates cohérentes
    start = datetime.now() - timedelta(days=180)
    end = datetime.now()
    
    if pv_type == "reception":
        date_reception = random_date(start, end).strftime("%Y-%m-%d")
        compteur_reception = str(random.randint(100, 5000))
        date_retour = ""
        compteur_retour = ""
    else:  # retour
        date_reception = random_date(start, end - timedelta(days=30)).strftime("%Y-%m-%d")
        compteur_reception = str(random.randint(100, 3000))
        date_retour = random_date(datetime.strptime(date_reception, "%Y-%m-%d") + timedelta(days=1), end).strftime("%Y-%m-%d")
        compteur_retour = str(int(compteur_reception) + random.randint(50, 1000))
    
    # États d'inspection
    etat_options = ["bon", "defectueux"]
    
    form_data = {
        "pv_id": pv_id,
        "chantier": chantier,
        "email_conducteur": email_conducteur,
        "email_entreprise": email_entreprise,
        "responsable": responsable,
        "materiel_numero": materiel_numero,
        "materiel_type": materiel_type,
        "fournisseur": fournisseur,
        "pv_type_sticky": pv_type,
        "date_reception": date_reception,
        "compteur_reception": compteur_reception,
        "date_retour": date_retour,
        "compteur_retour": compteur_retour,
        "carburant_reception": str(random.choice([0, 25, 50, 75, 100])) if pv_type == "reception" else "0",
        "carburant_retour": str(random.choice([0, 25, 50, 75, 100])) if pv_type == "retour" else "0",
    }
    
    # Éléments d'inspection
    inspection_elements = [
        "carrosserie", "eclairage", "pneumatiques", "panier", "flexibles",
        "commandes", "conformite", "mobilites", "nacelles", "securite"
    ]
    
    # Fuites
    fuite_elements = ["fuite_moteur", "fuite_hydraulique", "fuite_gasoil"]
    
    for element in inspection_elements:
        if pv_type == "reception":
            form_data[f"{element}_reception"] = random.choice(etat_options)
        else:
            form_data[f"{element}_reception"] = random.choice(etat_options)
            form_data[f"{element}_retour"] = random.choice(etat_options)
    
    for fuite in fuite_elements:
        if pv_type == "reception":
            form_data[f"{fuite}_reception"] = random.choice(["oui", "non"])
        else:
            form_data[f"{fuite}_reception"] = random.choice(["oui", "non"])
            form_data[f"{fuite}_retour"] = random.choice(["oui", "non"])
    
    # Observations
    observations = [
        "",
        "Matériel en bon état général",
        "Légers signes d'usure normale",
        "Quelques rayures superficielles",
        "Matériel bien entretenu",
        "Pneus à surveiller",
        "Fonctionnement optimal",
        "RAS - Conforme",
        "Petit choc sur panier à signaler",
        "Huile hydraulique à compléter prochainement"
    ]
    
    form_data["observations_reception"] = random.choice(observations) if pv_type == "reception" else random.choice(observations)
    form_data["observations_retour"] = random.choice(observations) if pv_type == "retour" else ""
    
    # Signatures
    form_data["signature_reception"] = generate_signature() if pv_type == "reception" else generate_signature()
    form_data["signature_retour"] = generate_signature() if pv_type == "retour" else "data:,"
    
    created_at = datetime.now().isoformat() + "Z"
    form_data["created_at"] = created_at
    
    # Structure complète du PV
    pv_data = {
        "id": pv_id,
        "chantier": chantier,
        "created_at": created_at,
        "updated_at": created_at,
        "last_sent_date": None if random.random() > 0.3 else datetime.now().isoformat(),
        "form_data": form_data
    }
    
    return pv_id, pv_data

def main():
    """Génère 100 PV d'exemple"""
    print("Génération de 100 PV d'exemple...")
    
    for i in range(100):
        # Alterner entre réception et retour
        pv_type = "reception" if i % 2 == 0 else "retour"
        
        pv_id, pv_data = generate_pv_data(pv_type)
        
        # Sauvegarder le fichier JSON
        filename = f"saved_pv/{pv_id}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(pv_data, f, ensure_ascii=False, indent=2)
        
        print(f"✓ PV {i+1}/100 créé: {pv_id} (type: {pv_type})")
    
    print("\n✅ 100 PV générés avec succès dans le dossier saved_pv/")

if __name__ == "__main__":
    main()
