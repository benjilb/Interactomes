-- init.sql
DROP DATABASE IF EXISTS interactomesdb;
CREATE DATABASE interactomesdb;
USE interactomesdb;

-- init.sql

USE interactomesdb;

-- Table des protéines
CREATE TABLE proteins (
                          uniprot_id VARCHAR(20) PRIMARY KEY,
                          gene_name VARCHAR(100),
                          protein_name VARCHAR(255),
                          organism VARCHAR(255),
                          organism_id INT NOT NULL,
                          sequence TEXT
);

-- Table des crosslinks entre protéines
CREATE TABLE crosslinks (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            protein1_id VARCHAR(20) NOT NULL,
                            protein2_id VARCHAR(20) NOT NULL,
                            abspos1 INT NOT NULL,
                            abspos2 INT NOT NULL,
                            score FLOAT,
                            FOREIGN KEY (protein1_id) REFERENCES proteins(uniprot_id) ON DELETE CASCADE,
                            FOREIGN KEY (protein2_id) REFERENCES proteins(uniprot_id) ON DELETE CASCADE
);
