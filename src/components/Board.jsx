import React from 'react';
import {useEffect, useState} from 'react';
import KanbanBoard from 'react-trello';
import io from 'socket.io-client';

const socket = io.connect(process.env.REACT_APP_NETWORK_IP);

let eventBus = undefined;

const setEventBus = (handle) => {
    eventBus = handle;
};

socket.on('new card', (newTicket) => {
    eventBus.publish({type: 'ADD_CARD', laneId: newTicket.laneId, card: newTicket})
});

socket.on('card deleted', (ticketToDelete) => {
    eventBus.publish({type: 'REMOVE_CARD', laneId: ticketToDelete.laneId, cardId: ticketToDelete.cardId})
});

socket.on('card updated', (ticketToUpdate) => {
    eventBus.publish({type: 'MOVE_CARD', fromLaneId: ticketToUpdate.fromLaneId, toLaneId: ticketToUpdate.toLaneId, cardId: ticketToUpdate.cardId, index: 0})
});


export default function Board() {
    let [boardData, setBoardData] = useState(
        {
            lanes: [
                {
                    id: 'loading...',
                    title: 'loading...',
                    cards: []
                },
            ]
        }
    );

    // save card to db
    const addCard = (card, laneId) => {
        eventBus.publish({type: 'REMOVE_CARD', laneId: laneId, cardId: card.id})
        socket.emit('card to db', 
        {
            card: card,
            laneId: laneId
        });
    }

    // delete card from id
    const deleteCard =  (cardId, laneId) => {
        socket.emit('delete card from db', 
        {
            cardId: cardId,
            laneId: laneId
        });
    }

    // update lane id
    const cardMoveAcrossLanes = (fromLaneId, toLaneId, cardId, index) => {
        socket.emit('update lane', 
        {
            fromLaneId: fromLaneId,
            toLaneId: toLaneId,
            cardId: cardId,
            index: index
        });
    }

    // handle card click
    const handleCardClick = (cardId, metadata, laneId) => {
        // TBD: Open a Dialog and track time for tickets
    }

    useEffect(() => {
        socket.on('load initial data', (data) => {
            setBoardData({lanes: data.lanes});
        })}, []
    )
        

    return (
        <KanbanBoard 
        data={boardData}
        eventBusHandle={setEventBus}
        onCardAdd={(card, laneId) => addCard(card, laneId)}
        onCardDelete={(cardId, laneId) => deleteCard(cardId, laneId)}
        onCardMoveAcrossLanes={(fromLaneId, toLaneId, cardId, index) => cardMoveAcrossLanes(fromLaneId, toLaneId, cardId, index)}
        onCardClick={(cardId, metadata, laneId) => handleCardClick(cardId, metadata, laneId)}
        editable={true}
        >
        </KanbanBoard>
    )
}