

-- TABLE: vs_account_data_request
CREATE TABLE `vs_account_data_request` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `request_type` enum('export','deactivation','deletion') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Type of account action requested',
  `status` enum('initiated','pending_confirmation','confirmed','processing','completed','partially_completed','cancelled','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'initiated' COMMENT 'Lifecycle status of the request',
  `policy_version` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '1.0' COMMENT 'Policy/notice version shown at intake',
  `idempotency_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Prevents duplicate submissions',
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` datetime DEFAULT NULL COMMENT 'When employee confirmed the action',
  `started_at` datetime DEFAULT NULL COMMENT 'When worker began processing',
  `completed_at` datetime DEFAULT NULL COMMENT 'When processing finished',
  `expires_at` datetime DEFAULT NULL COMMENT 'Confirmation/export link expiry',
  `result_summary` text COLLATE utf8mb4_unicode_ci COMMENT 'Human-readable outcome or retention note',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  UNIQUE KEY `uq_vs_data_request_idempotency` (`idempotency_key`),
  KEY `idx_vs_data_request_user_type` (`user_id`,`request_type`),
  KEY `idx_vs_data_request_status` (`status`,`requested_at`),
  CONSTRAINT `fk_vs_data_request_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_deletion_request
CREATE TABLE `vs_account_deletion_request` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `requested_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_at` datetime NOT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `hold_state` tinyint(1) DEFAULT '0',
  `retention_state` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result_category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `idx_deletion_due` (`due_at`),
  KEY `fk_deletion_request_user` (`user_id`),
  CONSTRAINT `fk_deletion_request_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_enforcement_receipt
CREATE TABLE `vs_account_enforcement_receipt` (
  `receipt_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `service` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_version` int NOT NULL,
  `enforced_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `result` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`receipt_id`),
  KEY `fk_enforcement_receipt_event` (`event_id`),
  CONSTRAINT `fk_enforcement_receipt_event` FOREIGN KEY (`event_id`) REFERENCES `vs_account_status_outbox` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_restriction
CREATE TABLE `vs_account_restriction` (
  `restriction_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `effective_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`restriction_id`),
  UNIQUE KEY `uq_user_restriction_active` (`user_id`,`code`,`scope_type`,`scope_id`,`status`),
  CONSTRAINT `fk_account_restriction_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_status
CREATE TABLE `vs_account_status` (
  `user_id` int NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_version` int NOT NULL DEFAULT '1',
  `reason_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `public_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `effective_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `case_id` int DEFAULT NULL,
  `session_epoch` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_account_status_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_status_case
CREATE TABLE `vs_account_status_case` (
  `case_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `assigned_reviewer` int DEFAULT NULL,
  `evidence_refs` text COLLATE utf8mb4_unicode_ci,
  `statement` text COLLATE utf8mb4_unicode_ci,
  `public_decision` text COLLATE utf8mb4_unicode_ci,
  `internal_decision` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`case_id`),
  KEY `idx_case_state_assigned` (`state`,`assigned_reviewer`),
  KEY `fk_status_case_user` (`user_id`),
  CONSTRAINT `fk_status_case_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_status_history
CREATE TABLE `vs_account_status_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `prior_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prior_version` int DEFAULT NULL,
  `new_version` int NOT NULL,
  `actor` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approver` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `policy_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_status_history_user_time` (`user_id`,`occurred_at`),
  CONSTRAINT `fk_status_history_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_account_status_outbox
CREATE TABLE `vs_account_status_outbox` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `status_version` int NOT NULL,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_ref` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `attempts` int NOT NULL DEFAULT '0',
  `next_attempt_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_outbox_status_attempt` (`status`,`next_attempt_at`),
  KEY `fk_status_outbox_user` (`user_id`),
  CONSTRAINT `fk_status_outbox_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_applicant_invitation
CREATE TABLE `vs_applicant_invitation` (
  `invitation_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `applicant_user_id` int NOT NULL,
  `job_id` int DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','VIEWED','ACCEPTED','DECLINED','EXPIRED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `response_message` text COLLATE utf8mb4_unicode_ci,
  `responded_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`invitation_id`),
  KEY `idx_company` (`company_id`),
  KEY `idx_applicant` (`applicant_user_id`),
  KEY `idx_job` (`job_id`),
  KEY `idx_status` (`status`),
  KEY `fk_applicant_invitation_created_by` (`created_by`),
  CONSTRAINT `fk_applicant_invitation_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_applicant_invitation_created_by` FOREIGN KEY (`created_by`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_applicant_invitation_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_applicant_invitation_user` FOREIGN KEY (`applicant_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_audit_config
CREATE TABLE `vs_audit_config` (
  `audit_config_id` bigint NOT NULL AUTO_INCREMENT,
  `event_category` varchar(100) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `description` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_config_id`),
  UNIQUE KEY `uq_event` (`event_category`,`event_type`),
  KEY `fk_audit_config_created_by` (`created_by`),
  KEY `fk_audit_config_updated_by` (`updated_by`),
  CONSTRAINT `fk_audit_config_created_by` FOREIGN KEY (`created_by`) REFERENCES `vs_user` (`user_id`),
  CONSTRAINT `fk_audit_config_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `vs_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_audit_trail
CREATE TABLE `vs_audit_trail` (
  `audit_id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) NOT NULL,
  `event_category` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `status` enum('SUCCESS','FAILED','DENIED') NOT NULL DEFAULT 'SUCCESS',
  `actor_type` enum('USER','ADMIN','SERVICE','SYSTEM') NOT NULL DEFAULT 'USER',
  `actor_user_id` int DEFAULT NULL,
  `actor_company_id` int DEFAULT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` varchar(100) DEFAULT NULL,
  `organization_type` enum('EMPLOYER','FREELANCER','SCHOOL','PLATFORM') DEFAULT NULL,
  `organization_id` int DEFAULT NULL,
  `reason` text,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `correlation_id` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`)
) ENGINE=InnoDB AUTO_INCREMENT=286 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_candidate_review
CREATE ALGORITHM=UNDEFINED DEFINER=`vosSystem`@`%` SQL SECURITY DEFINER VIEW `vs_candidate_review` AS select `ja`.`application_id` AS `application_id`,`ja`.`job_id` AS `job_id`,`ja`.`application_status` AS `application_status`,`ja`.`applied_at` AS `applied_at`,`u`.`user_id` AS `user_id`,concat(`u`.`user_fname`,' ',coalesce(`u`.`user_mname`,''),' ',`u`.`user_lname`) AS `full_name`,`u`.`user_email` AS `user_email`,`u`.`user_contact` AS `user_contact`,`u`.`profile_image_url` AS `profile_image_url`,`p`.`profile_headline` AS `profile_headline`,`p`.`professional_summary` AS `professional_summary`,`p`.`expected_salary` AS `expected_salary`,`j`.`job_title` AS `job_title`,`j`.`work_arrangement` AS `work_arrangement`,(select count(0) from `vs_work_experience` `we` where (`we`.`user_id` = `u`.`user_id`)) AS `total_experience_entries`,(select count(0) from `vs_certifications` `c` where (`c`.`user_id` = `u`.`user_id`)) AS `certifications_count`,(select count(0) from `vs_user_skills_map` `usm` where (`usm`.`user_id` = `u`.`user_id`)) AS `skills_count` from (((`vs_job_application` `ja` join `vs_user` `u` on((`u`.`user_id` = `ja`.`user_id`))) left join `vs_job_seeker_profile` `p` on((`p`.`user_id` = `u`.`user_id`))) join `vs_job_posting` `j` on((`j`.`job_id` = `ja`.`job_id`)));


-- TABLE: vs_certifications
CREATE TABLE `vs_certifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `certificate_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `issuing_organization` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `issue_date` date DEFAULT NULL,
  `credential_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vs_cert_user_id` (`user_id`),
  CONSTRAINT `fk_vs_cert_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_company
CREATE TABLE `vs_company` (
  `company_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `organization_type_id` int DEFAULT NULL,
  `year_established` year DEFAULT NULL,
  `industry_id` int DEFAULT NULL,
  `company_size_id` int DEFAULT NULL,
  `company_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `company_legal_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_brgy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_province` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_country` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_zipCode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registration_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `company_tin` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `company_contact` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_logo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `company_cover` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_facebook` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_linkedin` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_instagram` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_x` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_youtube` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_website` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company_description` text COLLATE utf8mb4_unicode_ci,
  `company_mission` text COLLATE utf8mb4_unicode_ci,
  `company_vision` text COLLATE utf8mb4_unicode_ci,
  `company_culture` text COLLATE utf8mb4_unicode_ci,
  `company_benefits` text COLLATE utf8mb4_unicode_ci,
  `company_tags` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `verification_status` enum('DRAFT','PENDING_VERIFICATION','VERIFIED','REJECTED','INACTIVE','SUSPENDED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `rejection_reason` text COLLATE utf8mb4_unicode_ci,
  `profile_completion_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_public` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `submitted_at` datetime DEFAULT NULL,
  `verified_by_user_id` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  UNIQUE KEY `uk_company_code` (`company_code`),
  UNIQUE KEY `uk_company_registration` (`registration_no`),
  UNIQUE KEY `uk_company_tin` (`company_tin`),
  KEY `fk_company_verified_by` (`verified_by_user_id`),
  KEY `fk_company_created_by` (`created_by_user_id`),
  KEY `fk_company_industry` (`industry_id`),
  KEY `fk_company_size` (`company_size_id`),
  KEY `fk_company_updated_by` (`updated_by_user_id`),
  KEY `fk_company_organization_type` (`organization_type_id`),
  KEY `idx_company_status` (`verification_status`),
  KEY `idx_company_public` (`is_public`),
  KEY `idx_company_active` (`is_active`),
  KEY `idx_company_name` (`company_name`),
  KEY `idx_company_legal_name` (`company_legal_name`),
  CONSTRAINT `fk_company_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_industry` FOREIGN KEY (`industry_id`) REFERENCES `vs_industry` (`industry_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_organization_type` FOREIGN KEY (`organization_type_id`) REFERENCES `vs_organization_type` (`organization_type_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_size` FOREIGN KEY (`company_size_id`) REFERENCES `vs_company_size` (`company_size_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_verified_by` FOREIGN KEY (`verified_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_company_document
CREATE TABLE `vs_company_document` (
  `company_document_id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `directus_file_id` char(36) NOT NULL,
  `uploaded_by_user_id` int DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_document_id`),
  KEY `fk_company_document_company` (`company_id`),
  KEY `fk_company_document_uploaded_by` (`uploaded_by_user_id`),
  KEY `idx_company_document_type` (`document_type`),
  CONSTRAINT `fk_company_document_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_company_document_uploaded_by` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_company_review
CREATE TABLE `vs_company_review` (
  `review_id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `reviewer_user_id` int NOT NULL,
  `employment_status` enum('CURRENT_EMPLOYEE','FORMER_EMPLOYEE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `overall_rating` tinyint NOT NULL,
  `work_life_balance_rating` tinyint DEFAULT NULL,
  `compensation_rating` tinyint DEFAULT NULL,
  `management_rating` tinyint DEFAULT NULL,
  `career_growth_rating` tinyint DEFAULT NULL,
  `review_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pros` text COLLATE utf8mb4_unicode_ci,
  `cons` text COLLATE utf8mb4_unicode_ci,
  `review_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PUBLISHED','HIDDEN','REMOVED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PUBLISHED',
  `is_anonymous` tinyint(1) NOT NULL DEFAULT '1',
  `moderated_by_user_id` int DEFAULT NULL,
  `moderated_at` datetime DEFAULT NULL,
  `moderation_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uq_company_review_user` (`company_id`,`reviewer_user_id`),
  KEY `idx_company_review_company_status` (`company_id`,`status`),
  KEY `idx_company_review_reviewer` (`reviewer_user_id`),
  KEY `idx_company_review_created` (`company_id`,`created_at`),
  KEY `idx_company_review_moderator` (`moderated_by_user_id`),
  CONSTRAINT `fk_company_review_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_company_review_moderator` FOREIGN KEY (`moderated_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_company_review_reviewer` FOREIGN KEY (`reviewer_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_company_review_career_growth_rating` CHECK (((`career_growth_rating` is null) or (`career_growth_rating` between 1 and 5))),
  CONSTRAINT `chk_company_review_compensation_rating` CHECK (((`compensation_rating` is null) or (`compensation_rating` between 1 and 5))),
  CONSTRAINT `chk_company_review_management_rating` CHECK (((`management_rating` is null) or (`management_rating` between 1 and 5))),
  CONSTRAINT `chk_company_review_overall_rating` CHECK ((`overall_rating` between 1 and 5)),
  CONSTRAINT `chk_company_review_work_life_rating` CHECK (((`work_life_balance_rating` is null) or (`work_life_balance_rating` between 1 and 5)))
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_company_review_report
CREATE TABLE `vs_company_review_report` (
  `report_id` bigint NOT NULL AUTO_INCREMENT,
  `review_id` bigint NOT NULL,
  `reporter_user_id` int NOT NULL,
  `reason_code` enum('SPAM','FALSE_INFORMATION','HARASSMENT','HATE_SPEECH','PERSONAL_INFORMATION','CONFIDENTIAL_INFORMATION','OFF_TOPIC','DUPLICATE','FRAUDULENT_CONTENT','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_details` text COLLATE utf8mb4_unicode_ci,
  `status` enum('PENDING','UNDER_REVIEW','DISMISSED','ACTIONED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `reviewed_by_user_id` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `resolution_action` enum('NO_ACTION','KEEP_PUBLISHED','HIDE_REVIEW','REMOVE_REVIEW') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolution_reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`),
  UNIQUE KEY `uq_company_review_reporter` (`review_id`,`reporter_user_id`),
  KEY `idx_company_review_report_review_status` (`review_id`,`status`),
  KEY `idx_company_review_report_reporter` (`reporter_user_id`),
  KEY `idx_company_review_report_status` (`status`),
  KEY `idx_company_review_report_reviewer` (`reviewed_by_user_id`),
  CONSTRAINT `fk_company_review_report_reporter` FOREIGN KEY (`reporter_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_company_review_report_review` FOREIGN KEY (`review_id`) REFERENCES `vs_company_review` (`review_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_company_review_report_reviewer` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_company_review_summary
CREATE ALGORITHM=UNDEFINED DEFINER=`vosSystem`@`%` SQL SECURITY DEFINER VIEW `vs_company_review_summary` AS select `r`.`company_id` AS `company_id`,count(0) AS `total_reviews`,round(avg(`r`.`overall_rating`),2) AS `overall_rating_avg`,round(avg(`r`.`work_life_balance_rating`),2) AS `work_life_balance_avg`,round(avg(`r`.`compensation_rating`),2) AS `compensation_avg`,round(avg(`r`.`management_rating`),2) AS `management_avg`,round(avg(`r`.`career_growth_rating`),2) AS `career_growth_avg`,sum((case when (`r`.`overall_rating` = 5) then 1 else 0 end)) AS `rating_5_count`,sum((case when (`r`.`overall_rating` = 4) then 1 else 0 end)) AS `rating_4_count`,sum((case when (`r`.`overall_rating` = 3) then 1 else 0 end)) AS `rating_3_count`,sum((case when (`r`.`overall_rating` = 2) then 1 else 0 end)) AS `rating_2_count`,sum((case when (`r`.`overall_rating` = 1) then 1 else 0 end)) AS `rating_1_count`,sum((case when (`r`.`employment_status` = 'CURRENT_EMPLOYEE') then 1 else 0 end)) AS `current_employee_count`,sum((case when (`r`.`employment_status` = 'FORMER_EMPLOYEE') then 1 else 0 end)) AS `former_employee_count`,max(`r`.`created_at`) AS `last_review_at` from `vs_company_review` `r` where (`r`.`status` = 'APPROVED') group by `r`.`company_id`;


-- TABLE: vs_company_size
CREATE TABLE `vs_company_size` (
  `company_size_id` int NOT NULL AUTO_INCREMENT,
  `company_size_name` varchar(100) NOT NULL,
  `min_employee_count` int DEFAULT NULL,
  `max_employee_count` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`company_size_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_company_user
CREATE TABLE `vs_company_user` (
  `company_user_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `user_id` int NOT NULL,
  `company_user_role` varchar(20) NOT NULL DEFAULT 'OWNER',
  `is_primary_contact` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_user_id`),
  UNIQUE KEY `uk_company_user` (`company_id`,`user_id`),
  KEY `idx_company_id` (`company_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_company_user_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_company_user_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_company_verifications
CREATE TABLE `vs_company_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `submitted_by_user_id` int DEFAULT NULL,
  `verification_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INITIAL_REGISTRATION',
  `status` enum('PENDING_VERIFICATION','IN_REVIEW','CORRECTION_REQUIRED','APPROVED','REJECTED','SUSPENDED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `public_rejection_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Applicant-facing explanation',
  `internal_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Restricted internal reviewer notes',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_vs_company_verif_company` (`company_id`),
  KEY `fk_vs_company_verif_submitted_by` (`submitted_by_user_id`),
  KEY `fk_vs_company_verif_reviewer` (`reviewed_by`),
  KEY `idx_vs_company_verif_status` (`status`),
  KEY `idx_vs_company_verif_type` (`verification_type`),
  CONSTRAINT `fk_vs_company_verif_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vs_company_verif_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vs_company_verif_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_conversation
CREATE TABLE `vs_conversation` (
  `conversation_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int DEFAULT NULL,
  `client_id` int NOT NULL,
  `freelancer_id` int NOT NULL,
  `conversation_type` enum('JOB_APPLICATION','DIRECT_MESSAGE','SUPPORT') NOT NULL DEFAULT 'JOB_APPLICATION',
  `status` enum('ACTIVE','ARCHIVED','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  `last_message_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `archived_by_client` tinyint(1) DEFAULT '0',
  `archived_by_freelancer` tinyint(1) DEFAULT '0',
  `archived_at` datetime DEFAULT NULL,
  PRIMARY KEY (`conversation_id`),
  KEY `job_id` (`job_id`),
  KEY `client_id` (`client_id`),
  KEY `freelancer_id` (`freelancer_id`),
  CONSTRAINT `vs_conversation_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`),
  CONSTRAINT `vs_conversation_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `vs_user` (`user_id`),
  CONSTRAINT `vs_conversation_ibfk_3` FOREIGN KEY (`freelancer_id`) REFERENCES `vs_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_course_request
CREATE TABLE `vs_course_request` (
  `course_request_id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `requested_by` int NOT NULL,
  `requested_course_name` varchar(255) NOT NULL,
  `requested_course_code` varchar(50) DEFAULT NULL,
  `request_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `matched_school_course_id` int DEFAULT NULL,
  `admin_remarks` varchar(500) DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`course_request_id`),
  KEY `school_id` (`school_id`),
  KEY `matched_school_course_id` (`matched_school_course_id`),
  KEY `idx_vs_course_req_user` (`requested_by`),
  CONSTRAINT `fk_vs_course_req_user` FOREIGN KEY (`requested_by`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `vs_course_request_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `vs_school` (`school_id`) ON DELETE RESTRICT,
  CONSTRAINT `vs_course_request_ibfk_2` FOREIGN KEY (`matched_school_course_id`) REFERENCES `vs_school_course` (`school_course_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_data_export_artifact
CREATE TABLE `vs_data_export_artifact` (
  `artifact_id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `user_id` int NOT NULL COMMENT 'Denormalized for fast ownership checks',
  `storage_object_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Reference key in storage provider',
  `integrity_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'SHA-256 or similar hash for verification',
  `status` enum('active','downloaded','expired','deleted') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active' COMMENT 'Current state of the artifact',
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL COMMENT 'Short-lived download window',
  `downloaded_at` datetime DEFAULT NULL COMMENT 'When the employee downloaded the file',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`artifact_id`),
  KEY `idx_vs_export_artifact_request` (`request_id`),
  KEY `idx_vs_export_artifact_user` (`user_id`),
  KEY `idx_vs_export_artifact_expires` (`expires_at`,`status`),
  CONSTRAINT `fk_vs_export_artifact_request` FOREIGN KEY (`request_id`) REFERENCES `vs_account_data_request` (`request_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_vs_export_artifact_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_employee_education
CREATE TABLE `vs_employee_education` (
  `employee_education_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `school_id` int DEFAULT NULL,
  `school_course_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `school_name_raw` varchar(255) DEFAULT NULL,
  `education_status` varchar(20) NOT NULL DEFAULT 'Verified',
  `course_name_raw` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`employee_education_id`),
  UNIQUE KEY `unq_user_education` (`user_id`),
  KEY `school_id` (`school_id`),
  KEY `school_course_id` (`school_course_id`),
  CONSTRAINT `fk_vs_employee_educ_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `vs_employee_education_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `vs_school` (`school_id`) ON DELETE RESTRICT,
  CONSTRAINT `vs_employee_education_ibfk_2` FOREIGN KEY (`school_course_id`) REFERENCES `vs_school_course` (`school_course_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_employee_setting
CREATE TABLE `vs_employee_setting` (
  `setting_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'en-US' COMMENT 'Language/locale code e.g. en-US, fil-PH',
  `timezone` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Asia/Manila' COMMENT 'IANA timezone string',
  `date_time_format` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'YYYY-MM-DD' COMMENT 'Preferred date display format',
  `text_size` enum('small','medium','large') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT 'UI text size preference',
  `reduced_motion` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = reduce animations',
  `settings_version` int NOT NULL DEFAULT '1' COMMENT 'Optimistic-lock version counter',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_vs_employee_setting_user` (`user_id`),
  CONSTRAINT `fk_vs_employee_setting_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_employee_setting_history
CREATE TABLE `vs_employee_setting_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `setting_key` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Field/category that changed',
  `old_value` text COLLATE utf8mb4_unicode_ci COMMENT 'Previous value (safe, no secrets)',
  `new_value` text COLLATE utf8mb4_unicode_ci COMMENT 'New value (safe, no secrets)',
  `actor` enum('employee','admin','system') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'employee' COMMENT 'Who made the change',
  `source` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'e.g. web-app, api, migration',
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_vs_setting_history_user` (`user_id`),
  KEY `idx_vs_setting_history_time` (`occurred_at`),
  CONSTRAINT `fk_vs_setting_history_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_employer_notification
CREATE TABLE `vs_employer_notification` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  `category` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `action_url` varchar(1024) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_starred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`notification_id`),
  KEY `idx_vs_employer_notification_user_unread` (`user_id`,`is_read`),
  KEY `idx_vs_employer_notification_event` (`event_id`),
  CONSTRAINT `fk_vs_employer_notification_event` FOREIGN KEY (`event_id`) REFERENCES `vs_notification_event` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_employment_status
CREATE TABLE `vs_employment_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `status_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_freelancer_notification
CREATE TABLE `vs_freelancer_notification` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `event_id` int NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_url` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_starred` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`notification_id`),
  KEY `idx_vs_freelancer_notification_user_unread` (`user_id`,`is_read`),
  KEY `fk_vs_freelancer_notification_event` (`event_id`),
  CONSTRAINT `fk_vs_freelancer_notification_event` FOREIGN KEY (`event_id`) REFERENCES `vs_notification_event` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=91 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_identity_verifications
CREATE TABLE `vs_identity_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `rejection_note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `gov_id_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gov_id_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gov_id_front_image_uuid` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gov_id_back_image_uuid` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gov_id_selfie_image_uuid` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_doc_image_uuid` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile_verified` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `fk_vs_identity_user` (`user_id`),
  KEY `fk_vs_identity_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_vs_identity_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_vs_identity_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_industry
CREATE TABLE `vs_industry` (
  `industry_id` int NOT NULL AUTO_INCREMENT,
  `industry_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`industry_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_interview
CREATE TABLE `vs_interview` (
  `interview_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `application_id` int NOT NULL,
  `interviewer_user_id` int NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `duration_minutes` int DEFAULT '60',
  `timezone` varchar(100) DEFAULT 'Asia/Manila',
  `interview_format` enum('ONLINE','ONSITE','PHONE') NOT NULL,
  `meeting_link` varchar(1000) DEFAULT NULL,
  `meeting_location` text,
  `interview_notes` text,
  `candidate_notes` text,
  `feedback` text,
  `interview_status` enum('SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NOT_ATTENDED','RESCHEDULED') NOT NULL DEFAULT 'SCHEDULED',
  `cancel_reason` text,
  `created_by_user_id` int NOT NULL,
  `updated_by_user_id` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`interview_id`),
  KEY `idx_interview_company` (`company_id`),
  KEY `idx_interview_application` (`application_id`),
  KEY `idx_interview_interviewer` (`interviewer_user_id`),
  KEY `idx_interview_schedule` (`scheduled_at`),
  KEY `idx_interview_status` (`interview_status`),
  KEY `fk_interview_created_by` (`created_by_user_id`),
  KEY `fk_interview_updated_by` (`updated_by_user_id`),
  CONSTRAINT `fk_interview_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_interview_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_interview_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_interview_interviewer` FOREIGN KEY (`interviewer_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_interview_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_invite_token
CREATE TABLE `vs_invite_token` (
  `token_id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `school_id` int NOT NULL,
  `invited_email` varchar(255) NOT NULL,
  `invited_by` int NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `token` (`token`),
  KEY `fk_invite_school` (`school_id`),
  KEY `fk_invite_admin` (`invited_by`),
  CONSTRAINT `fk_invite_admin` FOREIGN KEY (`invited_by`) REFERENCES `vs_user` (`user_id`),
  CONSTRAINT `fk_invite_school` FOREIGN KEY (`school_id`) REFERENCES `vs_school` (`school_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_job_application
CREATE TABLE `vs_job_application` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `user_id` int NOT NULL,
  `application_status` enum('DRAFT','APPLIED','UNDER_REVIEW','SHORTLISTED','INTERVIEW_SCHEDULED','INTERVIEW_COMPLETED','HIRED','REJECTED','WITHDRAWN','CANCELLED_CLOSED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'APPLIED',
  `cover_letter` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `expected_salary` decimal(10,2) DEFAULT NULL,
  `portfolio_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status_updated_at` datetime DEFAULT NULL,
  `resume_id` int DEFAULT NULL,
  `draft_started_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `withdrawn_at` datetime DEFAULT NULL,
  `withdrawal_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `draft_version` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uq_application_job_user` (`job_id`,`user_id`),
  KEY `idx_application_user` (`user_id`),
  KEY `idx_application_status` (`application_status`),
  KEY `idx_application_resume` (`resume_id`),
  CONSTRAINT `fk_application_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_application_resume` FOREIGN KEY (`resume_id`) REFERENCES `vs_job_seeker_resumes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_application_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_application_answer
CREATE TABLE `vs_job_application_answer` (
  `answer_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `question_id` int NOT NULL,
  `answer_text` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`answer_id`),
  UNIQUE KEY `uq_application_question` (`application_id`,`question_id`),
  KEY `fk_answer_question` (`question_id`),
  CONSTRAINT `fk_answer_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_answer_question` FOREIGN KEY (`question_id`) REFERENCES `vs_job_screening_question` (`question_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_job_application_consent
CREATE TABLE `vs_job_application_consent` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `consent_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'application_acknowledgement',
  `consent_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `consent_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accepted_at` datetime NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_consent_application` (`application_id`),
  CONSTRAINT `fk_consent_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_application_idempotency
CREATE TABLE `vs_job_application_idempotency` (
  `id` int NOT NULL AUTO_INCREMENT,
  `idempotency_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `operation_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `response_payload` json NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_idempotency_key` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_application_profile_snapshot
CREATE TABLE `vs_job_application_profile_snapshot` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `snapshot_schema_version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_data` json NOT NULL,
  `captured_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_snapshot_application` (`application_id`),
  CONSTRAINT `fk_snapshot_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_application_referral
CREATE TABLE `vs_job_application_referral` (
  `application_id` int NOT NULL,
  `referral_id` int NOT NULL,
  `referrer_user_id` int NOT NULL,
  `attribution_policy_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0',
  `attributed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  KEY `idx_app_ref_referral` (`referral_id`),
  KEY `idx_app_ref_referrer` (`referrer_user_id`),
  CONSTRAINT `fk_app_ref_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_ref_referral` FOREIGN KEY (`referral_id`) REFERENCES `vs_job_referral` (`referral_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_app_ref_referrer` FOREIGN KEY (`referrer_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_application_status_history
CREATE TABLE `vs_job_application_status_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `from_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_user_id` int NOT NULL,
  `public_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_history_application` (`application_id`),
  CONSTRAINT `fk_history_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_benefits_map
CREATE TABLE `vs_job_benefits_map` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `benefit_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_job_benefit` (`job_id`,`benefit_id`),
  KEY `fk_benefits_map_benefit` (`benefit_id`),
  CONSTRAINT `fk_benefits_map_benefit` FOREIGN KEY (`benefit_id`) REFERENCES `vs_master_benefits` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_benefits_map_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_bookmark
CREATE TABLE `vs_job_bookmark` (
  `bookmark_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `user_id` int NOT NULL,
  `bookmarked_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`bookmark_id`),
  UNIQUE KEY `uq_bookmark_job_user` (`job_id`,`user_id`),
  KEY `idx_bookmark_user` (`user_id`),
  CONSTRAINT `fk_bookmark_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bookmark_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_posting
CREATE TABLE `vs_job_posting` (
  `job_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `created_by_user_id` int NOT NULL,
  `job_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_type` enum('FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','FREELANCE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `work_arrangement` enum('Remote','Hybrid','On-site') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Remote',
  `job_location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_department` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `number_of_openings` int NOT NULL DEFAULT '1',
  `job_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_responsibilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `job_qualifications` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `salary_type` enum('Salary Range','Fixed Salary','Hourly Rate') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Salary Range',
  `salary_min` decimal(12,2) DEFAULT NULL,
  `salary_max` decimal(12,2) DEFAULT NULL,
  `salary_negotiable` tinyint(1) NOT NULL DEFAULT '0',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PHP',
  `experience_level` enum('ENTRY','MID','SENIOR','MANAGER','EXECUTIVE') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `education` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  KEY `fk_job_company` (`company_id`),
  KEY `fk_job_creator` (`created_by_user_id`),
  CONSTRAINT `fk_job_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_job_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_preferences
CREATE TABLE `vs_job_preferences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `job_type` varchar(50) DEFAULT NULL,
  `work_setup` varchar(50) DEFAULT NULL,
  `preferred_location` varchar(255) DEFAULT NULL,
  `salary_range_min` decimal(12,2) DEFAULT NULL,
  `salary_range_max` decimal(12,2) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'PHP',
  `availability` varchar(50) DEFAULT NULL,
  `preferred_industry` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_job_referral
CREATE TABLE `vs_job_referral` (
  `referral_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `referrer_user_id` int NOT NULL,
  `token_hash` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_email_hash` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_hint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('CREATED','SENT','OPENED','CLAIMED','APPLIED','DECLINED','REVOKED','EXPIRED','INVALIDATED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CREATED',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`referral_id`),
  UNIQUE KEY `uq_referral_token` (`token_hash`),
  KEY `idx_referral_job` (`job_id`),
  KEY `idx_referral_referrer` (`referrer_user_id`),
  CONSTRAINT `fk_referral_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_referral_referrer` FOREIGN KEY (`referrer_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_referral_claim
CREATE TABLE `vs_job_referral_claim` (
  `claim_id` int NOT NULL AUTO_INCREMENT,
  `referral_id` int NOT NULL,
  `candidate_user_id` int NOT NULL,
  `job_id` int NOT NULL,
  `consent_version` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `consented_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `declined_at` datetime DEFAULT NULL,
  `claim_status` enum('ACTIVE','DECLINED','EXPIRED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`claim_id`),
  UNIQUE KEY `uq_claim_candidate_job` (`candidate_user_id`,`job_id`),
  KEY `idx_claim_referral` (`referral_id`),
  KEY `fk_claim_job` (`job_id`),
  CONSTRAINT `fk_claim_candidate` FOREIGN KEY (`candidate_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_claim_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_claim_referral` FOREIGN KEY (`referral_id`) REFERENCES `vs_job_referral` (`referral_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_referral_history
CREATE TABLE `vs_job_referral_history` (
  `history_id` int NOT NULL AUTO_INCREMENT,
  `referral_id` int NOT NULL,
  `from_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason_category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `occurred_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_history_referral` (`referral_id`),
  CONSTRAINT `fk_history_referral` FOREIGN KEY (`referral_id`) REFERENCES `vs_job_referral` (`referral_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_screening_question
CREATE TABLE `vs_job_screening_question` (
  `question_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `question_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`question_id`),
  KEY `fk_question_job` (`job_id`),
  CONSTRAINT `fk_question_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_seeker_profile
CREATE TABLE `vs_job_seeker_profile` (
  `profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `profile_headline` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `professional_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `profile_visibility` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Public',
  `expected_salary` decimal(10,2) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `profile_completion_percent` int NOT NULL DEFAULT '0',
  `profile_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'not_started',
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `uq_vs_profile_user_id` (`user_id`),
  CONSTRAINT `vs_job_seeker_profile_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_seeker_resumes
CREATE TABLE `vs_job_seeker_resumes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vs_resume_user_id` (`user_id`),
  CONSTRAINT `fk_vs_resume_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_skills_map
CREATE TABLE `vs_job_skills_map` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `source` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'MANUAL',
  `confidence_score` float(10,5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_job_skill` (`job_id`,`skill_id`),
  KEY `fk_skills_map_skill` (`skill_id`),
  CONSTRAINT `fk_skills_map_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skills_map_skill` FOREIGN KEY (`skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_job_title_skill_templates
CREATE TABLE `vs_job_title_skill_templates` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `job_title` varchar(255) DEFAULT NULL,
  `skill_id` int DEFAULT NULL,
  `weight` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=168 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_master_benefits
CREATE TABLE `vs_master_benefits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `benefit_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_benefit_name` (`benefit_name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_master_skills
CREATE TABLE `vs_master_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `skill_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vs_skill_name` (`skill_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8897 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_message
CREATE TABLE `vs_message` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_type` enum('TEXT','IMAGE','FILE','SYSTEM') NOT NULL DEFAULT 'TEXT',
  `message_content` text,
  `is_edited` tinyint(1) DEFAULT '0',
  `edited_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` int DEFAULT NULL,
  PRIMARY KEY (`message_id`),
  KEY `conversation_id` (`conversation_id`),
  KEY `sender_id` (`sender_id`),
  CONSTRAINT `vs_message_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `vs_conversation` (`conversation_id`),
  CONSTRAINT `vs_message_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `vs_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=198 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_message_attachment
CREATE TABLE `vs_message_attachment` (
  `attachment_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` text NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `message_id` (`message_id`),
  CONSTRAINT `vs_message_attachment_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `vs_message` (`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_message_read
CREATE TABLE `vs_message_read` (
  `read_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` datetime NOT NULL,
  PRIMARY KEY (`read_id`),
  UNIQUE KEY `uq_message_user` (`message_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `vs_message_read_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `vs_message` (`message_id`),
  CONSTRAINT `vs_message_read_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=192 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_notification_delivery
CREATE TABLE `vs_notification_delivery` (
  `delivery_id` int NOT NULL AUTO_INCREMENT,
  `notification_id` int NOT NULL,
  `channel` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_error` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `retry_count` int DEFAULT '0',
  `sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`delivery_id`),
  KEY `idx_vs_notification_delivery_status` (`status`,`retry_count`),
  KEY `fk_vs_notification_delivery_notification` (`notification_id`),
  CONSTRAINT `fk_vs_notification_delivery_notification` FOREIGN KEY (`notification_id`) REFERENCES `vs_freelancer_notification` (`notification_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_notification_event
CREATE TABLE `vs_notification_event` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `event_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_user_id` int NOT NULL,
  `entity_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`),
  KEY `idx_vs_notification_event_recipient` (`recipient_user_id`),
  KEY `idx_vs_notification_event_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_notification_preference
CREATE TABLE `vs_notification_preference` (
  `preference_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `category` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_enabled` tinyint(1) DEFAULT '1',
  `in_app_enabled` tinyint(1) DEFAULT '1',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `quiet_hours_start` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HH:MM format, e.g. 22:00',
  `quiet_hours_end` varchar(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HH:MM format, e.g. 07:00',
  `timezone` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IANA timezone, e.g. Asia/Manila',
  PRIMARY KEY (`preference_id`),
  UNIQUE KEY `uq_vs_user_category` (`user_id`,`category`),
  KEY `idx_vs_notification_preference_user` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_organization_type
CREATE TABLE `vs_organization_type` (
  `organization_type_id` int NOT NULL AUTO_INCREMENT,
  `organization_type_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`organization_type_id`),
  UNIQUE KEY `uk_organization_type_name` (`organization_type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_profile_view
CREATE TABLE `vs_profile_view` (
  `view_id` int NOT NULL AUTO_INCREMENT,
  `viewed_user_id` int NOT NULL,
  `viewer_user_id` int NOT NULL,
  `viewed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`view_id`),
  KEY `idx_vs_profile_view_viewed_user` (`viewed_user_id`),
  KEY `idx_vs_profile_view_viewer` (`viewer_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_referral_policy
CREATE TABLE `vs_referral_policy` (
  `policy_id` int NOT NULL AUTO_INCREMENT,
  `job_id` int DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `expiry_days` int NOT NULL DEFAULT '30',
  `limit_per_user` int NOT NULL DEFAULT '10',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`policy_id`),
  UNIQUE KEY `uq_policy_job` (`job_id`),
  CONSTRAINT `fk_policy_job` FOREIGN KEY (`job_id`) REFERENCES `vs_job_posting` (`job_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_roles
CREATE TABLE `vs_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_saved_applicant
CREATE TABLE `vs_saved_applicant` (
  `saved_applicant_id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `applicant_user_id` int NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`saved_applicant_id`),
  UNIQUE KEY `uq_company_applicant` (`company_id`,`applicant_user_id`),
  KEY `idx_company` (`company_id`),
  KEY `idx_applicant` (`applicant_user_id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_saved_applicant_company` FOREIGN KEY (`company_id`) REFERENCES `vs_company` (`company_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_saved_applicant_created_by` FOREIGN KEY (`created_by`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_saved_applicant_user` FOREIGN KEY (`applicant_user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_school
CREATE TABLE `vs_school` (
  `school_id` int NOT NULL AUTO_INCREMENT,
  `school_name` varchar(255) NOT NULL,
  `school_type` enum('University','College','Technical/Vocational','Other') NOT NULL,
  `school_logo_url` varchar(500) DEFAULT NULL,
  `school_description` text,
  `school_email` varchar(255) DEFAULT NULL,
  `school_contact_no` varchar(50) DEFAULT NULL,
  `school_website` varchar(500) DEFAULT NULL,
  `address_line` varchar(500) DEFAULT NULL,
  `barangay` varchar(255) DEFAULT NULL,
  `city_municipality` varchar(255) NOT NULL,
  `province` varchar(255) NOT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'Philippines',
  `school_status` varchar(20) NOT NULL DEFAULT 'Draft',
  `profile_completion_percent` int NOT NULL DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`school_id`),
  UNIQUE KEY `unq_school_name_city` (`school_name`,`city_municipality`),
  KEY `idx_school_status_name` (`school_status`,`school_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_school_admin
CREATE TABLE `vs_school_admin` (
  `school_admin_id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `user_id` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `assigned_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`school_admin_id`),
  UNIQUE KEY `unq_school_user` (`school_id`,`user_id`),
  KEY `idx_sa_user` (`user_id`),
  KEY `fk_sa_assigned` (`assigned_by`),
  CONSTRAINT `fk_sa_assigned` FOREIGN KEY (`assigned_by`) REFERENCES `vs_user` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sa_school` FOREIGN KEY (`school_id`) REFERENCES `vs_school` (`school_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sa_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_school_course
CREATE TABLE `vs_school_course` (
  `school_course_id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `course_name` varchar(255) NOT NULL,
  `course_code` varchar(50) DEFAULT NULL,
  `course_status` enum('Active','Inactive') NOT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`school_course_id`),
  UNIQUE KEY `unq_school_course` (`school_id`,`course_name`),
  KEY `idx_school_course_status` (`school_id`,`course_status`,`course_name`),
  CONSTRAINT `vs_school_course_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `vs_school` (`school_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_school_request
CREATE TABLE `vs_school_request` (
  `school_request_id` int NOT NULL AUTO_INCREMENT,
  `requested_by` int NOT NULL,
  `requested_school_name` varchar(255) NOT NULL,
  `city_municipality` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `request_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `matched_school_id` int DEFAULT NULL,
  `admin_remarks` varchar(500) DEFAULT NULL,
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`school_request_id`),
  KEY `matched_school_id` (`matched_school_id`),
  KEY `idx_vs_school_req_user` (`requested_by`),
  CONSTRAINT `fk_vs_school_req_user` FOREIGN KEY (`requested_by`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `vs_school_request_ibfk_1` FOREIGN KEY (`matched_school_id`) REFERENCES `vs_school` (`school_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_skill_category
CREATE TABLE `vs_skill_category` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_skill_category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_skill_category_map
CREATE TABLE `vs_skill_category_map` (
  `id` int NOT NULL AUTO_INCREMENT,
  `skill_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skill_category` (`skill_id`,`category_id`),
  KEY `fk_skill_cat_category` (`category_id`),
  CONSTRAINT `fk_skill_cat_category` FOREIGN KEY (`category_id`) REFERENCES `vs_skill_category` (`category_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_cat_skill` FOREIGN KEY (`skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=128 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_skill_hierarchy
CREATE TABLE `vs_skill_hierarchy` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_skill_id` int NOT NULL,
  `child_skill_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skill_hierarchy` (`parent_skill_id`,`child_skill_id`),
  KEY `fk_skill_hier_child` (`child_skill_id`),
  CONSTRAINT `fk_skill_hier_child` FOREIGN KEY (`child_skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_hier_parent` FOREIGN KEY (`parent_skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_skill_keyword_mapping
CREATE TABLE `vs_skill_keyword_mapping` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `keyword` varchar(255) DEFAULT NULL,
  `skill_id` int DEFAULT NULL,
  `weight` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=153 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_skill_relation
CREATE TABLE `vs_skill_relation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `skill_id` int NOT NULL,
  `related_skill_id` int NOT NULL,
  `similarity_score` decimal(3,2) NOT NULL DEFAULT '0.70',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_skill_relation` (`skill_id`,`related_skill_id`),
  KEY `fk_skill_rel_related` (`related_skill_id`),
  CONSTRAINT `fk_skill_rel_related` FOREIGN KEY (`related_skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_skill_rel_skill` FOREIGN KEY (`skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_system_message
CREATE TABLE `vs_system_message` (
  `system_message_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `event_type` enum('APPLICATION_SUBMITTED','APPLICATION_STATUS_CHANGED','INTERVIEW_SCHEDULED','INTERVIEW_UPDATED','HIRED') NOT NULL,
  `application_id` int DEFAULT NULL,
  `interview_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`system_message_id`),
  UNIQUE KEY `uq_message_id` (`message_id`),
  KEY `idx_application_id` (`application_id`),
  CONSTRAINT `fk_system_message_application` FOREIGN KEY (`application_id`) REFERENCES `vs_job_application` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_system_message_message` FOREIGN KEY (`message_id`) REFERENCES `vs_message` (`message_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- TABLE: vs_user
CREATE TABLE `vs_user` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_fname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `user_mname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_lname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `profile_image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `suffix_name` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nickname` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `role` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USER',
  `role_id` int DEFAULT NULL,
  `hash_password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `failed_attempts` int DEFAULT '0',
  `lock_until` datetime DEFAULT NULL,
  `is_blocked` tinyint(1) DEFAULT '0',
  `force_password_reset` tinyint(1) DEFAULT '0',
  `reset_token_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `otp_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp_expiry` datetime DEFAULT NULL,
  `otp_verified` tinyint(1) DEFAULT '0',
  `otp_sent_at` datetime DEFAULT NULL,
  `otp_session_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_province` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_city` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_brgy` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_department` int DEFAULT NULL,
  `user_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `employment_status_id` int DEFAULT NULL,
  `user_dateOfHire` date DEFAULT NULL,
  `user_tags` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `profile_completion_percent` int DEFAULT '0',
  `user_bday` date DEFAULT NULL,
  `gender` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `civil_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nationality` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `citizenship` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_of_birth` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `blood_type` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `religion` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `spouse_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_sss` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_philhealth` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_tin` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `user_pagibig` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_image` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `signature` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `emergency_contact_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `terms_accepted_at` datetime DEFAULT NULL,
  `privacy_accepted_at` datetime DEFAULT NULL,
  `otp_verified_at` datetime DEFAULT NULL,
  `registration_source` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` bit(1) DEFAULT NULL,
  `external_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `update_at` datetime(6) DEFAULT NULL,
  `isAdmin` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `status_version` int NOT NULL DEFAULT '1',
  `session_epoch` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_vs_user_email` (`user_email`),
  KEY `idx_vs_user_role_id` (`role_id`),
  KEY `idx_vs_user_department` (`user_department`),
  KEY `idx_vs_user_employment_status` (`employment_status_id`),
  KEY `idx_vs_user_status` (`status`),
  CONSTRAINT `fk_vs_user_employment_status` FOREIGN KEY (`employment_status_id`) REFERENCES `vs_employment_status` (`id`),
  CONSTRAINT `fk_vs_user_roles` FOREIGN KEY (`role_id`) REFERENCES `vs_roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=127 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_user_skills_map
CREATE TABLE `vs_user_skills_map` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_skill_unique` (`user_id`,`skill_id`),
  KEY `idx_vs_skill_map_skill_id` (`skill_id`),
  CONSTRAINT `fk_vs_skill_map_skill` FOREIGN KEY (`skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vs_skill_map_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_user_social_links
CREATE TABLE `vs_user_social_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `platform_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vs_social_user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_work_experience
CREATE TABLE `vs_work_experience` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `company_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `job_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `employment_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_current_role` tinyint(1) DEFAULT '0',
  `job_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `discovery_source` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vs_work_user_id` (`user_id`),
  CONSTRAINT `fk_vs_work_user` FOREIGN KEY (`user_id`) REFERENCES `vs_user` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_work_experience_media
CREATE TABLE `vs_work_experience_media` (
  `id` int NOT NULL AUTO_INCREMENT,
  `experience_id` int NOT NULL,
  `media_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `media_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_vs_work_media_exp_id` (`experience_id`),
  CONSTRAINT `fk_vs_work_media_exp` FOREIGN KEY (`experience_id`) REFERENCES `vs_work_experience` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- TABLE: vs_work_experience_skills
CREATE TABLE `vs_work_experience_skills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `experience_id` int NOT NULL,
  `skill_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vs_work_exp_skill` (`experience_id`,`skill_id`),
  KEY `idx_vs_work_skill_id` (`skill_id`),
  CONSTRAINT `fk_vs_work_skill_exp` FOREIGN KEY (`experience_id`) REFERENCES `vs_work_experience` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vs_work_skill_master` FOREIGN KEY (`skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
