#!/usr/bin/env python3
"""
Script de migration : Ajouter la table PV_Version pour le versioning des PV
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / 'instance' / 'pvs.db'

def migrate():
    print("🔄 Migration : Ajout du système de versioning des PV...")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Créer la table pv_versions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pv_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pv_id TEXT NOT NULL,
                version_number INTEGER NOT NULL,
                date_creation TIMESTAMP NOT NULL,
                data TEXT NOT NULL,
                created_by TEXT DEFAULT 'system',
                comment TEXT,
                FOREIGN KEY (pv_id) REFERENCES pvs(id) ON DELETE CASCADE,
                UNIQUE(pv_id, version_number)
            )
        """)
        
        # Créer des index pour accélérer les recherches
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_pv_versions_pv_id 
            ON pv_versions(pv_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_pv_versions_date_creation 
            ON pv_versions(date_creation)
        """)
        
        # Ajouter la colonne version_courante dans la table pvs
        try:
            cursor.execute("""
                ALTER TABLE pvs ADD COLUMN version_courante INTEGER DEFAULT 1
            """)
            print("✓ Colonne 'version_courante' ajoutée à la table pvs")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("✓ Colonne 'version_courante' existe déjà")
            else:
                raise
        
        conn.commit()
        print("✅ Migration terminée avec succès !")
        print(f"   - Table 'pv_versions' créée")
        print(f"   - Index créés pour optimiser les requêtes")
        
        # Afficher les statistiques
        cursor.execute("SELECT COUNT(*) FROM pvs")
        pv_count = cursor.fetchone()[0]
        print(f"\n📊 Base de données : {pv_count} PV existants")
        print("   Ces PV seront considérés comme Version 1 par défaut")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Erreur lors de la migration : {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
