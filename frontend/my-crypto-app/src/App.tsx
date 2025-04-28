import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import About from './pages/About/About';
import NotFound from './pages/NotFound/NotFound';
import Profile from './pages/Profile/Profile';
import './App.css';
import SentimentDashboard from './pages/SentimentDashboard/SentimentDashboard';

const App: React.FC = () => {
    return (
        <Router>
            <div className="app-container">
                <Header />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<SentimentDashboard/>} />
                        <Route path="/about" element={<About/>} />
                        <Route path="/profile" element={<Profile/>} />
                        <Route path="*" element={<NotFound/>} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
