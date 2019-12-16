import React from "react";
import { useEffect, useState } from "react";
import KanbanBoard from "react-trello";
import FunctionBar from '../components/FunctionBar';
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
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
  // time tracking dialog options
  const [open, setOpen] = useState(false);
  let [timeToTrack, setTimeToTrack] = useState(undefined);
  let [selectedCard, setSelectedCard] = useState(null);
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
    ],
    originalLanes: [
      {
        id: "loading...",
        title: "loading...",
        cards: []
      }
    ]
  });

  const handleClose = () => {
    setOpen(false);
  };

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
    socket.emit("update lane", {
      fromLaneId: fromLaneId,
      toLaneId: toLaneId,
      cardId: cardId,
      index: index
    });
  };

  const dataChange = (newData) => {
    console.log(newData);
  }

  // handle card click
  const handleCardClick = (cardId, metadata, laneId) => {
    setSelectedCard({ cardId: cardId, laneId: laneId });
    setOpen(true);
  };

  const handleTimeChange = event => {
    setTimeToTrack(event.target.value);
  };

  const handleSearchBoxChange = event => {
    let filter = event.target.value;
    boardData.lanes.map(lane => {
      lane.cards.map(card => {
          // let newStyle = card.style = Object.assign({}, card.style, {display: 'none'});
          card.title = 'test';
          // card.style = newStyle;
          return card;
      })
      console.log(lane.cards);
      eventBus.publish({ type: "UPDATE_CARDS", laneId: lane.laneId, cards: lane.cards });
      return lane;
    })

    
    // console.log(boardData);
    
    // let lanes = JSON.parse(JSON.stringify(boardData.originalLanes));
    // lanes = lanes.map(lane => {
    //   let cards = lane.cards;
    //   cards = cards.filter((card) => {
    //     if(card.title.includes(filter)) {
    //       return true;
    //     }
    //     return false;
    //   })
    //   lane.cards = cards;
    //   return lane;
    // })
  }

  const saveTimeToTicket = () => {
    // delete card first to get updated one with bus
    eventBus.publish({
      type: "REMOVE_CARD",
      laneId: selectedCard.laneId,
      cardId: selectedCard.cardId
    });
    socket.emit("track time", {
      cardId: selectedCard.cardId,
      time: timeToTrack
    });
    handleClose();
  };

  useEffect(() => {
    socket = io.connect(socketEndpoint);

    socket.on("load initial data", data => {
      setBoardData({ 
        lanes: data.lanes,
        originalLanes: data.lanes 
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
      eventBus.publish({
        type: "REMOVE_CARD",
        laneId: ticketToDelete.laneId,
        cardId: ticketToDelete.id
      });
    });
    
    socket.on("card updated", ticketToUpdate => {
      eventBus.publish({
        type: "MOVE_CARD",
        fromLaneId: ticketToUpdate.fromLaneId,
        toLaneId: ticketToUpdate.toLaneId,
        id: ticketToUpdate.id,
        index: 0
      });
    });
  }, []);

  return (
    <React.Fragment>
      <FunctionBar socket={socket} handleSearchBoxChange={handleSearchBoxChange}></FunctionBar>
      <KanbanBoard
        data={boardData}
        laneSortFunction={sortFunction}
        eventBusHandle={setEventBus}
        onDataChange={(newData) => dataChange(newData)}
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
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="track-time-dialog">Track Time</DialogTitle>
        <DialogContent>
          <DialogContentText>Track Time for this ticket.</DialogContentText>
          <TextField
            autoFocus
            id="time"
            label="time"
            type="number"
            fullWidth
            onChange={handleTimeChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={saveTimeToTicket} color="primary">
            Track
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}
