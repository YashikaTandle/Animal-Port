import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, KeyRound } from 'lucide-react';
import Button from '../components/Button';
import './Signup.css';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    user_type: 'normal'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (formData.password !== formData.confirmPassword) {
      return setErrorMsg('Passwords do not match');
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('http://localhost:3000/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg('OTP sent to ' + formData.email);
      setShowOtp(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (formData.password !== formData.confirmPassword) {
      return setErrorMsg('Passwords do not match');
    }

    try {
      const res = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.email, password: formData.password, user_type: formData.user_type, email: formData.email, otp }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg(data.message + ' Please login.');
      setFormData({ name: '', email: '', password: '', confirmPassword: '', user_type: 'normal' });
      setShowOtp(false);
      setOtp('');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="auth-container animate-fade-in">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <img src="/logo.png" alt="ANIMALPORT" className="auth-logo" />
          <h2>{showOtp ? 'Verify OTP' : 'Create Account'}</h2>
          <p>{showOtp ? 'Enter the OTP sent to your email.' : 'Join ANIMALPORT today!'}</p>
        </div>

        {!showOtp ? (
          <form className="auth-form" onSubmit={handleSendOtp}>
          <div className="input-group delay-100">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <User className="input-icon" size={20} />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={(e) => {
                  if (/^[a-zA-Z\s]*$/.test(e.target.value)) handleChange(e);
                }}
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          <div className="input-group delay-200">
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

          <div className="input-group delay-300">
            <label htmlFor="user_type">Account Category</label>
            <div className="input-wrapper" style={{padding: 0, position: 'relative'}}>
              <User className="input-icon" size={20} style={{position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)'}} />
              <select
                id="user_type"
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                style={{width: '100%', padding: '12px 16px 12px 48px', border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', color: 'var(--text-primary)', cursor: 'pointer'}}
              >
                <option value="normal">Normal User</option>
                <option value="vet">Veterinarian</option>
                <option value="ngo">NGO Member</option>
              </select>
            </div>
          </div>

          <div className="input-group delay-300">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
              />
            </div>
          </div>

          <div className="input-group delay-400">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>
          
          {errorMsg && <p className="error-message delay-400" style={{color: 'var(--danger)', marginTop: '1rem'}}>{errorMsg}</p>}
          {successMsg && <p className="success-message delay-400" style={{color: 'var(--success)', marginTop: '1rem'}}>{successMsg}</p>}

          <Button 
            type="submit" 
            variant="secondary" 
            size="lg" 
            className="auth-submit-btn delay-400"
            icon={<UserPlus size={20} />}
            disabled={isSendingOtp}
          >
            {isSendingOtp ? 'Sending OTP...' : 'Next'}
          </Button>
        </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="input-group delay-100">
              <label htmlFor="otp">One-Time Password (OTP)</label>
              <div className="input-wrapper">
                <KeyRound className="input-icon" size={20} />
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </div>
            </div>

            {errorMsg && <p className="error-message delay-200" style={{color: 'var(--danger)', marginTop: '1rem'}}>{errorMsg}</p>}
            {successMsg && <p className="success-message delay-200" style={{color: 'var(--success)', marginTop: '1rem'}}>{successMsg}</p>}

            <Button 
              type="submit" 
              variant="secondary" 
              size="lg" 
              className="auth-submit-btn delay-300"
              icon={<UserPlus size={20} />}
            >
              Verify & Sign Up
            </Button>
            
            <button 
              type="button"
              className="mt-4"
              style={{background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline'}}
              onClick={() => setShowOtp(false)}
            >
              Back to Sign Up
            </button>
          </form>
        )}

        <div className="auth-footer delay-400">
          <p>Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
