/**
 * MediSync Clinical Triage Engine
 * Implements hospital-grade rule-based scoring logic.
 */

const RED_FLAGS = [
  "chest pain",
  "shortness of breath",
  "breathing difficulty",
  "stroke symptoms",
  "speech difficulty",
  "paralysis",
  "loss of consciousness",
  "severe bleeding",
  "allergic swelling",
  "chest tightness",
  "chest pressure",
  "fast signs",
  "facial drooping",
  "arm weakness",
  "vision loss"
];

const HISTORY_RISK = {
  "hypertension": 2,
  "diabetes": 2,
  "heart disease": 3,
  "coronary artery disease": 3,
  "smoker": 2,
  "asthma": 1,
  "stroke history": 3,
  "immunocompromised": 2,
  "pregnancy": 2
};

/**
 * Calculates triage score and category based on symptoms, history, severity and age.
 * @param {string} symptoms 
 * @param {string} history 
 * @param {number} severity (1-10)
 * @param {number} age 
 * @returns {object} { score, category, reason }
 */
export function calculateTriage(symptoms = "", history = "", severity = 0, age = 0) {
  let score = parseInt(severity) || 0;
  let reasonParts = [];
  let matchedFlags = [];

  // 1. Red Flag Check (High Priority)
  const lowerSymptoms = symptoms.toLowerCase();
  for (const flag of RED_FLAGS) {
    if (lowerSymptoms.includes(flag)) {
      score += 5; // Significant boost for red flags
      matchedFlags.push(flag);
    }
  }

  if (matchedFlags.length > 0) {
    reasonParts.push(`Critical symptoms identified: ${matchedFlags.join(", ")}.`);
  }

  // 2. History Risk
  const lowerHistory = history.toLowerCase();
  let matchedHistory = [];
  for (const condition in HISTORY_RISK) {
    if (lowerHistory.includes(condition)) {
      score += HISTORY_RISK[condition];
      matchedHistory.push(condition);
    }
  }

  if (matchedHistory.length > 0) {
    reasonParts.push(`Patient history includes high-risk factors: ${matchedHistory.join(", ")}.`);
  }

  // 3. Age Risk
  if (age > 65) {
    score += 2;
    reasonParts.push("Age > 65 increases clinical risk.");
  } else if (age < 5) {
    score += 1;
    reasonParts.push("Pediatric age requires closer monitoring.");
  }

  // 4. Synergistic Risks (e.g., Chest Pain + Smoker)
  if (matchedFlags.some(f => f.includes("chest")) && matchedHistory.includes("smoker")) {
    score += 2;
    reasonParts.push("Synergistic risk: Chest symptoms in a smoker.");
  }
  if (matchedFlags.some(f => f.includes("breath")) && matchedHistory.includes("asthma")) {
    score += 2;
    reasonParts.push("Synergistic risk: Breathing difficulty with asthma history.");
  }

  // Cap score at 10
  score = Math.min(score, 10);

  // Classification
  let category = "Normal";
  if (score >= 8) {
    category = "Emergency";
  } else if (score >= 4) {
    category = "Moderate";
  }

  // MUST override classification if ANY red flags are present
  if (matchedFlags.length > 0) {
    category = "Emergency";
    score = Math.max(score, 8);
    // Don't add a new reason if we already mentioned critical symptoms above,
    // but the system will now enforce Emergency for them.
  }
  
  // Specific override for critical combos
  if (matchedFlags.some(f => f.includes("chest") || f.includes("breath")) && (matchedHistory.length > 0 || age > 60)) {
    category = "Emergency";
    score = Math.max(score, 9);
  }

  return {
    score,
    category,
    reason: reasonParts.join(" ")
  };
}
