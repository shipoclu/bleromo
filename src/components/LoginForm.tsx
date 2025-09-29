import React, { useState, useEffect } from 'react';
import { login } from '../store/appState';

interface LoginFormProps {
  onSubmit?: (handle: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit }) => {
  const [handle, setHandle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(false);

  // Validate fediverse handle format
  const validateHandle = (input: string): boolean => {
    if (!input.trim()) return false;
    
    // Must contain exactly one @ symbol
    const parts = input.split('@');
    if (parts.length !== 2) return false;
    
    const [nickname, domain] = parts;
    
    // Validate nickname: alphanumeric plus dot, dash, underscore
    const nicknameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!nickname || !nicknameRegex.test(nickname)) return false;
    
    // Validate domain: basic domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domain || !domainRegex.test(domain)) return false;
    
    // Domain must have at least one dot and valid TLD
    if (!domain.includes('.') || domain.endsWith('.') || domain.startsWith('.')) return false;
    
    return true;
  };

  // Validate on every input change
  useEffect(() => {
    setIsValid(validateHandle(handle));
  }, [handle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onSubmit) {
        onSubmit(handle.trim());
      } else {
        login(handle.trim());
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 style={{
        marginBottom: '20px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        Welcome to Bleromofw
      </h2>
      
      <p style={{
        marginBottom: '20px',
        fontSize: '12px',
        color: '#000080'
      }}>
        Enter your fediverse handle to connect
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="username@server.tld"
            style={{
              width: '250px',
              padding: '4px 8px',
              fontSize: '12px',
              border: '2px inset #c0c0c0',
              backgroundColor: 'white',
              borderColor: !handle ? '#c0c0c0' : isValid ? '#008000' : '#ff0000'
            }}
            disabled={isLoading}
            autoFocus
          />
          {handle && !isValid && (
            <div style={{
              fontSize: '10px',
              color: '#ff0000',
              marginTop: '4px'
            }}>
              Please enter a valid fediverse handle (username@domain.tld)
            </div>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !isValid}
          style={{
            padding: '6px 20px',
            fontSize: '12px',
            border: '2px outset #c0c0c0',
            backgroundColor: '#c0c0c0',
            cursor: isLoading || !isValid ? 'default' : 'pointer',
            minWidth: '80px',
            borderRadius: '0',
            fontFamily: 'MS Sans Serif, sans-serif',
            opacity: isLoading || !isValid ? 0.6 : 1
          }}
        >
          {isLoading ? 'Connecting...' : 'Log In'}
        </button>
      </form>
    </>
  );
};

export default LoginForm;