import { useState, useEffect, lazy, Suspense } from 'react'; // Added lazy and Suspense
import type { FormEvent } from 'react';
import './App.css'
import { apiFetch } from './utils/api'; // Import the new api utility
// import AnalyticsDashboard from './components/AnalyticsDashboard'; // Changed to lazy import

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const SkillLibrary = lazy(() => import('./components/SkillLibrary')); // Lazy load SkillLibrary too
const ConfigViewer = lazy(() => import('./components/ConfigViewer')); // Lazy load ConfigViewer

interface TaskFormData {
  task_type: string;
  prompt: string;
}

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void;
  isSubmitting: boolean;
  llmTaskTypes: FilterTaskType[]; // Now passed from App
  availableSkills: Record<string, SkillCapability>; // Now passed from App
  skillsLoading: boolean; // Now passed from App
  skillsError: string | null; // Now passed from App
}

interface SkillCapability {
  skill_name: string;
  description: string;
  // Add other fields if needed from your get_capabilities() response
}

interface InteractionRecord {
  id: number;
  request_id: string;
  timestamp: string;
  task_type: string;
  provider: string | null;
  status: string;
  latency_ms: number | null;
  // prompt and response_data can be large, so maybe not display all of it directly
}

interface ProviderStatusRecord {
  name: string;
  status: string; // "Active", "Disabled", "Error"
  details?: string;
}

export interface FilterTaskType { // Exporting for use in AnalyticsDashboard
  name: string;
  value: string;
}

function TaskForm({
  onSubmit,
  isSubmitting,
  llmTaskTypes, // Receive from App
  availableSkills, // Receive from App
  skillsLoading, // Receive from App
  skillsError, // Receive from App
}: TaskFormProps) {
  const defaultTaskType = 'default_llm_tasks';
  const [taskType, setTaskType] = useState<string>(defaultTaskType);
  const [prompt, setPrompt] = useState<string>('');

  // Sort skills by name for consistent dropdown order
  const sortedSkillNames = Object.keys(availableSkills).sort();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!taskType.trim() || !prompt.trim()) {
      alert('Task Type and Prompt cannot be empty.'); // Simple validation
      return;
    }
    onSubmit({ task_type: taskType, prompt });
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="taskType">Task Type:</label>
        <select
          id="taskType"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
          disabled={isSubmitting}
        >
          <optgroup label="LLM Tasks">
            {llmTaskTypes.map(llmTask => (
              <option key={llmTask.value} value={llmTask.value}>{llmTask.name}</option>
            ))}
          </optgroup>
          <optgroup label="Smart Skills">
            {skillsLoading && <option disabled>Loading skills...</option>}
            {skillsError && <option disabled>Error: {skillsError}</option>}
            {!skillsLoading && !skillsError && sortedSkillNames.length === 0 && <option disabled>No smart skills found</option>}
            {!skillsLoading && !skillsError && sortedSkillNames.map(skillName => (
                <option key={skillName} value={skillName}>{availableSkills[skillName]?.skill_name || skillName}</option>
              ))
            }
          </optgroup>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="prompt">Prompt:</label>
        <textarea
          id="prompt"
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          disabled={isSubmitting}
        />
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Task'}
      </button>
    </form>
  );
}

