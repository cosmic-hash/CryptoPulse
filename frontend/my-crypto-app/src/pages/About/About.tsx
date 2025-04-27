import React from 'react';
import './About.css';

interface Developer {
    name: string;
    email: string;
    linkedInUrl: string;
    imageUrl: string;
}

const developers: Developer[] = [
    {
        name: "Pavan Sai Appari",
        email: "pavansai18.a@gmail.com",
        linkedInUrl: "https://www.linkedin.com/in/pavan1810/",
        imageUrl: "/images/pavan.jpeg",
    },
    {
        name: "Alice Johnson",
        email: "alice@example.com",
        linkedInUrl: "https://www.linkedin.com/in/alicejohnson/",
        imageUrl: "/images/alice.png",
    },
    {
        name: "Bob Smith",
        email: "bob@example.com",
        linkedInUrl: "https://www.linkedin.com/in/bobsmith/",
        imageUrl: "/images/bob.png",
    },
    {
        name: "Charlie Brown",
        email: "charlie@example.com",
        linkedInUrl: "https://www.linkedin.com/in/charliebrown/",
        imageUrl: "/images/charlie.png",
    },
    {
        name: "Diana Prince",
        email: "diana@example.com",
        linkedInUrl: "https://www.linkedin.com/in/dianaprince/",
        imageUrl: "/images/diana.png",
    },
];

const About: React.FC = () => {
    return (
        <div className="about">
            <h2>About CryptoPulse</h2>
            <p>
                CryptoPulse is your gateway to real-time crypto market insights and trend analysis.
                We help you track sentiment, news, and market changes to stay ahead in the fast-moving world of cryptocurrencies.
            </p>

            <div className="architecture-section">
                <h3>Architecture Overview</h3>
                <div className="architecture-image-wrapper">
                    <img src="/images/architecture.png" alt="Architecture Diagram" />
                </div>
            </div>

            <h3 className="developers-heading">Meet the Team</h3>
            <div className="developers-container">
                {developers.map((dev) => (
                    <div className="developer-card" key={dev.email}>
                        <img src={dev.imageUrl} alt={dev.name} className="developer-image" />
                        <h4 className="developer-name">{dev.name}</h4>
                        <p className="developer-email">{dev.email}</p>
                        <a
                            href={dev.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="linkedin-button"
                        >
                            View LinkedIn
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default About;
