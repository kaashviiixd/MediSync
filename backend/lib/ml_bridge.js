import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the fracture AI Python script
 * @param {string} imagePath - Absolute path to the X-ray image
 * @returns {Promise<Object>} - Prediction result
 */
export const runFractureInference = (imagePath) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', 'scripts', 'fracture_ai.py');
        
        console.log(`MediSync: Executing Python bridge at ${scriptPath}`);
        
        const pythonProcess = spawn('python', [scriptPath, imagePath]);
        
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`MediSync: Python script exited with code ${code}. Error: ${errorOutput}`);
                return resolve({ error: 'Inference script failed', details: errorOutput });
            }

            try {
                const result = JSON.parse(output.trim());
                resolve(result);
            } catch (e) {
                console.error('MediSync: Failed to parse Python output:', output);
                resolve({ error: 'Invalid JSON from inference script', raw: output });
            }
        });
    });
};