function App() {
  const [response, setResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recentActivity, setRecentActivity] = useState<InteractionRecord[]>([]);
  const [systemStatus, setSystemStatus] = useState<ProviderStatusRecord[]>([]);
  
  // State lifted from TaskForm
  const [availableSkills, setAvailableSkills] = useState<Record<string, SkillCapability>>({});
  const [skillsLoading, setSkillsLoading] = useState<boolean>(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  const handleTaskSubmit = async (taskData: TaskFormData) => {
    setIsLoading(true);
    setResponse(null);
    setError(null);

    try {
      const responseData = await apiFetch<any>('/process', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      setResponse(responseData);
    } catch (err: any) {
      console.error('Error submitting task:', err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      fetchRecentActivity();
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const data = await apiFetch<{ data: InteractionRecord[] }>('/analytics?limit=5&offset=0');
      setRecentActivity(data.data || []);
    } catch (err: any) {
      console.error('Error fetching recent activity:', err);
      setRecentActivity([]);
      // Optionally, you could set an error state here to display in the UI
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const data = await apiFetch<{ providers_status: ProviderStatusRecord[] }>('/system-status');
      setSystemStatus(data.providers_status || []);
    } catch (err: any) {
      console.error('Error fetching system status:', err);
      const errorMessage = err.message || "An unknown error occurred.";
      setSystemStatus([{ name: "System Status", status: "Error", details: `Could not fetch status. Server said: ${errorMessage.substring(0, 100)}...` }]);
    }
  };

  // State for LLM task types, to be fetched from the backend
  const [llmTaskTypes, setLlmTaskTypes] = useState<FilterTaskType[]>([]);

  interface ModelRouterConfig {
    llm_task_types: string[];
  }

  const fetchLlmTaskTypes = async () => {
    try {
      const data = await apiFetch<ModelRouterConfig>('/config/model-router');
      // Transform the array of strings into the FilterTaskType format
      const formattedTaskTypes = (data.llm_task_types || []).map((task: string) => ({
        name: task.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format for display
        value: task,
      }));
      setLlmTaskTypes(formattedTaskTypes);
    } catch (error: any) {
      console.error("Error fetching LLM task types:", error);
      // Set a default or show an error
      setLlmTaskTypes([{ name: "Default LLM Tasks", value: "default_llm_tasks" }]);
    }
  };

  useEffect(() => {
    const fetchSkillsForApp = async () => {
      setSkillsLoading(true);
      setSkillsError(null);
      try {
        const data = await apiFetch<Record<string, SkillCapability>>('/skills');
        console.log("App: Skills data received:", data);
        setAvailableSkills(data);
        if (Object.keys(data).length === 0) {
          console.warn("App: Received an empty list of skills from the API.");
        }
      } catch (error: any) {
        console.error("App: Error fetching skills:", error);
        const errorMessage = error.message || "An unknown error occurred.";
        setSkillsError(`App: Error fetching skills: ${errorMessage}`);
        setAvailableSkills({});
      }
      setSkillsLoading(false);
    };

    fetchSkillsForApp();
    fetchRecentActivity();
    fetchSystemStatus();
    fetchLlmTaskTypes(); // Fetch the LLM task types on component mount
  }, []);

  // Prepare combined task types for AnalyticsDashboard filter
  const analyticsTaskTypeOptions: FilterTaskType[] = [
    ...llmTaskTypes,
    ...Object.entries(availableSkills).map(([skillKey, { skill_name }]) => ({
      name: skill_name || skillKey, // Use skill_name if available, else the key
      value: skillKey, // The key is the value for submission
    }))
  ].sort((a, b) => a.name.localeCompare(b.name)); // Sort them for display

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Praximous Dashboard</h1>
      </header>
      <main className="dashboard-main">
        <section className="dashboard-section task-submission">
          <h2>Submit New Task</h2>
          <TaskForm
            onSubmit={handleTaskSubmit}
            isSubmitting={isLoading}
            llmTaskTypes={llmTaskTypes}
            availableSkills={availableSkills}
            skillsLoading={skillsLoading}
            skillsError={skillsError}
          />
          {isLoading && <p className="loading-message">Processing...</p>}
          {response && (
            <div className="response-area success">
              <pre>{JSON.stringify(response, null, 2)}</pre>
            </div>
          )}
          {error && (
            <div className="response-area error">
              <pre>{error}</pre>
            </div>
          )}
        </section>
        <section className="dashboard-section system-status">
          <h2>System Status</h2>
          {systemStatus.length > 0 ? (
            <ul className="status-list">
              {systemStatus.map((provider) => (
                <li key={provider.name} className={`status-item status-indicator-${provider.status.toLowerCase()}`}>
                  <span className="provider-name">{provider.name}:</span>
                  <span className="provider-status">{provider.status}</span>
                  {provider.details && <span className="provider-details">({provider.details})</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading system status...</p>
          )}
        </section>
        <section className="dashboard-section recent-activity">
          <h2>Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <ul className="activity-list">
              {recentActivity.map((activity) => (
                <li key={activity.id} className={`activity-item status-${activity.status.toLowerCase()}`}>
                  <span className="activity-timestamp">{new Date(activity.timestamp).toLocaleString()}</span>
                  <span className="activity-task">Task: {activity.task_type}</span>
                  <span className="activity-provider">Provider: {activity.provider || 'N/A'}</span>
                  <span className="activity-status">Status: {activity.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent activity to display.</p>
          )}
        </section>
        <section className="dashboard-section analytics-section">
          <h2>Interactive Analytics Dashboard</h2>
          <Suspense fallback={<div>Loading Analytics Dashboard...</div>}>
            <AnalyticsDashboard availableTaskTypes={analyticsTaskTypeOptions} />
          </Suspense>
        </section>
        <section className="dashboard-section skill-library-section">
          <h2>Skill Library</h2>
          <Suspense fallback={<div>Loading Skill Library...</div>}>
            <SkillLibrary />
          </Suspense>
        </section>
        <section className="dashboard-section config-viewer-section">
          <h2>System Configuration Viewer</h2>
          <Suspense fallback={<div>Loading Configuration Viewer...</div>}>
            <ConfigViewer />
          </Suspense>
        </section>
      </main>
    </div>
  )
}

export default App
