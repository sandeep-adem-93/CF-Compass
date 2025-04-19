const fetchPatients = async () => {
  try {
    const baseUrl = (process.env.REACT_APP_API_URL || 'https://cf-compass.onrender.com').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/api/patients`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch patients');
    }
    const data = await response.json();
    setPatients(data);
  } catch (error) {
    console.error('Error fetching patients:', error);
    setPatients([]);
  }
}; 