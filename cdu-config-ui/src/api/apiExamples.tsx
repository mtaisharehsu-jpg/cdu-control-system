/**
 * CDU API Usage Examples
 * 
 * This file demonstrates how to use the CDU API functions in React components.
 * These examples show best practices for error handling, loading states, and data management.
 */

import React, { useState, useEffect } from 'react';
import {
  getMachineConfigs,
  setCurrentMachine,
  getSystemStatus,
  getSensors,
  getIntegratedAlarms,
  executeOperation,
  writeValue,
  formatApiError,
  withTimeout,
  type MachineConfigResponse,
  type SystemStatus,
  type SensorsResponse,
  type IntegratedAlarmsResponse,
  type OperationRequest,
  type ValueWriteRequest
} from './cduApi';

// === React Hook Examples ===

/**
 * Custom hook for managing machine configurations
 */
export const useMachineConfigs = () => {
  const [configs, setConfigs] = useState<MachineConfigResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(getMachineConfigs(), 5000);
      setConfigs(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMachine = async (machineType: string) => {
    setLoading(true);
    setError(null);
    try {
      await withTimeout(setCurrentMachine(machineType), 5000);
      await fetchConfigs(); // Refresh configs after switch
      return true;
    } catch (err) {
      setError(formatApiError(err));
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return {
    configs,
    loading,
    error,
    fetchConfigs,
    switchMachine
  };
};

/**
 * Custom hook for system status monitoring
 */
export const useSystemStatus = (refreshInterval: number = 5000) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(getSystemStatus(), 3000);
      setStatus(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return {
    status,
    loading,
    error,
    fetchStatus
  };
};

/**
 * Custom hook for sensor data monitoring
 */
export const useSensors = (sensorType?: string, refreshInterval: number = 2000) => {
  const [sensors, setSensors] = useState<SensorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(getSensors(sensorType), 5000);
      setSensors(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchSensors, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [sensorType, refreshInterval]);

  return {
    sensors,
    loading,
    error,
    fetchSensors
  };
};

/**
 * Custom hook for integrated alarms monitoring
 */
export const useIntegratedAlarms = (refreshInterval: number = 3000) => {
  const [alarms, setAlarms] = useState<IntegratedAlarmsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlarms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await withTimeout(getIntegratedAlarms(), 5000);
      setAlarms(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchAlarms, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  return {
    alarms,
    loading,
    error,
    fetchAlarms
  };
};

// === Component Usage Examples ===

/**
 * Example: Machine Configuration Component
 */
export const MachineConfigExample: React.FC = () => {
  const { configs, loading, error, switchMachine } = useMachineConfigs();

  const handleSwitchMachine = async (machineType: string) => {
    const success = await switchMachine(machineType);
    if (success) {
      console.log(`Successfully switched to ${machineType}`);
    }
  };

  if (loading) return <div>Loading machine configurations...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!configs) return <div>No configurations available</div>;

  return (
    <div>
      <h2>Current Machine: {configs.current_machine}</h2>
      <p>Total Machines: {configs.total_machines}</p>
      
      <div>
        {Object.entries(configs.machine_configs).map(([type, config]) => (
          <div key={type}>
            <h3>{config.machine_name}</h3>
            <p>{config.description}</p>
            <button 
              onClick={() => handleSwitchMachine(type)}
              disabled={type === configs.current_machine}
            >
              {type === configs.current_machine ? 'Current' : 'Switch'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Example: System Status Dashboard
 */
export const SystemStatusExample: React.FC = () => {
  const { status, loading, error } = useSystemStatus(1000); // Refresh every second

  if (loading) return <div>Loading system status...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!status) return <div>No status available</div>;

  return (
    <div>
      <h2>System Status</h2>
      <div>
        <p>Power On: {status.summary.power_on ? '✅' : '❌'}</p>
        <p>Running: {status.summary.running ? '✅' : '❌'}</p>
        <p>Standby: {status.summary.standby ? '✅' : '❌'}</p>
        <p>Abnormal: {status.summary.abnormal ? '⚠️' : '✅'}</p>
        <p>Overall Status: {status.summary.overall_status}</p>
      </div>
    </div>
  );
};

/**
 * Example: Operation Control Component
 */
export const OperationControlExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleOperation = async (operation: OperationRequest['operation']) => {
    setLoading(true);
    setMessage('');
    
    try {
      const result = await withTimeout(executeOperation({ operation }), 5000);
      setMessage(`✅ ${result.operation_description}: ${result.status}`);
    } catch (err) {
      setMessage(`❌ Error: ${formatApiError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>CDU Operations</h2>
      <div>
        <button 
          onClick={() => handleOperation('start')} 
          disabled={loading}
        >
          Start CDU
        </button>
        <button 
          onClick={() => handleOperation('stop')} 
          disabled={loading}
        >
          Stop CDU
        </button>
        <button 
          onClick={() => handleOperation('fan_start')} 
          disabled={loading}
        >
          Start Fan
        </button>
        <button 
          onClick={() => handleOperation('fan_stop')} 
          disabled={loading}
        >
          Stop Fan
        </button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
};

/**
 * Example: Value Setting Component
 */
export const ValueSettingExample: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const handleValueWrite = async (parameter: ValueWriteRequest['parameter'], value: number) => {
    setLoading(true);
    setMessage('');
    
    try {
      const result = await withTimeout(writeValue({ parameter, value }), 5000);
      setMessage(`✅ ${result.description}: ${result.actual_value} ${result.unit}`);
    } catch (err) {
      setMessage(`❌ Error: ${formatApiError(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Value Settings</h2>
      <div>
        <button 
          onClick={() => handleValueWrite('temp_setting', 25.5)} 
          disabled={loading}
        >
          Set Temperature to 25.5°C
        </button>
        <button 
          onClick={() => handleValueWrite('fan_speed', 75)} 
          disabled={loading}
        >
          Set Fan Speed to 75%
        </button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
};
