-- =============================================================================
--  Provisional Certificate Application Portal — MySQL 8 schema
--  Idempotent: safe to run repeatedly (`npm run db:migrate`).
--  Statements are separated by `;` and executed one-by-one by scripts/migrate.mjs.
-- =============================================================================

-- --------------------------------------------------------------------------
--  users
--  utf8mb4_0900_ai_ci is case-insensitive, so `email` is unique regardless of
--  the case the applicant typed — no need to normalise before every lookup.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(160) NOT NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uniq (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
--  applications
--  One row per submitted application. Applicant details are snapshotted here
--  rather than joined from `users`, because an issued certificate must keep
--  reflecting the data as it was submitted even if the account is edited later.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id                    CHAR(36)     NOT NULL,
  user_id               CHAR(36)     NOT NULL,
  reference_number      VARCHAR(32)  NOT NULL,
  status                ENUM('SUBMITTED','COMPLETED') NOT NULL DEFAULT 'SUBMITTED',

  -- Step 1: personal & registration details
  full_name             VARCHAR(160) NOT NULL,
  date_of_birth         DATE         NOT NULL,
  gender                VARCHAR(24)      NULL,
  registration_number   VARCHAR(64)  NOT NULL,
  course_name           VARCHAR(160) NOT NULL,
  institution_name      VARCHAR(200) NOT NULL,
  year_of_passing       SMALLINT UNSIGNED NOT NULL,
  email                 VARCHAR(254) NOT NULL,
  phone                 VARCHAR(24)  NOT NULL,
  address_line1         VARCHAR(200) NOT NULL,
  address_line2         VARCHAR(200)     NULL,
  city                  VARCHAR(100) NOT NULL,
  state                 VARCHAR(100) NOT NULL,
  postal_code           VARCHAR(16)  NOT NULL,

  -- Certificate / acknowledgement metadata
  certificate_serial    VARCHAR(32)      NULL,
  certificate_issued_at DATETIME(3)      NULL,

  submitted_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY applications_reference_uniq (reference_number),
  UNIQUE KEY applications_certificate_serial_uniq (certificate_serial),
  -- One application per registration number, per applicant account.
  UNIQUE KEY applications_user_registration_uniq (user_id, registration_number),
  KEY applications_user_created_idx (user_id, created_at DESC),
  CONSTRAINT applications_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT applications_year_of_passing_range CHECK (year_of_passing BETWEEN 1950 AND 2100),
  -- A COMPLETED application must carry an issued certificate.
  CONSTRAINT applications_certificate_consistency CHECK (
    status <> 'COMPLETED'
    OR (certificate_serial IS NOT NULL AND certificate_issued_at IS NOT NULL)
  )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
--  documents
--  Uploads happen at step 2, before the application row exists, so a document
--  is first owned only by the user (application_id NULL = "staged"). Submitting
--  the form attaches the staged documents to the new application atomically.
--  `user_id` is denormalised onto the row so every read can be scoped by owner
--  without a join — that is the document-isolation guarantee.
--
--  MySQL treats NULLs as distinct in a UNIQUE key, so the index below enforces
--  "at most one document of each type per application" while still allowing
--  many staged (application_id IS NULL) uploads.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id              CHAR(36)     NOT NULL,
  user_id         CHAR(36)     NOT NULL,
  application_id  CHAR(36)         NULL,
  doc_type        ENUM('ID_PROOF','DEGREE_CERTIFICATE') NOT NULL,
  original_name   VARCHAR(255) NOT NULL,
  storage_key     VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  size_bytes      BIGINT UNSIGNED NOT NULL,
  checksum_sha256 CHAR(64)     NOT NULL,
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),
  UNIQUE KEY documents_storage_key_uniq (storage_key),
  UNIQUE KEY documents_application_doc_type_uniq (application_id, doc_type),
  KEY documents_user_created_idx (user_id, created_at DESC),
  CONSTRAINT documents_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT documents_application_fk FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
  CONSTRAINT documents_size_positive CHECK (size_bytes > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- --------------------------------------------------------------------------
--  certificate_serials
--  MySQL has no sequences, so an AUTO_INCREMENT counter table stands in.
--  Inserting one row hands out the next gap-free serial under InnoDB's own
--  locking — the DB, not the application, guarantees uniqueness.
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificate_serials (
  serial     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (serial)
) ENGINE = InnoDB AUTO_INCREMENT = 1001 DEFAULT CHARSET = utf8mb4;
