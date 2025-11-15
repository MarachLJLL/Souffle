import { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://127.0.0.1:5000';

// A component for displaying a single job
const JobCard = ({ job }) => {
  const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleString();

  return (
    <div className={`job-card status-${job.status.toLowerCase()}`}>
      <div className="job-header">
        <h3>Model #{job.local_id}</h3>
        <span className="job-status">{job.status}</span>
      </div>
      <div className="job-body">
        {job.prompt && <p><strong>Prompt:</strong> {job.prompt}</p>}
        <p><strong>Created:</strong> {formatDate(job.created_at)}</p>
        
        {job.status === 'PENDING' && (
          <div className="progress-bar">
            <div className="progress-bar-inner" style={{ width: `${job.progress || 0}%` }}>
              {job.progress || 0}%
            </div>
          </div>
        )}

        {job.status === 'READY' && (
          <a href={`${API_URL}/download/${job.local_id}`} className="download-button">
            Download .glb
          </a>
        )}
        
        {job.status === 'FAILED' && (
          <p className="error-text"><strong>Error:</strong> {job.error_message}</p>
        )}
      </div>
    </div>
  );
};

// Main App component
function App() {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/jobs`);
      if (!response.ok) throw new Error('Failed to fetch jobs.');
      const data = await response.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs(); // Fetch jobs on initial load
    const interval = setInterval(fetchJobs, 5000); // Poll for job updates every 5 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (files.length === 0 && prompt.trim() === '') {
      setError('Please provide either images or a text prompt.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('prompt', prompt);

    try {
      // Note the endpoint is now /create-job
      const response = await fetch(`${API_URL}/create-job`, { method: 'POST', body: formData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit job.');
      }
      
      // Reset form and immediately fetch jobs to show the new pending job
      setPrompt('');
      setFiles([]);
      document.getElementById('images').value = ''; // Clear file input
      fetchJobs();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>Create New 3D Model</h1>
        <form onSubmit={handleSubmit}>
            <div className="form-group">
            <label htmlFor="images">Select Images (Optional):</label>
            <input type="file" id="images" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files))} disabled={isSubmitting} />
            </div>
            <div className="form-group">
            <label htmlFor="prompt">Text Prompt (Optional):</label>
            <input type="text" id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., a small, weathered wooden chest" disabled={isSubmitting}/>
            </div>
            <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Create Job'}
            </button>
            {error && <p className="error-text" style={{marginTop: '10px'}}>{error}</p>}
        </form>
      </div>
      
      <div className="jobs-list-container">
        <h2>Job History</h2>
        <div className="jobs-list">
          {jobs.length > 0 ? (
            jobs.map(job => <JobCard key={job.local_id} job={job} />)
          ) : (
            <p>No jobs created yet. Submit the form above to start!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;