import React, {useState, useEffect} from 'react';
import io from "socket.io-client";
import DataGrid, {
  Column,
  Grouping,
  GroupPanel,
  Paging,
  SearchPanel,
  GroupItem,
  Summary
} from 'devextreme-react/data-grid';
import {useHistory} from "react-router-dom";
import Button from '@material-ui/core/Button';
import '../styles/FunctionBar.css';

let socketEndpoint;

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    socketEndpoint = "http://" + window.location.hostname + ":8002"
} else {
    socketEndpoint = "https://" + window.location.hostname;
}

let socket;

export default function Archiv() {
    const [data, setData] = useState([{
        title: 'loading...',
        description: 'loading...',
        sprintEndDate: null
    }]);

    const history = useHistory();

    useEffect(() => {
      socket = io.connect(socketEndpoint);
      socket.on('load archiv', (tickets) => {
        setData(tickets);
      })
    }, []);


    const handleBoardClick = () => {
      history.push('/');
    }

    return (
      <div>
        <div className="topButtons">
        <Button variant="contained"  onClick={handleBoardClick}>Board</Button>
        </div>
        <DataGrid
          dataSource={data}
          allowColumnReordering={true}
          showBorders={true}
        >
          <GroupPanel visible={true} />
          <SearchPanel visible={true} />
          <Grouping />
          <Paging defaultPageSize={20} />
          <Column dataField="title" dataType="string" />
          <Column dataField="ticketType" dataType="string" />
          <Column dataField="description" dataType="string" />
          <Column dataField="sprintEndDate" dataType="string" groupIndex={0}/>
          <Summary>
              <GroupItem
              column="ticketType"
              summaryType="count"
              name="FE"
              displayFormat={'Total Tickets done: {0}'} 
              showInGroupFooter={true} />
              />
          </Summary>
        </DataGrid>
      </div>
    );
}
