const fetchPatients = async () => {
  try {
    const baseUrl = process.env.REACT_APP_API_URL?.replace(/\/+$/, '') || 'https://cf-compass.onrender.com';
    const response = await fetch(`${baseUrl}/api/patients`);
    const data = await response.json();
    setPatients(data);
  } catch (error) {
    console.error('Error fetching patients:', error);
  }
}; 