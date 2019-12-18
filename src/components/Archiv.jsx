import React, {useState, useEffect} from 'react';
import io from "socket.io-client";
import DataGrid, {
  Column,
  Grouping,
  GroupPanel,
  Paging,
  SearchPanel,
  Editing
} from 'devextreme-react/data-grid';

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

    useEffect(() => {
      socket = io.connect(socketEndpoint);
      socket.on('load archiv', (tickets) => {
        setData(tickets);
      })
    }, []);

    return (
      <div>
        <DataGrid
          dataSource={data}
          allowColumnReordering={true}
          showBorders={true}
        >
          <Editing 
          mode="row"
          allowUpdating={true}
          allowDeleting={true}
          allowAdding={true}
          />
          <GroupPanel visible={true} />
          <SearchPanel visible={true} />
          <Grouping />
          <Paging defaultPageSize={10} />
          <Column dataField="title" dataType="string" />
          <Column dataField="description" dataType="string" />
          <Column dataField="sprintEndDate" dataType="string" groupIndex={0}/>
        </DataGrid>
      </div>
    );
}
