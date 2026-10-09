// routes/AppRouter.jsx — Declarative route tree mapping all paths to their page components
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={null} />
        <Route path="/login" element={null} />
        <Route path="/register" element={null} />
        <Route path="/report" element={null} />
        <Route path="/my-reports" element={null} />
        <Route path="/dashboard" element={null} />
        <Route path="/assignments" element={null} />
        <Route path="/assignments/:id" element={null} />
        <Route path="/station" element={null} />
        <Route path="/admin/users" element={null} />
        <Route path="/admin/stations" element={null} />
      </Routes>
    </BrowserRouter>
  );
}
