import re
import os

filepath = r'c:\Users\mw989\Downloads\MediSync\backend\server.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find the current image handling block
pattern = r'\} else if \(file\.mimetype\.startsWith\(\'image/\'\)\) \{\s+try \{\s+console\.log\("MediSync: Image detected\. Starting Multi-Modal Analysis\.\.\."\);\s+const result = await Tesseract\.recognize\(\s+fileBuffer,\s+\'eng\',\s+\{ logger: m => console\.log\("OCR:", m\.status, \(m\.progress \* 100\)\.toFixed\(0\) \+ "%"\) \}\s+\);\s+documentText = result\.data\.text;\s+console\.log\("MediSync: OCR Complete\."\);\s+\} catch \(ocrErr\) \{\s+console\.error\("MediSync: OCR Failed:", ocrErr\);\s+documentText = "Document could not be parsed: OCR failed\.";\s+\}\s+\}'

replacement = """} else if (file.mimetype.startsWith('image/')) {
        try {
          console.log("MediSync: Image detected. Starting Multi-Modal Analysis (OCR + Vision)...");
          
          // 1. Run OCR
          const ocrResult = await Tesseract.recognize(fileBuffer, 'eng');
          const ocrText = ocrResult.data.text;

          // 2. Run Gemini Vision
          const visionPrompt = `You are a clinical vision assistant. 
          Analyze this medical image (potential X-ray, MRI, or lab report).
          1. Identify what type of image it is.
          2. Describe the key visual clinical findings.
          3. If it's a report, summarize the findings.
          4. Combine with this OCR text if relevant: ${ocrText}
          Provide a concise clinical summary for a triage doctor.`;

          const result = await visionModel.generateContent([
            visionPrompt,
            {
              inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: file.mimetype
              }
            }
          ]);
          
          documentText = result.response.text();
          console.log("MediSync: Vision Analysis Complete.");
        } catch (err) {
          console.error("MediSync: Vision/OCR Failed:", err);
          documentText = "Document could not be parsed: Visual analysis failed.";
        }
    }"""

new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

if new_content == content:
    print("FAILED: Pattern not found!")
    # Fallback: try a simpler pattern
    simple_pattern = r'console\.log\("MediSync: Image detected\. Starting Multi-Modal Analysis\.\.\."\);.*?\} catch \(ocrErr\) \{.*?\}'
    new_content = re.sub(simple_pattern, replacement.split('try {')[1].split('} catch')[0], content, flags=re.MULTILINE | re.DOTALL)
    if new_content == content:
        print("CRITICAL FAILED: Even simple pattern failed!")
    else:
        print("SUCCESS: Simple pattern worked!")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
else:
    print("SUCCESS: Main pattern worked!")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
