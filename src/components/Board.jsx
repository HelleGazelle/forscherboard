import React from "react";
import { useEffect, useState } from "react";
import KanbanBoard from "react-trello";
import io from "socket.io-client";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

const socket = io.connect(process.env.REACT_APP_NETWORK_IP);

let eventBus = undefined;

const setEventBus = handle => {
  eventBus = handle;
};

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
    cardId: ticketToDelete.cardId
  });
});

socket.on("card updated", ticketToUpdate => {
  eventBus.publish({
    type: "MOVE_CARD",
    fromLaneId: ticketToUpdate.fromLaneId,
    toLaneId: ticketToUpdate.toLaneId,
    cardId: ticketToUpdate.cardId,
    index: 0
  });
});

export default function Board() {
  // time tracking dialog options
  const [open, setOpen] = useState(false);
  let [timeToTrack, setTimeToTrack] = useState(undefined);
  let [selectedCard, setSelectedCard] = useState(null);

  const handleClose = () => {
    setOpen(false);
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
    socket.emit("update lane", {
      fromLaneId: fromLaneId,
      toLaneId: toLaneId,
      cardId: cardId,
      index: index
    });
  };

  // handle card click
  const handleCardClick = (cardId, metadata, laneId) => {
    setSelectedCard({ cardId: cardId, laneId: laneId });
    setOpen(true);
  };

  const handleTimeChange = event => {
    setTimeToTrack(event.target.value);
  };

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
    socket.on("load initial data", data => {
      setBoardData({ lanes: data.lanes });
    });
  }, []);

  return (
    <React.Fragment>
      <KanbanBoard
        data={boardData}
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
