import React, {useState, useEffect} from 'react';
import Snackbar from '@material-ui/core/Snackbar';

export default function Alerts(props) {
    const [open, setOpen] = useState(false);
    
    const handleClose = (event, reason) => {
        setOpen(false);
    };

    useEffect(() => {
      console.log();
      setOpen(props.open);
    }, [props.open, props.message]);

    return(
        <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        open={open}
        onClose={handleClose}
        autoHideDuration={5000}
        message={props.message}
      />
    );
}