import React from 'react';
import {useEffect, useState} from 'react';
import KanbanBoard from 'react-trello';
import axios from 'axios';
import openSocket from 'socket.io-client';
const socket = openSocket('http://localhost:800');

const dataFromDb = async () => {
    return await axios.get('http://localhost:500/tickets');
};

export default function Board() {
    const [cards, setCards] = useState([]);

    // let eventBus = undefined;
    // const setEventBus = (handle) => {
    //     eventBus = handle;
    // }

    // get message for new ticket
    socket.on('new ticket', (newTicket) => {
        let currentCards = cards;
        currentCards.push(newTicket.data);
        setCards(currentCards);
    });

    const deleteCard = async (cardId, LaneId) => {
        return await axios.delete(`http://localhost:500/tickets/${cardId}`); 
    }

    const defaultData = {lanes: [
        {
        id: 'lane1',
        title: 'Backlog',
        label: '2/2',
        cards: cards,
        },
        {
        id: 'lane2',
        title: 'Doing',
        label: '0/0',
        cards: []
        },
        {
        id: 'lane3',
        title: 'Resolved',
        label: '0/0',
        cards: []
        }
    ]};

    useEffect(() => {
        dataFromDb().then((newData) => {
            setCards(newData.data);
        });
    }, []);

    

    return (
        <KanbanBoard data={defaultData} onCardDelete={(cardId, laneId) => deleteCard(cardId, laneId)}></KanbanBoard>
    )
}