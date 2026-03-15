import json
import random

SYMPTOMS = {
    "Emergency": [
        "chest pain", "shortness of breath", "sudden speech difficulty", 
        "weakness in right arm", "chest pressure", "severe bleeding", 
        "loss of consciousness", "allergic swelling", "paralysis"
    ],
    "Moderate": [
        "persistent cough", "fever", "headache", "abdominal pain", 
        "persistent vomiting", "moderate dehydration", "minor injury with swelling"
    ],
    "Normal": [
        "runny nose", "sneezing", "minor cut", "mild headache", 
        "seasonal allergies", "sore throat"
    ]
}

HISTORIES = [
    "hypertension", "diabetes", "heart disease", "smoker", "asthma", 
    "stroke history", "none", "seasonal allergies"
]

REASONS = {
    "Emergency": [
        "Chest pain with potential cardiac risk",
        "Possible stroke symptoms detected",
        "Respiratory distress requires urgent evaluation",
        "Severe allergic reaction risk",
        "Signs of systemic compromise"
    ],
    "Moderate": [
        "Infection symptoms requiring monitoring",
        "Moderate pain/fever with stable vitals",
        "Localized injury with significant discomfort",
        "Symptom progression requires clinical review"
    ],
    "Normal": [
        "Minor viral symptoms",
        "Common cold or seasonal allergy",
        "Low-risk localized minor injury",
        "Stable chronic condition with minor flare-up"
    ]
}

def generate_case(case_id):
    category = random.choices(["Emergency", "Moderate", "Normal"], weights=[0.2, 0.4, 0.4])[0]
    
    age = random.randint(5, 85)
    gender = random.choice(["Male", "Female"])
    
    # Pick 1-3 symptoms
    num_symptoms = random.randint(1, 3)
    case_symptoms = random.sample(SYMPTOMS[category], min(num_symptoms, len(SYMPTOMS[category])))
    
    # Maybe add some cross-category symptoms for complexity
    if random.random() < 0.2:
        other_cat = random.choice(["Normal", "Moderate"])
        case_symptoms.append(random.choice(SYMPTOMS[other_cat]))
        
    symptoms_str = ", ".join(case_symptoms)
    
    history = random.choice(HISTORIES)
    if random.random() < 0.3:
        history += f", {random.choice(HISTORIES)}"
    
    reported_severity = random.randint(1, 10)
    
    # Adjust score based on category
    if category == "Emergency":
        triage_score = random.randint(8, 10)
    elif category == "Moderate":
        triage_score = random.randint(4, 7)
    else:
        triage_score = random.randint(1, 3)
        
    reason = random.choice(REASONS[category])
    
    risk_factors = []
    if "chest" in symptoms_str.lower() or "heart" in history.lower():
        risk_factors.append("cardiac risk")
    if age > 65:
        risk_factors.append("elderly")
    if "stroke" in history.lower() or "speech" in symptoms_str.lower():
        risk_factors.append("stroke risk")
    if "asthma" in history.lower() or "breath" in symptoms_str.lower():
        risk_factors.append("respiratory risk")

    return {
        "id": f"CASE_{case_id:03d}",
        "age": age,
        "gender": gender,
        "symptoms": symptoms_str,
        "reported_severity": reported_severity,
        "past_history": history,
        "risk_factors": risk_factors,
        "triage_score": triage_score,
        "triage_category": category,
        "reason": reason
    }

import os

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', 'data')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    output_path = os.path.join(output_dir, 'triage_dataset_expanded.json')
    
    dataset = []
    for i in range(1, 301):
        dataset.append(generate_case(i))
        
    with open(output_path, 'w') as f:
        json.dump(dataset, f, indent=2)
    
    print(f"Generated 300 cases in {output_path}")

if __name__ == "__main__":
    main()
