import React from 'react';
import {useEffect, useState} from 'react';
import KanbanBoard from 'react-trello';
import axios from 'axios';
import openSocket from 'socket.io-client';
const socket = openSocket('http://localhost:400');

const dataFromDb = async () => {
    return await axios.get('http://localhost:500/tickets');
};

export default function Board() {
    const [cards, setCards] = useState([]);

    // get message for new ticket
    // socket.on('new ticket', (newTicket) => {
    //     console.log('Got a Socket Message');
    //     let currentCards = cards;
    //     currentCards.push(newTicket.data);
    //     setCards(currentCards);
    // });

    // just retreive data from db
    socket.on('new ticket', (newTicket) => {
        dataFromDb();
    });

    const addCard = async (card) => {
        return await axios.post(`http://localhost:500/tickets`, card); 
    }

    const deleteCard = async (cardId) => {
        return await axios.delete(`http://localhost:500/tickets/${cardId}`); 
    }

    const defaultData = {lanes: [
        {
        id: 'lane1',
        title: 'Backlog',
        cards: cards,
        },
        {
        id: 'lane2',
        title: 'Doing',
        cards: []
        },
        {
        id: 'lane3',
        title: 'Resolved',
        cards: []
        }
    ]};

    useEffect(() => {
        dataFromDb().then((newData) => {
            setCards(newData.data);
        });
    }, []);

    

    return (
        <KanbanBoard 
        data={defaultData} 
        onCardAdd={(card) => addCard(card)}
        onCardDelete={(cardId) => deleteCard(cardId)}        
        editable={true}
        >
        </KanbanBoard>
    )
}