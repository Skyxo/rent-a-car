#!/usr/bin/env python3
"""
Script de migration pour ajouter les colonnes VGP à la table existante.
Ajoute vgp_date et vgp_document_path sans perdre de données.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = 'pvs.db'

def add_vgp_columns():
    """Ajoute les colonnes VGP à la table pvs si elles n'existent pas."""
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Erreur : La base de données {DB_PATH} n'existe pas.")
        return False
    
    # Backup de la base
    backup_path = f'pvs_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
    print(f"📦 Création du backup : {backup_path}")
    
    import shutil
    shutil.copy2(DB_PATH, backup_path)
    print(f"✅ Backup créé avec succès")
    
    # Connexion à la base
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Vérifier si les colonnes existent déjà
        cursor.execute("PRAGMA table_info(pvs)")
        columns = [row[1] for row in cursor.fetchall()]
        
        print(f"\n📋 Colonnes existantes : {', '.join(columns)}")
        
        # Ajouter vgp_date si elle n'existe pas
        if 'vgp_date' not in columns:
            print("\n➕ Ajout de la colonne 'vgp_date'...")
            cursor.execute("ALTER TABLE pvs ADD COLUMN vgp_date TEXT")
            print("✅ Colonne 'vgp_date' ajoutée")
        else:
            print("\n✓ La colonne 'vgp_date' existe déjà")
        
        # Ajouter vgp_document_path si elle n'existe pas
        if 'vgp_document_path' not in columns:
            print("➕ Ajout de la colonne 'vgp_document_path'...")
            cursor.execute("ALTER TABLE pvs ADD COLUMN vgp_document_path TEXT")
            print("✅ Colonne 'vgp_document_path' ajoutée")
        else:
            print("✓ La colonne 'vgp_document_path' existe déjà")
        
        # Créer un index sur vgp_date pour les recherches rapides
        if 'vgp_date' not in columns:
            print("\n🔍 Création de l'index sur 'vgp_date'...")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_pvs_vgp_date ON pvs(vgp_date)")
            print("✅ Index créé")
        
        # Commit des changements
        conn.commit()
        
        # Vérification finale
        cursor.execute("PRAGMA table_info(pvs)")
        columns_after = [row[1] for row in cursor.fetchall()]
        print(f"\n📋 Colonnes après migration : {', '.join(columns_after)}")
        
        # Compter les PV
        cursor.execute("SELECT COUNT(*) FROM pvs")
        count = cursor.fetchone()[0]
        print(f"\n✅ Migration réussie ! {count} PV dans la base de données.")
        print(f"💾 Backup disponible : {backup_path}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors de la migration : {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()


if __name__ == '__main__':
    print("=" * 70)
    print("Migration : Ajout des colonnes VGP")
    print("=" * 70)
    
    success = add_vgp_columns()
    
    if success:
        print("\n🎉 Migration terminée avec succès !")
    else:
        print("\n❌ La migration a échoué.")
        print("💡 Le backup est disponible si nécessaire.")
