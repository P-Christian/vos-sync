-- VOS Sync Role Taxonomy & DB-Backed Matching Engine Schema
-- Migration script for vs_role_category, vs_role_title, vs_role_title_alias, vs_role_skill_mapping

-- 1. TABLE: vs_role_category
CREATE TABLE IF NOT EXISTS `vs_role_category` (
  `category_id` INT NOT NULL AUTO_INCREMENT,
  `category_code` VARCHAR(50) NOT NULL UNIQUE,
  `category_name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLE: vs_role_title (Canonical Job Roles)
CREATE TABLE IF NOT EXISTS `vs_role_title` (
  `role_id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `role_name` VARCHAR(150) NOT NULL,
  `experience_level` ENUM('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE') DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_vs_role_title_name_category` (`category_id`, `role_name`),
  KEY `idx_vs_role_title_category` (`category_id`),
  CONSTRAINT `fk_vs_role_title_category` FOREIGN KEY (`category_id`) REFERENCES `vs_role_category` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLE: vs_role_title_alias (Title Synonyms & Keywords)
CREATE TABLE IF NOT EXISTS `vs_role_title_alias` (
  `alias_id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `alias_name` VARCHAR(150) NOT NULL,
  `normalized_alias` VARCHAR(150) NOT NULL,
  `match_weight` DECIMAL(3,2) NOT NULL DEFAULT '1.00',
  `is_primary` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alias_id`),
  UNIQUE KEY `uq_vs_role_alias_name` (`normalized_alias`),
  KEY `idx_vs_alias_role_id` (`role_id`),
  CONSTRAINT `fk_vs_alias_role` FOREIGN KEY (`role_id`) REFERENCES `vs_role_title` (`role_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLE: vs_role_skill_mapping (Core Skills Linked to vs_master_skills)
CREATE TABLE IF NOT EXISTS `vs_role_skill_mapping` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `skill_id` INT NOT NULL,
  `importance_weight` DECIMAL(3,2) NOT NULL DEFAULT '1.00',
  `is_required` TINYINT(1) NOT NULL DEFAULT '0',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_vs_rsm_unique` (`role_id`, `skill_id`),
  KEY `idx_vs_rsm_role_id` (`role_id`),
  KEY `idx_vs_rsm_skill_id` (`skill_id`),
  CONSTRAINT `fk_vs_rsm_role` FOREIGN KEY (`role_id`) REFERENCES `vs_role_title` (`role_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_vs_rsm_skill` FOREIGN KEY (`skill_id`) REFERENCES `vs_master_skills` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- INITIAL SEED DATA
-- ========================================================

-- Categories
INSERT INTO `vs_role_category` (`category_id`, `category_code`, `category_name`, `description`) VALUES 
(1, 'marketing', 'Digital Marketing & Social Media', 'Social media, content creation, brand strategy, and SEO'),
(2, 'frontend', 'Frontend Software Engineering', 'UI, web interfaces, web apps, React, Vue, Angular'),
(3, 'backend', 'Backend Software Engineering', 'API services, microservices, databases, server logic'),
(4, 'fullstack', 'Full Stack Software Engineering', 'End-to-end web applications, frontend and backend systems'),
(5, 'mobile', 'Mobile App Development', 'iOS, Android, React Native, Flutter'),
(6, 'devops', 'DevOps & Cloud Infrastructure', 'AWS, Azure, Kubernetes, CI/CD pipelines, SRE'),
(7, 'data', 'Data Engineering & Analytics', 'ETL, SQL, Data Warehousing, Data Science, AI'),
(8, 'qa', 'Quality Assurance & Software Testing', 'Automated testing, manual QA, test planning'),
(9, 'design', 'UI/UX & Product Design', 'User interface design, wireframing, Figma, user research')
ON DUPLICATE KEY UPDATE `category_name` = VALUES(`category_name`);

-- Canonical Job Roles
INSERT INTO `vs_role_title` (`role_id`, `category_id`, `role_name`, `experience_level`) VALUES
(1, 1, 'Social Media Specialist', 'MID'),
(2, 1, 'Content Strategist', 'MID'),
(3, 1, 'Digital Marketer', 'MID'),
(4, 2, 'Frontend Developer', 'MID'),
(5, 3, 'Backend Developer', 'MID'),
(6, 4, 'Full Stack Developer', 'SENIOR'),
(7, 5, 'Mobile Developer', 'MID'),
(8, 6, 'DevOps Engineer', 'SENIOR'),
(9, 7, 'Data Engineer', 'MID'),
(10, 8, 'QA Automation Engineer', 'MID'),
(11, 9, 'UI/UX Designer', 'MID')
ON DUPLICATE KEY UPDATE `role_name` = VALUES(`role_name`);

-- Title Aliases & Keywords Mapping
INSERT INTO `vs_role_title_alias` (`role_id`, `alias_name`, `normalized_alias`, `match_weight`, `is_primary`) VALUES
-- Marketing & Social Media Aliases
(1, 'Social Media Specialist', 'social media specialist', 1.00, 1),
(1, 'Social Media Creator', 'social media creator', 0.95, 0),
(1, 'Social Media Strategist', 'social media strategist', 0.95, 0),
(1, 'Freelance Social Media Strategist', 'freelance social media strategist', 0.90, 0),
(1, 'Social Media Manager', 'social media manager', 0.90, 0),
(1, 'Social Media Executive', 'social media executive', 0.85, 0),
(2, 'Content Creator', 'content creator', 1.00, 1),
(2, 'Content Strategist', 'content strategist', 0.95, 0),
(2, 'Copywriter', 'copywriter', 0.85, 0),
(3, 'Digital Marketer', 'digital marketer', 1.00, 1),
(3, 'SEO Specialist', 'seo specialist', 0.85, 0),
(3, 'Growth Marketer', 'growth marketer', 0.85, 0),

-- Frontend Engineering Aliases
(4, 'Frontend Developer', 'frontend developer', 1.00, 1),
(4, 'Frontend Engineer', 'frontend engineer', 1.00, 0),
(4, 'React Developer', 'react developer', 0.95, 0),
(4, 'Vue Developer', 'vue developer', 0.95, 0),
(4, 'Angular Developer', 'angular developer', 0.95, 0),
(4, 'UI Engineer', 'ui engineer', 0.90, 0),
(4, 'Web Developer', 'web developer', 0.80, 0),
(4, 'Front-End Developer', 'front-end developer', 1.00, 0),
(4, 'JavaScript Developer', 'javascript developer', 0.85, 0),

-- Backend Engineering Aliases
(5, 'Backend Developer', 'backend developer', 1.00, 1),
(5, 'Backend Engineer', 'backend engineer', 1.00, 0),
(5, 'API Developer', 'api developer', 0.90, 0),
(5, 'Python Developer', 'python developer', 0.90, 0),
(5, 'Java Developer', 'java developer', 0.90, 0),
(5, 'Node.js Developer', 'nodejs developer', 0.90, 0),
(5, 'Node Developer', 'node developer', 0.90, 0),
(5, 'Golang Developer', 'golang developer', 0.90, 0),
(5, 'PHP Developer', 'php developer', 0.85, 0),
(5, 'Software Engineer', 'software engineer', 0.80, 0),

-- Full Stack Aliases
(6, 'Full Stack Developer', 'full stack developer', 1.00, 1),
(6, 'Full Stack Engineer', 'full stack engineer', 1.00, 0),
(6, 'Fullstack Developer', 'fullstack developer', 1.00, 0),
(6, 'Fullstack Engineer', 'fullstack engineer', 1.00, 0),

-- Mobile Aliases
(7, 'Mobile Developer', 'mobile developer', 1.00, 1),
(7, 'Mobile Engineer', 'mobile engineer', 1.00, 0),
(7, 'iOS Developer', 'ios developer', 0.95, 0),
(7, 'Android Developer', 'android developer', 0.95, 0),
(7, 'React Native Developer', 'react native developer', 0.95, 0),
(7, 'Flutter Developer', 'flutter developer', 0.95, 0),

-- DevOps Aliases
(8, 'DevOps Engineer', 'devops engineer', 1.00, 1),
(8, 'Cloud Engineer', 'cloud engineer', 0.90, 0),
(8, 'Site Reliability Engineer', 'site reliability engineer', 0.90, 0),
(8, 'SRE', 'sre', 0.90, 0),
(8, 'Infrastructure Engineer', 'infrastructure engineer', 0.85, 0),

-- Data Aliases
(9, 'Data Engineer', 'data engineer', 1.00, 1),
(9, 'Data Scientist', 'data scientist', 0.90, 0),
(9, 'Data Analyst', 'data analyst', 0.85, 0),
(9, 'Machine Learning Engineer', 'machine learning engineer', 0.90, 0),
(9, 'AI Engineer', 'ai engineer', 0.90, 0),

-- QA Aliases
(10, 'QA Automation Engineer', 'qa automation engineer', 1.00, 1),
(10, 'QA Engineer', 'qa engineer', 0.95, 0),
(10, 'Quality Assurance Engineer', 'quality assurance engineer', 0.95, 0),
(10, 'Software Tester', 'software tester', 0.85, 0),

-- Design Aliases
(11, 'UI/UX Designer', 'ui/ux designer', 1.00, 1),
(11, 'UI Designer', 'ui designer', 0.95, 0),
(11, 'UX Designer', 'ux designer', 0.95, 0),
(11, 'Product Designer', 'product designer', 0.90, 0)
ON DUPLICATE KEY UPDATE `match_weight` = VALUES(`match_weight`);
