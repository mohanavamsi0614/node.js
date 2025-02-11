import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    try {
      const response = await axios.post("https://node-js-5dhg.onrender.com", { url });
      const data = response.data;
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Youtube to Telugu Translation</h1>
      <form onSubmit={handleSubmit} className="form-container">
        <input 
          type="text" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Enter Youtube URL" 
          className="input-field"
        />
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Translating..." : "Translate"}
        </button>
      </form>
      <div className="result-container">
        <h2>Translation Result:</h2>
        {loading && <div className="spinner"></div>}
        <p>{result}</p>
      </div>
    </div>
  );
}

export default App;
