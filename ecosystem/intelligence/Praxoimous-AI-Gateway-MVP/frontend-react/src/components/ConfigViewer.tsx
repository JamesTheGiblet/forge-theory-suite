import React, { useState, useEffect } from 'react';

const ConfigViewer: React.FC = () => {
  const [providersConfig, setProvidersConfig] = useState<string>('');
  const [routerConfig, setRouterConfig] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllConfigs = async () => {
      setIsLoading(true);
      setError(null);

      // Promise.all to fetch both configs concurrently
      try {
        const [providersResponse, routerResponse] = await Promise.all([
          fetch('/api/v1/config/providers'),
          fetch('/api/v1/config/model-router')
        ]);

        // Process providers.yaml response
        if (providersResponse.ok) {
          const providersText = await providersResponse.text();
          setProvidersConfig(providersText);
        } else {
          const errorText = await providersResponse.text();
          throw new Error(`Providers Config: ${errorText || providersResponse.statusText}`);
        }

        // Process model-router response
        if (routerResponse.ok) {
          const routerData = await routerResponse.json();
          setRouterConfig(routerData.llm_task_types || []);
        } else {
          const errorText = await routerResponse.text();
          throw new Error(`Model Router Config: ${errorText || routerResponse.statusText}`);
        }

      } catch (err: any) {
        setError(err.message);
        setProvidersConfig('');
        setRouterConfig([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllConfigs();
  }, []);

  if (isLoading) return <p>Loading provider configuration...</p>;
  if (error) return <p className="error-message">Error loading configuration: {error}</p>;

  return (
    <div className="config-viewer">
      <h4><code>config/providers.yaml</code></h4>
      {providersConfig ? (
        <pre className="config-content">{providersConfig}</pre>
      ) : (
        <p>No configuration content to display.</p>
      )}
      <h4>ModelRouter LLM Task Types</h4>
      <p>The following <code>task_type</code> values will be routed to an LLM provider:</p>
      <ul className="config-list">
        {routerConfig.map(rule => <li key={rule}><code>{rule}</code></li>)}
      </ul>
    </div>
  );
};

export default ConfigViewer;