import React, {useState, useEffect} from 'react';
import io from "socket.io-client";

import DataGrid, {
  Column,
  Grouping,
  GroupPanel,
  Paging,
  SearchPanel,
} from 'devextreme-react/data-grid';

let socketEndpoint;

const socket = io.connect(socketEndpoint);

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    socketEndpoint = "http://" + window.location.hostname + ":8002"
} else {
    socketEndpoint = "https://" + window.location.hostname;
}


export default function Archiv() {
    const [data, setData] = useState([{
        id: 'loading...',
        title: 'loading...',
        description: 'loading...',
        metadata: 'loading...',
        laneId: 'loading...',
        style: {},
        label: 0,
        tags: {}
    }]);

    useEffect(() => {
        socket.on('get archiv tickets', (tickets) => {
          console.log(tickets);  
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
          <GroupPanel visible={true} />
          <SearchPanel visible={true} />
          <Grouping />
          <Paging defaultPageSize={10} />

          <Column dataField="title" dataType="string" />
          <Column dataField="description" dataType="string" />
          <Column dataField="laneId" dataType="string" groupIndex={0}/>
        </DataGrid>
      </div>
    );
}
