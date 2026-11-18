-- ============================================================
-- LIBRARY MANAGER API
-- Modèle logique de données (MLD) - MySQL
-- Compatible avec MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS library_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE library_manager;

-- Suppression dans l'ordre des dépendances pour permettre
-- une réexécution complète du script (ATTENTION : supprime les données).
DROP TABLE IF EXISTS LOAN;
DROP TABLE IF EXISTS BOOK;
DROP TABLE IF EXISTS MEMBER;
DROP TABLE IF EXISTS USER;
DROP TABLE IF EXISTS AUTHOR;

-- ------------------------------------------------------------
-- Table : AUTHOR
-- ------------------------------------------------------------
CREATE TABLE AUTHOR (
    id_author INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,
    nationality VARCHAR(100) NULL,
    CONSTRAINT pk_author PRIMARY KEY (id_author)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Table : BOOK
-- Chaque livre est associé à un seul auteur.
-- ------------------------------------------------------------
CREATE TABLE BOOK (
    id_book INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) NULL,
    inventory_code VARCHAR(50) NULL,
    publication_date DATE NULL,
    category VARCHAR(100) NULL,
    id_author INT NOT NULL,
    CONSTRAINT pk_book PRIMARY KEY (id_book),
    CONSTRAINT uq_book_isbn UNIQUE (isbn),
    CONSTRAINT uq_book_inventory_code UNIQUE (inventory_code),
    CONSTRAINT fk_book_author
        FOREIGN KEY (id_author)
        REFERENCES AUTHOR (id_author)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Table : MEMBER
-- ------------------------------------------------------------
CREATE TABLE MEMBER (
    id_member INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    registration_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    CONSTRAINT pk_member PRIMARY KEY (id_member),
    CONSTRAINT uq_member_email UNIQUE (email)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Table : USER
-- USER est le compte de l'employé/utilisateur qui enregistre
-- un emprunt. Le mot de passe est stocké sous forme hachée.
-- ------------------------------------------------------------
CREATE TABLE `USER` (
    id_user INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    CONSTRAINT pk_user PRIMARY KEY (id_user),
    CONSTRAINT uq_user_email UNIQUE (email)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Table : LOAN
-- La date limite (due_date) est prévue 14 jours après loan_date.
-- Cette règle sera appliquée dans la logique de l'application.
-- ------------------------------------------------------------
CREATE TABLE LOAN (
    id_loan INT NOT NULL AUTO_INCREMENT,
    loan_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,
    status VARCHAR(30) NOT NULL,
    id_member INT NOT NULL,
    id_book INT NOT NULL,
    id_user INT NOT NULL,
    CONSTRAINT pk_loan PRIMARY KEY (id_loan),
    CONSTRAINT fk_loan_member
        FOREIGN KEY (id_member)
        REFERENCES MEMBER (id_member),
    CONSTRAINT fk_loan_book
        FOREIGN KEY (id_book)
        REFERENCES BOOK (id_book),
    CONSTRAINT fk_loan_user
        FOREIGN KEY (id_user)
        REFERENCES `USER` (id_user)
) ENGINE = InnoDB;

-- ============================================================
-- Fin du script
-- ============================================================
