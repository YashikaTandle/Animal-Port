import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Edit3 } from 'lucide-react';
import Button from '../components/Button';

const Profile = ({ embedded = false }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [formData, setFormData] = useState({ newUsername: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetch('http://localhost:3000/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem('token');
        navigate('/login');
        window.location.reload();
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
    // Force navbar update
    window.location.reload();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg(''); setErrorMsg('');
    const token = localStorage.getItem('token');
    try {
      if (!formData.newUsername && !formData.newPassword) {
        return setErrorMsg('Please enter new credentials to update.');
      }
      const res = await fetch('http://localhost:3000/api/users/credentials', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(data.message);
      if (formData.newUsername) setUser({ ...user, username: formData.newUsername });
      setFormData({ newUsername: '', newPassword: '' });
      setTimeout(() => setShowEdit(false), 2000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (loading) return <div className="container flex-center" style={{minHeight: embedded ? '20vh' : '60vh'}}><h2 style={{color: 'black'}}>Loading...</h2></div>;

  return (
    <div className={embedded ? "animate-fade-in" : "container animate-fade-in"} style={embedded ? {maxWidth: '100%'} : {paddingTop: '6rem', maxWidth: '500px', margin: '0 auto'}}>
      <div className="glass-card" style={{padding: '2.5rem', textAlign: 'center'}}>
        <div className="flex-center flex-column" style={{marginBottom: '2rem'}}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%', 
            background: 'var(--secondary-color)', color: 'var(--primary-color)', 
            fontSize: '2.5rem', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', marginBottom: '1rem',
            fontWeight: 'bold', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: '2px solid black', WebkitTextStroke: '1px black'
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 style={{marginBottom: '0.2rem', color: 'black'}}>{user.username}</h2>
          <span className="badge" style={{marginTop: '0.5rem', background: 'rgba(0,0,0,0.1)', color: 'black'}}>
            {user.user_type === 'normal' ? 'Normal User' : 
             user.user_type === 'vet' ? 'Veterinarian' : 
             user.user_type === 'ngo' ? 'NGO Member' : 'User'}
          </span>
        </div>

        {!showEdit ? (
          <div className="action-row flex-column" style={{gap: '1rem'}}>
            <Button variant="outline" icon={<Edit3 size={18} />} onClick={() => setShowEdit(true)} style={{width: '100%', justifyContent: 'center'}}>
              Change Credentials
            </Button>
            <Button variant="secondary" icon={<LogOut size={18} />} onClick={handleLogout} style={{width: '100%', justifyContent: 'center'}}>
              Switch Account / Logout
            </Button>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="flex-column" style={{gap: '1.2rem', background: 'rgba(0,0,0,0.05)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'left'}}>
            <h3 style={{color: 'black', marginBottom: '0.5rem'}}>Update Credentials</h3>
            
            <div className="input-group">
              <label style={{color: 'black', fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block'}}>New Username (optional)</label>
              <input 
                type="text" 
                value={formData.newUsername} 
                onChange={(e) => setFormData({...formData, newUsername: e.target.value})} 
                placeholder="New Username" 
                style={{width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'white', color: 'black', outline: 'none'}}
              />
            </div>
            
            <div className="input-group">
              <label style={{color: 'black', fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block'}}>New Password (optional)</label>
              <input 
                type="password" 
                value={formData.newPassword} 
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})} 
                placeholder="New Password" 
                style={{width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--surface-border)', background: 'white', color: 'black', outline: 'none'}}
              />
            </div>
            
            {errorMsg && <p style={{color: 'var(--danger)', fontSize: '0.9rem', margin: 0}}>{errorMsg}</p>}
            {msg && <p style={{color: 'var(--success)', fontSize: '0.9rem', margin: 0}}>{msg}</p>}

            <div className="flex-between mt-sm" style={{marginTop: '0.5rem'}}>
              <Button variant="outline" onClick={() => setShowEdit(false)} type="button">Cancel</Button>
              <Button variant="primary" type="submit">Save Changes</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
