import React from 'react';
import {useEffect, useState} from 'react';
import KanbanBoard from 'react-trello';
import io from 'socket.io-client';

const socket = io.connect('http://192.168.2.101');

export default function Board() {
    let [eventBus] = useState();

    const setEventBus = (handle) => {
        eventBus = handle;
    }

    // save card to db
    const addCard =  (card, laneId) => {
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

    socket.on('new card', (newTicket) => {
        eventBus.publish({type: 'ADD_CARD', laneId: newTicket.laneId, card: newTicket})
    });

    socket.on('card deleted', (ticketToDelete) => {
        eventBus.publish({type: 'REMOVE_CARD', laneId: ticketToDelete.laneId, cardId: ticketToDelete.cardId})
    });

    socket.on('card updated', (ticketToUpdate) => {
        eventBus.publish({type: 'MOVE_CARD', fromLaneId: ticketToUpdate.fromLaneId, toLaneId: ticketToUpdate.toLaneId, cardId: ticketToUpdate.cardId, index: 0})
    });

    const boardData = {
        lanes: [
            {
                id: 'extern',
                title: 'Externe Tickets',
                cards: []
                },
            {
                id: 'backlog',
                title: 'Backlog',
                cards: []
            },
            {
                id: 'planned',
                title: 'Planned',
                cards: []
            },
            {
                id: 'doing',
                title: 'Doing',
                cards: []
            },
            {
                id: 'onhold',
                title: 'On Hold',
                cards: []
            },
            {
                id: 'done',
                title: 'Done',
                cards: []
            }
    ]};

    useEffect(() => {
        socket.on('load tickets from db', (tickets) => {
            tickets.forEach(ticket => {
                boardData.lanes.forEach(lane => {
                    if(lane.id === ticket.laneId) {
                        eventBus.publish({type: 'ADD_CARD', laneId: lane.id, card: ticket})
                    }
                })
            })
        })
    });

    

    return (
        <KanbanBoard 
        data={boardData}
        eventBusHandle={setEventBus}
        onCardAdd={(card, laneId) => addCard(card, laneId)}
        onCardDelete={(cardId, laneId) => deleteCard(cardId, laneId)}
        onCardMoveAcrossLanes={(fromLaneId, toLaneId, cardId, index) => cardMoveAcrossLanes(fromLaneId, toLaneId, cardId, index)}
        editable={true}
        >
        </KanbanBoard>
    )
}