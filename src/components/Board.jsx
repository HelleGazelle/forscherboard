import React from "react";
import { useEffect, useState } from "react";
import KanbanBoard from "react-trello";
import FunctionBar from '../components/FunctionBar';
import Alerts from '../components/Alerts';
import socket from '../components/Socket';

function notify(title) {
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have alredy been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    new Notification("New Ticket: " + title);
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission(function (permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        new Notification("New Ticket: " + title);
      }
    });
  }

  // At last, if the user has denied notifications, and you 
  // want to be respectful there is no need to bother them any more.
}

export default function Board() {
  // snackbar
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  // event bus
  const [eventBus, setEventBus] = useState();

  const [boardData, setBoardData] = useState({
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

  socket.on("load initial data", data => {
    setBoardData({ 
      lanes: data.lanes 
    });
  });
  socket.on("new card", newTicket => {
    // send browser notification
    notify(newTicket.title);

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
      cardId: ticketToUpdate.cardId
    });
  });

  socket.on('ticket already exists', ticketTitle => {
    setOpen(true);
    setMessage(ticketTitle + " already exists");
  }); 

  return (
    <React.Fragment>
      <Alerts open={open} message={message}></Alerts>
      <FunctionBar socket={socket}></FunctionBar>
      <KanbanBoard
        style={{height: "100%"}}
        data={boardData}
        eventBusHandle={setEventBus}
        onCardAdd={(card, laneId) => addCard(card, laneId)}
        onCardDelete={(cardId, laneId) => deleteCard(cardId, laneId)}
        onCardMoveAcrossLanes={(fromLaneId, toLaneId, cardId, index) => cardMoveAcrossLanes(fromLaneId, toLaneId, cardId, index)}
        onCardClick={(cardId, metadata, laneId) => handleCardClick(cardId, metadata, laneId)}
        editable={true}>
      </KanbanBoard>
    </React.Fragment>
  );
}
