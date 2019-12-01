import React from 'react';
import styles from '../styles/EditCard.css';

export default function EditCard(props) {
    return (
    <div className="editCard">
        <h1>{props.card.title}</h1>
    </div>
    )
}