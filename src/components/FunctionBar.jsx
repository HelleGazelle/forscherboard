import React from 'react';
import Button from '@material-ui/core/Button';
import '../styles/FunctionBar.css';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function FunctionBar(props) {
    const [open, setOpen] = React.useState(false);

    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };

    const handleFinishSprint = () => {
        props.socket.emit('test', 'test');
    }

    return(
        <div className="topButtons">
            <Button variant="contained" color="primary" onClick={handleClickOpen}>Finish Sprint</Button>
            <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle>{"Confirm"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">All your cards in done status will be removed. Do you want to continue?</DialogContentText>
                </DialogContent>
                <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleFinishSprint} color="primary" autoFocus>
                    Finish Sprint
                </Button>
                </DialogActions>
            </Dialog>
            <Button>Archiv</Button>
        </div>
    )
}