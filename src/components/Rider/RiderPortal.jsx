import React, { useState, useEffect } from 'react';
import RiderLogin from './RiderLogin';
import RiderDashboard from './RiderDashboard';

export default function RiderPortal({ onBackToStore }) {
  const [currentRider, setCurrentRider] = useState(() => {
    try {
      const token = localStorage.getItem('salik_rider_token');
      const user = localStorage.getItem('salik_rider_user');
      if (token && user) {
        return JSON.parse(user);
      }
      return null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (rider) => {
    setCurrentRider(rider);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('salik_rider_token');
      localStorage.removeItem('salik_rider_user');
    } catch {}
    setCurrentRider(null);
  };

  if (!currentRider) {
    return (
      <RiderLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToStore={onBackToStore}
      />
    );
  }

  return (
    <RiderDashboard
      rider={currentRider}
      onLogout={handleLogout}
      onBackToStore={onBackToStore}
    />
  );
}
