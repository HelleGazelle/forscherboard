import React from 'react';
import {useEffect, useState} from 'react';
import KanbanBoard from 'react-trello';
import axios from 'axios';

const serverUrl = 'http://10.0.106.79:500/tickets/';

export default function Board() {
    const [cards, setCards] = useState([]);

    const dataFromDb = async () => {
        let data = await axios.get(serverUrl);
        console.log(data);
        return data;
    };
    

    const addCard = async (card, laneId) => {
        card.laneId = laneId;
        return await axios.post(serverUrl, card); 
    }

    const deleteCard = async (cardId) => {
        return await axios.delete(serverUrl + cardId); 
    }

    const changeLane = async (cardId, sourceLaneId, targetLaneId, position, cardDetails) => {

    }

    const defaultData = {lanes: [
        {
        id: 'lane1',
        title: 'Backlog',
        cards: cards,
        },
        {
        id: 'lane2',
        title: 'Planned',
        cards: []
        },
        {
        id: 'lane3',
        title: 'Doing',
        cards: []
        },
        {
        id: 'lane4',
        title: 'On Hold',
        cards: []
        },
        {
        id: 'lane5',
        title: 'Done',
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
        onCardAdd={(card, laneId) => addCard(card, laneId)}
        onCardDelete={(cardId) => deleteCard(cardId)}
        handleDragEnd={(cardId, sourceLaneId, targetLaneId, position, cardDetails) => changeLane(cardId, sourceLaneId, targetLaneId, position, cardDetails)}
        editable={true}
        >
        </KanbanBoard>
    )
}