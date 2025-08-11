-- init.sql
DROP DATABASE IF EXISTS interactomesdb;
CREATE DATABASE interactomesdb;
USE interactomesdb;

-- init.sql

USE interactomesdb;

-- Recommandations globales
-- ENGINE=InnoDB, utf8mb4_unicode_ci
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE users (
                       id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                       email         VARCHAR(255) NOT NULL UNIQUE,
                       first_name    VARCHAR(120) NOT NULL,
                       last_name     VARCHAR(120) NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE organisms (
                           id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                           taxon_id       INT UNSIGNED NOT NULL,         -- NCBI TaxID / UniProt organismId
                           name         VARCHAR(255) NOT NULL,         -- "Bos taurus", "Homo sapiens", etc.
                           common_name  VARCHAR(255) NULL,
                           UNIQUE KEY uq_org_taxid (taxon_id),
                           UNIQUE KEY uq_org_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE organelles (
                            id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                            name      VARCHAR(255) NOT NULL,
                            UNIQUE KEY uq_organelle_name_ci (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Référentiel protéines (clé = UniProt)
CREATE TABLE proteins (
                          uniprot_id    VARCHAR(20) PRIMARY KEY,
                          taxon_id   BIGINT UNSIGNED NOT NULL,
                          gene_name     VARCHAR(255) NULL,
                          protein_name  VARCHAR(512) NULL,
                          sequence      MEDIUMTEXT NULL,
                          length        INT UNSIGNED NULL,
                          go_terms       TEXT NULL,
                          updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          CONSTRAINT fk_proteins_organism
                              FOREIGN KEY (taxon_id) REFERENCES organisms(taxon_id)
                                  ON UPDATE CASCADE ON DELETE RESTRICT,
                          KEY idx_proteins_organism (taxon_id),
                          KEY idx_proteins_gene (gene_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Un dataset = un fichier uploadé (User × Organism × Organelle)
CREATE TABLE datasets (
                          id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                          user_id       BIGINT UNSIGNED NOT NULL,
                          taxon_id   BIGINT UNSIGNED NOT NULL,
                          organelle_id  BIGINT UNSIGNED NOT NULL,
                          filename      VARCHAR(512) NOT NULL,
                          file_sha256   CHAR(64) NULL,               -- pour dédoublonnage optionnel
                          rows_count    INT UNSIGNED NULL,
                          status        ENUM('uploaded','parsed','validated','failed') NOT NULL DEFAULT 'uploaded',
                          created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          CONSTRAINT fk_datasets_user
                              FOREIGN KEY (user_id) REFERENCES users(id)
                                  ON UPDATE CASCADE ON DELETE CASCADE,
                          CONSTRAINT fk_datasets_organism
                              FOREIGN KEY (taxon_id) REFERENCES organisms(id)
                                  ON UPDATE CASCADE ON DELETE RESTRICT,
                          CONSTRAINT fk_datasets_organelle
                              FOREIGN KEY (organelle_id) REFERENCES organelles(id)
                                  ON UPDATE CASCADE ON DELETE RESTRICT,
                          KEY idx_dataset_lookup (taxon_id, organelle_id, user_id),
                          UNIQUE KEY uq_dataset_user_file (user_id, filename)  -- évite doublon de nom pour un user
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Les crosslinks d'un dataset
CREATE TABLE crosslinks (
                            id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                            dataset_id    BIGINT UNSIGNED NOT NULL,
                            protein1_uid  VARCHAR(20) NOT NULL,         -- UniProt P1
                            protein2_uid  VARCHAR(20) NOT NULL,         -- UniProt P2
                            abspos1       INT UNSIGNED NOT NULL,
                            abspos2       INT UNSIGNED NOT NULL,
                            score         DOUBLE NULL,                  -- ou DECIMAL(10,4) si bornes connues
    -- FKs
                            CONSTRAINT fk_x_dataset
                                FOREIGN KEY (dataset_id) REFERENCES datasets(id)
                                    ON UPDATE CASCADE ON DELETE CASCADE,
                            CONSTRAINT fk_x_p1
                                FOREIGN KEY (protein1_uid) REFERENCES proteins(uniprot_id)
                                    ON UPDATE CASCADE ON DELETE RESTRICT,
                            CONSTRAINT fk_x_p2
                                FOREIGN KEY (protein2_uid) REFERENCES proteins(uniprot_id)
                                    ON UPDATE CASCADE ON DELETE RESTRICT,
    -- Indexation pour requêtes fréquentes
                            KEY idx_x_dataset (dataset_id),
                            KEY idx_x_p1 (protein1_uid),
                            KEY idx_x_p2 (protein2_uid),
                            KEY idx_x_pair (protein1_uid, protein2_uid),
    -- Évite doublons exacts au sein d'un dataset
                            UNIQUE KEY uq_x_dedup (dataset_id, protein1_uid, protein2_uid, abspos1, abspos2, score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
