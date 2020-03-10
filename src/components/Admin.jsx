import React, {useState, useEffect} from 'react';
import io from "socket.io-client";
import DataGrid, {
  Column,
  Editing,
  FormItem,
  Paging,
  SearchPanel,
} from 'devextreme-react/data-grid';
import {useHistory} from "react-router-dom";
import Button from '@material-ui/core/Button';
import 'devextreme-react/text-area';
import '../styles/FunctionBar.css';

let socketEndpoint;

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    socketEndpoint = "http://" + window.location.hostname + ":8002"
} else {
    socketEndpoint = "https://" + window.location.hostname;
}

let socket;

export default function Admin() {
    const [data, setData] = useState([{
        title: 'loading...',
        description: 'loading...',
        sprintEndDate: null
    }]);

    const history = useHistory();

    const onRowUpdated = (e) => {
        let newCardData = e.data;
        socket.emit('edit card', newCardData);
    }

    useEffect(() => {
      socket = io.connect(socketEndpoint);
      socket.on('load all tickets', (tickets) => {
        setData(tickets);
      })
    }, []);


    const handleBoardClick = () => {
      history.push('/');
    }

    return (
      <div>
        <div className="container">
        <Button variant="contained"  onClick={handleBoardClick}>Board</Button>
        </div>
        <DataGrid
          dataSource={data}
          allowColumnReordering={true}
          showBorders={true}
          onRowUpdated={onRowUpdated}
        >
          <SearchPanel visible={true} />
          <Paging defaultPageSize={20} />
          <Editing
            mode="form"
            allowUpdating={true} />
          <Column dataField="title" dataType="string" />
          <Column dataField="description">
            <FormItem colSpan={2} editorType="dxTextArea" editorOptions={{ height: 100 }} />
          </Column>
        </DataGrid>
      </div>
    );
}
