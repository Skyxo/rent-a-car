#!/usr/bin/env python3
"""
Script de migration pour ajouter les colonnes VGP à la table pvs existante.
Ajoute les champs pour la gestion de la Vérification Générale Périodique.
"""

import sqlite3
import sys
from pathlib import Path

def migrate_vgp():
    """Ajoute les colonnes vgp_date et vgp_document_path à la table pvs"""
    
    db_path = Path(__file__).parent / 'instance' / 'pvs.db'
    
    if not db_path.exists():
        print(f"❌ Erreur : La base de données {db_path} n'existe pas.")
        return False
    
    print(f"📦 Migration VGP de la base de données : {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Vérifier si les colonnes existent déjà
        cursor.execute("PRAGMA table_info(pvs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        changes_made = False
        
        # Ajouter vgp_date si elle n'existe pas
        if 'vgp_date' not in columns:
            print("➕ Ajout de la colonne 'vgp_date'...")
            cursor.execute("""
                ALTER TABLE pvs 
                ADD COLUMN vgp_date TEXT
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_vgp_date ON pvs(vgp_date)")
            changes_made = True
            print("✅ Colonne 'vgp_date' ajoutée avec index")
        else:
            print("ℹ️  La colonne 'vgp_date' existe déjà")
        
        # Ajouter vgp_document_path si elle n'existe pas
        if 'vgp_document_path' not in columns:
            print("➕ Ajout de la colonne 'vgp_document_path'...")
            cursor.execute("""
                ALTER TABLE pvs 
                ADD COLUMN vgp_document_path TEXT
            """)
            changes_made = True
            print("✅ Colonne 'vgp_document_path' ajoutée")
        else:
            print("ℹ️  La colonne 'vgp_document_path' existe déjà")
        
        if changes_made:
            conn.commit()
            print("\n✨ Migration VGP terminée avec succès !")
        else:
            print("\n✨ Aucune modification nécessaire - les colonnes VGP existent déjà")
        
        # Vérifier le nombre de PV
        cursor.execute("SELECT COUNT(*) FROM pvs")
        count = cursor.fetchone()[0]
        print(f"📊 Nombre de PV dans la base : {count}")
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Erreur lors de la migration : {e}")
        return False

if __name__ == '__main__':
    success = migrate_vgp()
    sys.exit(0 if success else 1)
