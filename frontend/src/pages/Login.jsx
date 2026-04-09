import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import Button from '../components/Button';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.email, password: formData.password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem('token', data.token);
      setSuccessMsg(data.message + ' Redirecting...');
      setTimeout(() => window.location.href = '/', 1500);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <img src="/logo.png" alt="ANIMALPORT" className="auth-logo" />
          <h2>Welcome Back!</h2>
          <p>We missed you! Please log in to continue.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group delay-100">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="input-group delay-200">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <div className="auth-actions delay-300">
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          {errorMsg && <p className="error-message delay-300" style={{color: 'var(--danger)', marginBottom: '1rem'}}>{errorMsg}</p>}
          {successMsg && <p className="success-message delay-300" style={{color: 'var(--success)', marginBottom: '1rem'}}>{successMsg}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="auth-submit-btn delay-400"
            icon={<LogIn size={20} />}
          >
            Login
          </Button>
        </form>

        <div className="auth-footer delay-400">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
