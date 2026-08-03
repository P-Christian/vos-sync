// src/lib/skill-matcher/dictionary.ts
import { SkillIntelligenceDictionary } from "./types";

/**
 * Normalized skill helper: converts strings to trimmed lowercase canonical representation
 */
export function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Built-in default dictionary for offline rule-based skill matching
 */
export const DEFAULT_SKILL_DICTIONARY: SkillIntelligenceDictionary = {
  // Alias Mappings -> Normalized Canonical Skill Name
  aliases: {
    // JavaScript / Web
    js: "javascript",
    ecmascript: "javascript",
    "react.js": "react",
    reactjs: "react",
    "vue.js": "vue",
    vuejs: "vue",
    ts: "typescript",
    "node.js": "nodejs",
    node: "nodejs",
    "next.js": "nextjs",
    next: "nextjs",

    // Databases
    postgres: "postgresql",
    pgsql: "postgresql",
    mongo: "mongodb",
    mongo_db: "mongodb",

    // AI & Computer Vision & ML
    py: "python",
    "python 3": "python",
    torch: "pytorch",
    tf: "tensorflow",
    cv: "computer vision",
    "image processing": "computer vision",
    "object detection": "computer vision",
    ai: "artificial intelligence",
    ml: "machine learning",

    // DevOps & Cloud
    k8s: "kubernetes",
    aws: "amazon web services",
    gcp: "google cloud platform",
  },

  // Categories per skill
  categories: {
    // Frontend
    react: "frontend development",
    vue: "frontend development",
    angular: "frontend development",
    svelte: "frontend development",
    nextjs: "frontend development",
    html: "frontend development",
    css: "frontend development",
    tailwindcss: "frontend development",
    typescript: "frontend development",
    javascript: "frontend development",

    // Backend
    nodejs: "backend development",
    express: "backend development",
    nestjs: "backend development",
    django: "backend development",
    flask: "backend development",
    fastapi: "backend development",
    "spring boot": "backend development",
    laravel: "backend development",
    php: "backend development",
    python: "backend development",
    java: "backend development",
    golang: "backend development",

    // Databases
    postgresql: "database",
    mysql: "database",
    mongodb: "database",
    redis: "database",
    sqlite: "database",

    // AI / ML / CV
    pytorch: "deep learning",
    tensorflow: "deep learning",
    keras: "deep learning",
    "scikit-learn": "machine learning",
    opencv: "computer vision",
    yolo: "computer vision",
    mediapipe: "computer vision",
    "computer vision": "ai & data science",
    "deep learning": "ai & data science",
    "machine learning": "ai & data science",

    // DevOps
    docker: "devops & cloud",
    kubernetes: "devops & cloud",
    terraform: "devops & cloud",
    ansible: "devops & cloud",
    jenkins: "devops & cloud",
    "amazon web services": "devops & cloud",
    "google cloud platform": "devops & cloud",
  },

  // Explicit Skill Pair Relations with similarity scores (0.0 to 1.0)
  relations: {
    // CV & AI
    "yolo:opencv": 0.85,
    "opencv:yolo": 0.85,
    "yolo:computer vision": 0.95,
    "opencv:computer vision": 0.90,
    "pytorch:tensorflow": 0.85,
    "tensorflow:pytorch": 0.85,
    "pytorch:deep learning": 0.90,
    "tensorflow:deep learning": 0.90,
    "deep learning:machine learning": 0.85,
    "machine learning:artificial intelligence": 0.90,

    // Web Stack
    "typescript:javascript": 0.90,
    "javascript:typescript": 0.85,
    "react:nextjs": 0.90,
    "nextjs:react": 0.90,
    "react:vue": 0.65,
    "react:angular": 0.60,
    "nodejs:express": 0.90,
    "nodejs:nestjs": 0.85,

    // Databases
    "postgresql:mysql": 0.80,
    "postgresql:mongodb": 0.65,
  },

  // Tree Hierarchy: Child -> Parent
  hierarchy: {
    opencv: "computer vision",
    yolo: "computer vision",
    mediapipe: "computer vision",
    "computer vision": "artificial intelligence",
    pytorch: "deep learning",
    tensorflow: "deep learning",
    keras: "deep learning",
    "deep learning": "machine learning",
    "machine learning": "artificial intelligence",
    nextjs: "react",
    express: "nodejs",
    nestjs: "nodejs",
  },
};

/**
 * Returns the canonical normalized name for a skill if an alias exists.
 */
export function getCanonicalSkillName(
  skill: string,
  dict: SkillIntelligenceDictionary = DEFAULT_SKILL_DICTIONARY
): string {
  const norm = normalizeSkillName(skill);
  return dict.aliases[norm] || norm;
}
