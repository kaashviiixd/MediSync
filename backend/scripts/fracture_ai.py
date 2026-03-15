import os
import sys
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        return

    img_path = sys.argv[1]
    
    # Check if testing mode
    if img_path == "--test":
        print(json.dumps({"status": "ready", "message": "Fracture AI script is functional"}))
        return

    try:
        import tensorflow as tf
        from tensorflow.keras.preprocessing import image
        import numpy as np

        model_path = os.path.join(os.path.dirname(__file__), "..", "models", "xray_model.h5")
        
        if not os.path.exists(model_path):
            print(json.dumps({
                "error": "Model file not found",
                "path": model_path,
                "hint": "Please place your xray_model.h5 in the backend/models directory"
            }))
            return

        # Load model (Suppressing TF logs)
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
        model = tf.keras.models.load_model(model_path)

        # Process image
        img = image.load_img(img_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0

        # Predict
        prediction = model.predict(img_array, verbose=0)
        
        # Format result
        # Assuming binary classification: 0 = No Fracture, 1 = Fracture
        # Or multi-class. We return the raw list for mapping in JS.
        result = {
            "prediction": prediction.tolist(),
            "detected": bool(prediction[0][0] > 0.5) if prediction.shape[1] == 1 else None,
            "confidence": float(prediction[0][0])
        }
        
        print(json.dumps(result))

    except ImportError:
        print(json.dumps({"error": "TensorFlow not installed in Python environment"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
