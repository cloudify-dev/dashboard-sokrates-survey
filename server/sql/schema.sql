CREATE DATABASE IF NOT EXISTS sokrates_survey
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sokrates_survey;

DROP TABLE IF EXISTS survey_responses;

CREATE TABLE survey_responses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  semester VARCHAR(32) NOT NULL,
  tenant VARCHAR(255) NOT NULL,
  participant_name VARCHAR(255) NULL,
  school_location VARCHAR(255) NULL,
  kemudahan TINYINT UNSIGNED NULL,
  responsif TINYINT UNSIGNED NULL,
  solusi TINYINT UNSIGNED NULL,
  kepuasan TINYINT UNSIGNED NULL,
  menu TEXT NULL,
  saran TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_semester (semester),
  INDEX idx_tenant (tenant),
  INDEX idx_semester_tenant (semester, tenant)
) ENGINE=InnoDB;
