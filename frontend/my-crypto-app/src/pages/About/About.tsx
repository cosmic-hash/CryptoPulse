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
    }
];

const About: React.FC = () => {
    return (
        <div className="about">
            <h2>About CryptoPulse</h2>
            <p>This app helps you track crypto trends and market stats in real time.</p>

            <h3 className="developers-heading">Meet the Developers</h3>
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
