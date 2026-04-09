import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Button from './Button';
import './Navbar.css';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:3000/api/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { if (!data.error) setUser(data); })
        .catch(err => console.error(err));

      fetch('http://localhost:3000/api/notifications', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setNotifications(data); })
        .catch(err => console.error(err));
    }
  }, []);

  const handleReadNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && notifications.some(n => !n.isRead)) {
         const token = localStorage.getItem('token');
         fetch('http://localhost:3000/api/notifications/read', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
         }).then(() => {
            setNotifications(prev => prev.map(n => ({...n, isRead: 1})));
         });
    }
  };
  return (
    <header className="navbar-container">
      <div className="container flex-between navbar-inner glass-panel">
        <NavLink to="/" className="navbar-logo">
          <img src="/logo.png" alt="ANIMALPORT Logo" style={{width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-border)'}} />
          <h2>ANIMAL<span>PORT</span></h2>
        </NavLink>

        <nav className="desktop-nav">
          <NavLink to="/" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
          <NavLink to="/detection" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>Detect Disease</NavLink>
          {user && (
            <NavLink to="/dashboard" className={({isActive}) => isActive ? "nav-link active" : "nav-link"}>
              {user.user_type === 'vet' ? 'Vet Dashboard' : user.user_type === 'ngo' ? 'NGO Dashboard' : 'Dashboard'}
            </NavLink>
          )}
        </nav>

        <div className="navbar-actions">
          {user ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginRight: '1rem'}}>
              
              <div style={{position: 'relative', cursor: 'pointer', marginRight: '0.5rem', display: 'flex', alignItems: 'center'}} onClick={handleReadNotifications}>
                 <Bell size={24} color="#2d2a3e" style={{ strokeWidth: 2.5 }} />
                 {notifications.some(n => !n.isRead) && (
                     <span style={{position: 'absolute', top: '-4px', right: '-4px', background: 'red', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white'}}></span>
                 )}

                 {/* Dropdown Overlay */}
                 {showNotifications && (
                   <div style={{position: 'absolute', top: '40px', right: '-50px', background: 'white', borderRadius: '1rem', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', width: '300px', zIndex: 9999, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)'}}>
                     <div style={{background: 'var(--surface-color)', padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', fontWeight: 'bold'}}>Notifications</div>
                     <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                       {notifications.length === 0 ? (
                          <div style={{padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)'}} className="text-sm">You have no new alerts.</div>
                       ) : (
                          notifications.map((n, i) => (
                             <NavLink to="/dashboard" key={i} style={{padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: n.isRead ? 'white' : 'rgba(0,0,0,0.02)', color: 'black', textDecoration: 'none'}}>
                                <span style={{fontSize: '0.85rem', fontWeight: n.isRead ? 'normal' : 'bold'}}>{n.message}</span>
                                <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{n.time}</span>
                             </NavLink>
                          ))
                       )}
                     </div>
                   </div>
                 )}
              </div>

              <span style={{fontWeight: '600', color: 'var(--text-light)', display: 'none', '@media (min-width: 768px)': {display: 'block'}}}>Hi, {user.username}</span>
              <NavLink to="/profile" style={{
                width: '40px', height: '40px', borderRadius: '50%', background: 'var(--secondary-color)', 
                color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: '2px solid black', WebkitTextStroke: '1px black'
              }}>
                {user.username.charAt(0).toUpperCase()}
              </NavLink>
            </div>
          ) : (
            <>
              <NavLink to="/login" className="nav-link" style={{marginRight: '10px', fontWeight: '600'}}>Login</NavLink>
              <Link to="/signup"><Button variant="primary" size="sm">Sign Up</Button></Link>
            </>
          )}
          <button className="mobile-menu-btn">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
