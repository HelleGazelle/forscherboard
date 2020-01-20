import React from "react";
import { useEffect, useState } from "react";
import KanbanBoard from "react-trello";
import FunctionBar from '../components/FunctionBar';
import io from "socket.io-client";

let socketEndpoint;

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    socketEndpoint = "http://" + window.location.hostname + ":8002"
} else {
    socketEndpoint = "https://" + window.location.hostname;
}

let socket;
let eventBus;

const setEventBus = handle => {
  eventBus = handle;
};

export default function Board() {
  const sortFunction = (card1) => {
    if(card1.hasOwnProperty('tags')) {
      if(card1.tags.length !== 0){
        if(card1.tags[0].title === ('Critical') || card1.tags[0].title === ('Blocker')) {
          return -1;
        }
        return 1;
      }
    }
  };
  //board options
  let [boardData, setBoardData] = useState({
    lanes: [
      {
        id: "loading...",
        title: "loading...",
        cards: []
      }
    ]
  });

  // save card to db
  const addCard = (card, laneId) => {
    eventBus.publish({ type: "REMOVE_CARD", laneId: laneId, cardId: card.id });
    socket.emit("card to db", {
      card: card,
      laneId: laneId
    });
  };

  // delete card from id
  const deleteCard = (cardId, laneId) => {
    socket.emit("delete card from db", {
      cardId: cardId,
      laneId: laneId
    });
  };

  // update lane id
  const cardMoveAcrossLanes = (fromLaneId, toLaneId, cardId, index) => {
    socket.emit("move card", {
      fromLaneId: fromLaneId,
      toLaneId: toLaneId,
      cardId: cardId,
      index: index
    });
  };

  // handle card click
  const handleCardClick = (cardId, metadata, laneId) => {
    // if the 'hasJiraLink' property of the card is true then forward the user to the jira page
    boardData.lanes.forEach(lane => {
        if(lane.id === laneId) {
          lane.cards.forEach(card => {
            if(card.id === cardId) {
              if (card.hasJiraLink) {
                window.open('https://pm.tdintern.de/jira/browse/' + card.title);
              }
            }
          })
        }
    })
  };

  useEffect(() => {
    socket = io.connect(socketEndpoint);

    socket.on("load initial data", data => {
      setBoardData({ 
        lanes: data.lanes 
      });
    });
    
    socket.on("new card", newTicket => {
      eventBus.publish({
        type: "ADD_CARD",
        laneId: newTicket.laneId,
        card: newTicket
      });
    });
    
    socket.on("card deleted", ticketToDelete => {
      if(!ticketToDelete.hasOwnProperty('cardId')) {
        ticketToDelete.cardId = ticketToDelete.id;
      }
      eventBus.publish({
        type: "REMOVE_CARD",
        laneId: ticketToDelete.laneId,
        cardId: ticketToDelete.cardId
      });
    });
    
    socket.on("card moved", ticketToUpdate => {
      eventBus.publish({
        type: "MOVE_CARD",
        fromLaneId: ticketToUpdate.fromLaneId,
        toLaneId: ticketToUpdate.toLaneId,
        cardId: ticketToUpdate.cardId,
        index: 0
      });
    });
  }, []);

  return (
    <React.Fragment>
      <FunctionBar socket={socket}></FunctionBar>
      <KanbanBoard
        data={boardData}
        laneSortFunction={sortFunction}
        eventBusHandle={setEventBus}
        onCardAdd={(card, laneId) => addCard(card, laneId)}
        onCardDelete={(cardId, laneId) => deleteCard(cardId, laneId)}
        onCardMoveAcrossLanes={(fromLaneId, toLaneId, cardId, index) =>
          cardMoveAcrossLanes(fromLaneId, toLaneId, cardId, index)
        }
        onCardClick={(cardId, metadata, laneId) =>
          handleCardClick(cardId, metadata, laneId)
        }
        editable={true}
      ></KanbanBoard>
    </React.Fragment>
  );
}
