import React, { createContext, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TransitionContext.css';

const TransitionContext = createContext();

export const useTransition = () => useContext(TransitionContext);

export const TransitionProvider = ({ children }) => {
  const [transitionState, setTransitionState] = useState('idle'); // 'idle', 'entering', 'exiting'
  const navigate = useNavigate();
  const location = useLocation();

  const navigateWithTransition = (to) => {
    if (location.pathname === to || transitionState !== 'idle') return;

    // Dog runs in
    setTransitionState('entering');

    setTimeout(() => {
      // Screen is covered, swap routes
      navigate(to);

      // Dog runs out
      setTransitionState('exiting');

      setTimeout(() => {
        setTransitionState('idle');
      }, 800);
    }, 800);
  };

  return (
    <TransitionContext.Provider value={{ navigateWithTransition }}>
      {children}
      {transitionState !== 'idle' && (
        <div className={`transition-overlay ${transitionState}`}>
          {/* Actual running dog GIF (facing right) */}
          <img
            src="/dog.gif"
            alt="Missing Dog Image"
            className="transition-dog"
          />
          <div className="fetching-text">Fetching page... 🐾</div>
        </div>
      )}
    </TransitionContext.Provider>
  );
};
