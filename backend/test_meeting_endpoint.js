import axios from 'axios';

const testMeetingStart = async () => {
  try {
    const doctorId = '68b9cad-0e1f-4b1a-9c1a-2b3c4d5e6f7a'; // Probable doctor ID from previous context
    const patientId = 'a3b8d1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f'; // Probable patient ID
    const appointmentId = 'some-real-id'; // We need to find a real appointment ID

    console.log("MediSync: Attempting to find a real appointment to test...");
    
    // In a real scenario, we'd fetch this from the DB first in this script
    // But let's just try to hit the endpoint and see if it even reaches the try/catch
    
    const response = await axios.post('http://localhost:5000/api/meetings/start', {
      patientId: 'test-patient',
      doctorId: 'test-doctor',
      appointmentId: 'test-app'
    });

    console.log("Response:", response.data);
  } catch (err) {
    console.error("Error Status:", err.response?.status);
    console.error("Error Data:", err.response?.data);
    console.log("Full Error Message:", err.message);
  }
};

testMeetingStart();
