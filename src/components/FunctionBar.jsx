import React from 'react';
import Button from '@material-ui/core/Button';
import '../styles/FunctionBar.css';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {useHistory} from "react-router-dom";
import TextField from '@material-ui/core/TextField';
import Icon from '@material-ui/core/Icon';
import InputAdornment from '@material-ui/core/InputAdornment';

export default function FunctionBar(props) {
    const [open, setOpen] = React.useState(false);

    const history = useHistory();

    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };

    const handleFinishSprint = () => {
        props.socket.emit('finish sprint');
        handleClose();
    }

    const handleArchivClick = () => {
        history.push('/archiv');
    }

    if(history.location.pathname === '/') {
        return(
            <div className="topButtons">
                <Icon>search</Icon>
                <TextField placeholder="title, description, owner" onChange={props.handleSearchBoxChange}></TextField>

                {/* <Button variant="contained" color="primary" onClick={handleClickOpen}>Finish Sprint</Button>
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
                <Button onClick={handleArchivClick}>Archiv</Button> */}
        </div>
        );
    }
    return (
        <div>
        <Button variant="contained" color="primary" onClick={handleClickOpen}>Finish Sprint</Button>
        </div>
    )
}