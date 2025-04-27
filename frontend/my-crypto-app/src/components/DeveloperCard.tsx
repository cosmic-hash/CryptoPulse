import React from 'react';

interface DeveloperCardProps {
    name: string;
    email: string;
    linkedInUrl: string;
    imageUrl: string;
}

const DeveloperCard: React.FC<DeveloperCardProps> = ({ name, email, linkedInUrl, imageUrl }) => {
    return (
        <div className="developer-card">
            <img src={imageUrl} alt={name} className="developer-image" />
            <h2 className="developer-name">{name}</h2>
            <p className="developer-email">{email}</p>
            <a
                href={linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="linkedin-button"
            >
                View LinkedIn
            </a>
        </div>
    );
};

export default DeveloperCard;
