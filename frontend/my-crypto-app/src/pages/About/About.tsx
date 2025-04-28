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
        name: "Rishiraj Paul Chowdhury",
        email: "ripa7320@colorado.edu",
        linkedInUrl: "https://www.linkedin.com/in/rishirajpchowdhury/",
        imageUrl: "https://media.licdn.com/dms/image/v2/D5635AQF8ogVTsl_9JQ/profile-framedphoto-shrink_400_400/profile-framedphoto-shrink_400_400/0/1722008297374?e=1746385200&v=beta&t=U2z7PXdsP8A2MCnNwcEtjSgQF_ixfrfd80lCMoi6uNw",
    },
    {
        name: "Pavan Sai Appari",
        email: "pavansai18.a@gmail.com",
        linkedInUrl: "https://www.linkedin.com/in/pavan1810/",
        imageUrl: "https://media.licdn.com/dms/image/v2/D5635AQG6KcDYWtwK2w/profile-framedphoto-shrink_400_400/profile-framedphoto-shrink_400_400/0/1693063944014?e=1746385200&v=beta&t=mbOOUVZ1QZkSFBSRpoZDDls5-qXuTbB52q7JAyjknLw",
    },
    {
        name: "Sai Gautham Ghanta",
        email: "sagh3893@colorado.edu",
        linkedInUrl: "https://www.linkedin.com/in/sai-gautham-ghanta/",
        imageUrl: "https://media.licdn.com/dms/image/v2/D5635AQEn-fWwG6z39A/profile-framedphoto-shrink_400_400/profile-framedphoto-shrink_400_400/0/1727553948430?e=1746385200&v=beta&t=mVSAR4gdvFJJ1ZSl6hmkZ0NJE9PFa7-PChBAgsLAiTw",
    },
    {
        name: "Sri Harsha Vallabhaneni",
        email: "srva5218@colorado.edu",
        linkedInUrl: "https://www.linkedin.com/in/vallabhanenisriharsha/",
        imageUrl: "https://media.licdn.com/dms/image/v2/D5635AQFMyWxYPKMupw/profile-framedphoto-shrink_400_400/profile-framedphoto-shrink_400_400/0/1726508575277?e=1746385200&v=beta&t=e5OhScVxLaJ3cJFoKpi61KW58z8cP8tyPA5cg_-H90w",
    },
    {
        name: "Heera Menon",
        email: "heme2265@colorado.edu",
        linkedInUrl: "http://linkedin.com/in/heera-menon-b5a644201",
        imageUrl: "https://media.licdn.com/dms/image/v2/D5603AQEyHl5lJF5_2w/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1718247002036?e=1751500800&v=beta&t=mD_BiLBKnLZvYzTU7RWktlGiJyWVoJ5WKzfcLPyb9HQ",
    },
];

const About: React.FC = () => {
    return (
        <div className="about-page">
            <div className="about-content">
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
                            <p className="developer-email" title={dev.email}>{dev.email}</p>
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
        </div>
    );
};

export default About;