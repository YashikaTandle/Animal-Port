import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Activity, Users, Settings } from 'lucide-react';
import Button from '../components/Button';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ todayCases: '--', connectedProviders: '--', avgDetection: '2.3 sec' });

  useEffect(() => {
    // Fetch Global Stats
    fetch('http://localhost:3000/api/stats')
        .then(res => res.json())
        .then(data => { if(!data.error) setStats(data); })
        .catch(err => console.error("Error fetching stats:", err));

    // Fetch Authenticated User
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:3000/api/me', {
             headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => { if (!data.error) setUser(data); })
      .catch(err => console.error(err));
    }
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section container">
        <div className="hero-content animate-slide-up">
          <div className="badge">AI-Powered Animal Healthcare</div>
          <h1 className="hero-title">
            Advanced Disease Detection <br />
            <span className="text-gradient">& Veterinary System</span>
          </h1>
          <p className="hero-subtitle">
            Empowering animal care with cutting-edge AI diagnosis, community support, and seamless veterinary integration—all in one scalable platform.
          </p>
          
          <div className="hero-cta-group">
            <Button size="lg" icon={<Activity />} onClick={() => navigate('/detection')}>
              Start Detection
            </Button>
            {user && (
              <Button variant="secondary" size="lg" icon={<Users />} onClick={() => navigate('/dashboard')}>
                {user.user_type === 'ngo' ? 'NGO Dashboard' : user.user_type === 'vet' ? 'Vet Dashboard' : 'Dashboard'}
              </Button>
            )}
          </div>
        </div>

        <div className="hero-visual animate-slide-up delay-200" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <div className="glass-card visual-card main-card" style={{padding: '2rem', textAlign: 'left', width: '100%', maxWidth: '400px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem'}}>
               <Activity size={32} className="text-primary" />
               <h3 style={{margin: 0, fontSize: '1.5rem', color: 'var(--text-main)'}}>Live Case Insights</h3>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.3rem'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)'}}>
                        <span style={{fontSize: '1.3rem'}}>🐾</span>
                        <span style={{fontWeight: '500', fontSize: '0.95rem'}}>Cases reported today:</span>
                    </div>
                    <span style={{fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--primary-color)'}}>{stats.todayCases}</span>
                </div>

                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)'}}>
                        <span style={{fontSize: '1.3rem'}}>🏥</span>
                        <span style={{fontWeight: '500', fontSize: '0.95rem'}}>NGOs/Vets connected:</span>
                    </div>
                    <span style={{fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--success)'}}>{stats.connectedProviders}</span>
                </div>

                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)'}}>
                        <span style={{fontSize: '1.3rem'}}>⚡</span>
                        <span style={{fontWeight: '500', fontSize: '0.95rem'}}>Avg detection time:</span>
                    </div>
                    <span style={{fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--warning)'}}>{stats.avgDetection}</span>
                </div>
            </div>

            <div className="status-bar" style={{marginTop: '2rem', justifyContent: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '1rem', padding: '0.8rem'}}>
              <div className="status-indicator online"></div>
              <span style={{fontSize: '0.85rem', fontWeight: 'bold'}}>Live Data Syncing</span>
            </div>
          </div>
          
          <div className="glass-card" style={{padding: '1.5rem', textAlign: 'center', maxWidth: '400px', background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)'}}>
             <h4 style={{fontSize: '1.1rem', color: 'var(--text-main)', fontStyle: 'italic', fontWeight: '600', margin: 0}}>
                "From detection to action — simplifying animal welfare."
             </h4>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="features-section container animate-fade-in delay-400">
        <h2 className="section-title text-center">System Capabilities</h2>
        
        <div className="grid-cols-3">
          <div className="glass-card feature-card">
            <div className="feature-icon-wrapper bg-primary">
              <Activity size={24} />
            </div>
            <h3>Faster Help for Animals</h3>
            <p>Quick detection tools that help identify health issues before they become critical. Analyze images and symptoms in seconds, prioritize urgent cases, and enable early intervention to improve survival and recovery outcomes.</p>
          </div>
          
          <div className="glass-card feature-card">
            <div className="feature-icon-wrapper bg-secondary">
              <Users size={24} />
            </div>
            <h3>Care Without Barriers</h3>
            <p>Bringing veterinarians and rescuers together to ensure every animal gets timely attention. Collaborate through real-time consultations, shared case histories, and instant updates—no matter the location or resource limitations.</p>
          </div>
          
          <div className="glass-card feature-card">
            <div className="feature-icon-wrapper bg-warning">
              <Settings size={24} />
            </div>
            <h3>Built for Every Rescue</h3>
            <p>Whether small shelters or large NGOs, the platform grows with your mission. Flexible tools and scalable infrastructure adapt to your needs, supporting everything from on-ground rescues to coordinated, large-scale operations.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
