import { useState } from 'react';
import './App.css';

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);  // Start loading
    try {
      const response = await fetch("http://localhost:5000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });
      const data = await response.text();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Youtube to Telugu Translation</h1>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Enter Youtube URL" 
        />
        <button type="submit" disabled={loading}>Translate</button>
      </form>
      <div>
        <h2>Translation Result:</h2>
      {loading && <div className="spinner"></div>}
        <p>{result}</p>
      </div>
    </div>
  );
}

export default App;
