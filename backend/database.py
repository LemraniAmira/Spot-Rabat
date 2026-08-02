# database.py
from neo4j import GraphDatabase
import os

# Paramètres de connexion
NEO4J_URI      = "neo4j://127.0.0.1:7687"
NEO4J_USER     = "neo4j"
NEO4J_PASSWORD = "VOTRE_MOT_DE_PASSE"  # ← remplacez par votre mot de passe Neo4j

# Driver global (réutilisé par toutes les routes)
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def get_driver():
    return driver
